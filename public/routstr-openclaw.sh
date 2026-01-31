#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CDK_CLI_DIR="$SCRIPT_DIR/temp-routstr"
CDK_CLI_BIN="$CDK_CLI_DIR/cdk-cli-v0.13.0"
CDK_CLI_URL="https://github.com/cashubtc/cdk/releases/download/v0.13.0/cdk-cli-v0.13.0"
MINT_URL="https://mint.cubabitcoin.org/"

# Parse command line arguments
CASHU_TOKEN=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --cashu)
            CASHU_TOKEN="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--cashu <token>]"
            exit 1
            ;;
    esac
done

# If no cashu token provided, run install script and exit
if [ -z "$CASHU_TOKEN" ]; then
    echo "Running OpenClaw install script..."
    curl -fsSL https://openclaw.bot/install.sh | bash -s -- --no-onboard
    exit 0
fi

# Function to setup cdk-cli and dependencies
setup_cdk_cli() {
    mkdir -p "$CDK_CLI_DIR"
    
    if [ ! -f "$CDK_CLI_BIN" ]; then
        echo "=== Downloading cdk-cli ==="
        curl -LsSf "$CDK_CLI_URL" -o "$CDK_CLI_BIN"
        chmod +x "$CDK_CLI_BIN"
    fi
    
    # Ensure uv is available for QR code display
    if ! command -v uv &> /dev/null; then
        echo "=== Installing uv package manager ==="
        curl -LsSf https://astral.sh/uv/install.sh | sh
        export PATH="$HOME/.local/bin:$PATH"
    fi
    
    # Initialize project if needed
    if [ ! -f "$CDK_CLI_DIR/pyproject.toml" ]; then
        echo "=== Initializing Python project ==="
        cd "$CDK_CLI_DIR"
        uv init . 2>/dev/null || true
    fi
    
    # Add qrcode if not already added
    cd "$CDK_CLI_DIR"
    if ! grep -q "qrcode" pyproject.toml 2>/dev/null; then
        echo "=== Adding qrcode package ==="
        uv add qrcode
    fi
    
    cd "$SCRIPT_DIR"
}

# Function to display QR code
display_qr_code() {
    local invoice="$1"
    cd "$CDK_CLI_DIR"
    uv run python3 -c "
import qrcode

invoice = '''$invoice'''

qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_L,
    box_size=1,
    border=1,
)
qr.add_data(invoice)
qr.make(fit=True)

# Print QR code using Unicode half-blocks to reduce height
matrix = qr.get_matrix()
height = len(matrix)
width = len(matrix[0]) if height else 0
for y in range(0, height, 2):
    line = ''
    for x in range(width):
        top = matrix[y][x]
        bottom = matrix[y + 1][x] if y + 1 < height else False
        if top and bottom:
            line += '\u2588'
        elif top and not bottom:
            line += '\u2580'
        elif not top and bottom:
            line += '\u2584'
        else:
            line += ' '
    print(line)
"
    cd "$SCRIPT_DIR"
}

# Function to create cashu token via lightning invoice
create_cashu_token() {
    local amount="$1"
    
    echo ""
    echo "=== Creating Lightning Invoice for $amount sats ==="
    echo "Mint: $MINT_URL"
    echo ""
    
    # Create mint quote and capture output
    OUTPUT=$(timeout 5 "$CDK_CLI_BIN" mint "$MINT_URL" "$amount" 2>&1) || true
    
    # Extract quote ID and invoice
    QUOTE_ID=$(echo "$OUTPUT" | grep -oP 'id: "\K[^"]+' || echo "")
    INVOICE=$(echo "$OUTPUT" | grep -oP 'Please pay: \K\S+' || echo "")
    
    if [ -z "$INVOICE" ]; then
        INVOICE=$(echo "$OUTPUT" | grep -oP 'request: "\K[^"]+' || echo "")
    fi
    
    if [ -z "$INVOICE" ] || [ -z "$QUOTE_ID" ]; then
        echo "Error: Could not create lightning invoice"
        echo "Raw output: $OUTPUT"
        exit 1
    fi
    
    echo "=========================================="
    echo "Quote ID: $QUOTE_ID"
    echo "=========================================="
    echo "Lightning Invoice:"
    echo "$INVOICE"
    echo "=========================================="
    echo ""
    echo "Scan to pay:"
    echo ""
    
    display_qr_code "$INVOICE"
    
    echo ""
    echo "=========================================="
    echo "Waiting for payment..."
    echo "Press Enter once you have paid the invoice"
    echo "=========================================="
    read -r
    
    # Check payment status and retrieve token
    echo "=== Checking payment status ==="
    
    # Poll for payment completion
    MAX_ATTEMPTS=30
    ATTEMPT=0
    PAID=false
    
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        QUOTE_STATUS=$("$CDK_CLI_BIN" mint "$MINT_URL" -q "$QUOTE_ID" 2>&1) || true
        
        if echo "$QUOTE_STATUS" | grep -q "Received $amount sats"; then
            PAID=true
            break
        fi
        
        ((ATTEMPT++))
        echo "Checking payment status... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
        sleep 2
    done
    
    if [ "$PAID" = false ]; then
        echo ""
        echo "Payment not detected yet. Would you like to:"
        echo "1) Continue waiting"
        echo "2) Exit and try again later"
        read -p "Choice [1/2]: " choice
        
        if [ "$choice" = "1" ]; then
            # Continue polling
            while true; do
                QUOTE_STATUS=$("$CDK_CLI_BIN" mint "$MINT_URL" -q "$QUOTE_ID" 2>&1) || true
                if echo "$QUOTE_STATUS" | grep -q "Received $amount sats"; then
                    PAID=true
                    break
                fi
                echo "Still waiting for payment..."
                sleep 5
            done
        else
            echo "Exiting. You can run this script again with the same quote ID."
            exit 1
        fi
    fi
    
    echo ""
    echo "=== Payment received! Creating cashu token ==="
    
    # Use cdk-cli send to create a cashu token from the balance
    TOKEN_OUTPUT=$(printf "%s\n\n" "$amount" | "$CDK_CLI_BIN" send --mint-url "$MINT_URL" 2>&1) || true
    
    # Extract the cashu token from output
    CASHU_TOKEN=$(echo "$TOKEN_OUTPUT" | grep -oP 'cashuA[^\s]+' | head -1 || echo "")
    
    if [ -z "$CASHU_TOKEN" ]; then
        # Try alternative extraction
        CASHU_TOKEN=$(echo "$TOKEN_OUTPUT" | grep -E '^cashu' | head -1 || echo "")
    fi
    
    if [ -z "$CASHU_TOKEN" ]; then
        echo "Error: Could not extract cashu token from output"
        echo "Raw output: $TOKEN_OUTPUT"
        echo ""
        echo "You may need to manually extract the token using:"
        echo "  $CDK_CLI_BIN send --mint-url $MINT_URL"
        exit 1
    fi
    
    echo ""
    echo "=========================================="
    echo "Cashu Token Created Successfully!"
    echo "=========================================="
    echo "$CASHU_TOKEN"
    echo "=========================================="
}

# If no cashu token provided, offer to create one
if [ -z "$CASHU_TOKEN" ]; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║           OpenClaw Setup - Cashu Token Required            ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║  No cashu token provided. You can:                         ║"
    echo "║                                                            ║"
    echo "║  1) Create a new token by paying a Lightning invoice       ║"
    echo "║  2) Exit and provide a token manually with --cashu <token> ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    read -p "Would you like to create a cashu token now? [Y/n]: " CREATE_TOKEN
    
    if [[ "$CREATE_TOKEN" =~ ^[Nn] ]]; then
        echo ""
        echo "Usage: $0 --cashu <token>"
        echo ""
        echo "You can obtain a cashu token from https://cashu.me/"
        echo "or run this script without arguments to create one interactively."
        exit 0
    fi
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              Select Amount to Fund Your Wallet             ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║  1) 4200 sats  (Recommended - good for extended use)       ║"
    echo "║  2) 2100 sats  (Standard)                                  ║"
    echo "║  3) 1000 sats  (Minimum)                                   ║"
    echo "║  4) Custom amount                                          ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    read -p "Select option [1-4] (default: 1): " AMOUNT_CHOICE
    
    case "$AMOUNT_CHOICE" in
        2)
            AMOUNT=2100
            ;;
        3)
            AMOUNT=1000
            ;;
        4)
            read -p "Enter custom amount in sats: " AMOUNT
            if ! [[ "$AMOUNT" =~ ^[0-9]+$ ]] || [ "$AMOUNT" -lt 100 ]; then
                echo "Error: Invalid amount. Please enter a number >= 100"
                exit 1
            fi
            ;;
        *)
            AMOUNT=4200
            ;;
    esac
    
    echo ""
    echo "Setting up cdk-cli for token creation..."
    setup_cdk_cli
    
    create_cashu_token "$AMOUNT"
    
    echo ""
    echo "Continuing with OpenClaw setup using the new token..."
    echo ""
fi

# Download the tar.gz file from GitHub (raw content URL)
curl -L -o routstr-kit-openclaw.tar.gz "https://github.com/Routstr/agents-w-routstr/raw/main/routstr-kit-openclaw.tar.gz"

# Extract the tar.gz file
tar -xzvf routstr-kit-openclaw.tar.gz

# Insert the cashu token into openclaw.json apiKey field
# Using jq to safely update the JSON
if command -v jq &> /dev/null; then
    jq --arg token "$CASHU_TOKEN" '.models.providers.routstr.apiKey = $token' openclaw.json > openclaw.json.tmp && mv openclaw.json.tmp openclaw.json
else
    # Fallback using sed if jq is not available
    sed -i "s/\"apiKey\": \"\"/\"apiKey\": \"$CASHU_TOKEN\"/" openclaw.json
fi

# Create target directories if they don't exist
mkdir -p ~/.openclaw
mkdir -p ~/.npm-global/lib/node_modules/openclaw/skills

# Move or merge openclaw.json to ~/.openclaw/
if [ -f ~/.openclaw/openclaw.json ]; then
    echo "Existing openclaw.json found, merging routstr configuration..."
    
    if command -v jq &> /dev/null; then
        # Create a temporary merged file
        EXISTING_CONFIG=~/.openclaw/openclaw.json
        NEW_CONFIG=openclaw.json
        
        # Merge the routstr provider into existing config
        jq --slurpfile new "$NEW_CONFIG" '
            # Add routstr provider to models.providers
            .models.providers.routstr = $new[0].models.providers.routstr |
            
            # Add/merge agents.defaults.models from the new config
            .agents.defaults.models = (.agents.defaults.models // {}) + $new[0].agents.defaults.models |
            
            # Update agents.defaults.model if not set or to add routstr fallbacks
            .agents.defaults.model = (
                if .agents.defaults.model == null then
                    $new[0].agents.defaults.model
                else
                    .agents.defaults.model
                end
            ) |
            
            # Handle auth profiles - remove any existing :default and add routstr:default
            .auth.profiles = (
                (.auth.profiles // {}) |
                to_entries |
                map(select(.key | endswith(":default") | not)) |
                from_entries
            ) + {"routstr:default": $new[0].auth.profiles["routstr:default"]}
        ' "$EXISTING_CONFIG" > ~/.openclaw/openclaw.json.tmp && \
        mv ~/.openclaw/openclaw.json.tmp ~/.openclaw/openclaw.json
        
        echo "Merged routstr provider and agent models into existing config"
        rm openclaw.json
    else
        echo "Warning: jq not available, cannot merge configs. Backing up and replacing..."
        mv ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup
        mv openclaw.json ~/.openclaw/
    fi
else
    # No existing config, just move the new one
    mv openclaw.json ~/.openclaw/
fi

# Move contents of skills folder to the target location
mv skills/* ~/.npm-global/lib/node_modules/openclaw/skills/

# Move AGENTS.md to workspace directory
mkdir -p ~/.openclaw/workspace
mv AGENTS.md ~/.openclaw/workspace/

# Clean up
rm -rf skills
rm routstr-kit-openclaw.tar.gz

echo "Copied skills and config files!"

echo "Configuring OpenClaw with onboard command!"
~/.npm-global/bin/openclaw onboard --non-interactive \
        --accept-risk \
        --mode local \
        --gateway-port 18789 \
        --gateway-bind loopback \
        --install-daemon \
        --daemon-runtime node \
        --skip-skills

echo "Setup complete!"