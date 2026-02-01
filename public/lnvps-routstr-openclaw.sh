#!/bin/bash

set -e

# LNVPS CLI Deployment Script
# Requires: nak, jq, curl

API_BASE="https://api.lnvps.net/api/v1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CDK_CLI_DIR="$SCRIPT_DIR/temp-routstr"
CDK_CLI_BIN="$CDK_CLI_DIR/cdk-cli-v0.13.0"
CDK_CLI_URL="https://github.com/cashubtc/cdk/releases/download/v0.13.0/cdk-cli-v0.13.0"
MINT_URL="https://mint.cubabitcoin.org"

echo "=== LNVPS VPS Deployment Script ==="
echo ""

# Detect operating system
case "$(uname -s)" in
    Linux*)     OS_TYPE="linux";;
    Darwin*)    OS_TYPE="mac";;
    CYGWIN*|MINGW*|MSYS*|Windows_NT*)
        echo "Error: Windows is not supported"
        exit 1
        ;;
    *)
        echo "Error: Unknown operating system: $(uname -s)"
        exit 1
        ;;
esac

echo "Detected OS: $OS_TYPE"
echo ""

# Function to install jq
install_jq() {
    if ! command -v jq >/dev/null 2>&1; then
        echo "jq not found. Attempting to install..."
        if [ "$OS_TYPE" = "mac" ]; then
            if command -v brew >/dev/null 2>&1; then
                brew install jq
            else
                echo "Error: Homebrew is required to install jq on macOS."
                echo "Please install Homebrew or install jq manually."
                exit 1
            fi
        elif [ "$OS_TYPE" = "linux" ]; then
            if command -v apt-get >/dev/null 2>&1; then
                SUDO=""
                [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1 && SUDO="sudo"
                $SUDO apt-get update && $SUDO apt-get install -y jq
            elif command -v yum >/dev/null 2>&1; then
                SUDO=""
                [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1 && SUDO="sudo"
                $SUDO yum install -y jq
            elif command -v apk >/dev/null 2>&1; then
                SUDO=""
                [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1 && SUDO="sudo"
                $SUDO apk add jq
            elif command -v pacman >/dev/null 2>&1; then
                SUDO=""
                [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1 && SUDO="sudo"
                $SUDO pacman -S --noconfirm jq
            else
                echo "Error: Could not detect package manager to install jq."
                echo "Please install jq manually."
                exit 1
            fi
        else
            echo "Error: Unsupported OS for automatic installation."
            echo "Please install jq manually."
            exit 1
        fi
        
        # Verify installation
        if ! command -v jq >/dev/null 2>&1; then
            echo "Error: Failed to install jq."
            exit 1
        fi
        echo "jq installed successfully."
    fi
}

# Check dependencies
command -v nak >/dev/null 2>&1 || { curl -sSL https://raw.githubusercontent.com/fiatjaf/nak/master/install.sh | sh; }
install_jq
command -v curl >/dev/null 2>&1 || { echo "Error: curl is required"; exit 1; }

# Setup temp-routstr, cdk-cli, and uv/qrcode
mkdir -p "$CDK_CLI_DIR"
if [ "$OS_TYPE" != "mac" ] && [ ! -f "$CDK_CLI_BIN" ]; then
    echo "=== Downloading cdk-cli ==="
    curl -LsSf "$CDK_CLI_URL" -o "$CDK_CLI_BIN"
    chmod +x "$CDK_CLI_BIN"
fi

if ! command -v uv >/dev/null 2>&1; then
    echo "=== Installing uv package manager ==="
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
fi

if [ ! -f "$CDK_CLI_DIR/pyproject.toml" ]; then
    echo "=== Initializing Python project ==="
    cd "$CDK_CLI_DIR"
    uv init . 2>/dev/null || true
fi

cd "$CDK_CLI_DIR"
if ! grep -q "qrcode" pyproject.toml 2>/dev/null; then
    echo "=== Adding qrcode package ==="
    uv add qrcode
fi

cd "$SCRIPT_DIR"

# Nostr config file path (in current directory)
NOSTR_CONFIG_FILE="./nostr.config.json"

# Function to save nostr config
save_nostr_config() {
    local hex_key="$1"
    local nsec_key="$2"
    local pubkey_hex="$3"
    local npub="$4"
    
    cat > "$NOSTR_CONFIG_FILE" << EOF
{
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "private_key": {
    "hex": "$hex_key",
    "nsec": "$nsec_key"
  },
  "public_key": {
    "hex": "$pubkey_hex",
    "npub": "$npub"
  }
}
EOF
    echo "Nostr config saved to $NOSTR_CONFIG_FILE"
}

# Function to print QR code for invoices
print_qr_code() {
    local invoice="$1"
    ./temp-routstr/.venv/bin/python -c "
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
}

# Check for existing nostr.config.json file
NSEC=""
HEX_KEY=""
if [ -f "$NOSTR_CONFIG_FILE" ]; then
    echo "Found existing nostr.config.json file..."
    
    # Try to read private key from config
    CONFIG_HEX=$(jq -r '.private_key.hex // empty' "$NOSTR_CONFIG_FILE" 2>/dev/null)
    CONFIG_NSEC=$(jq -r '.private_key.nsec // empty' "$NOSTR_CONFIG_FILE" 2>/dev/null)
    
    if [ -n "$CONFIG_HEX" ] && [ "$CONFIG_HEX" != "null" ]; then
        echo "Using private key from nostr.config.json"
        HEX_KEY="$CONFIG_HEX"
        NSEC="$CONFIG_HEX"
        
        # Verify the key is valid
        PUBKEY_HEX=$(nak key public "$HEX_KEY" 2>/dev/null)
        if [ -z "$PUBKEY_HEX" ]; then
            echo "Warning: Private key in config is invalid. Will prompt for new key."
            HEX_KEY=""
            NSEC=""
        fi
    fi
fi

# If no valid key from config, prompt user
if [ -z "$HEX_KEY" ]; then
    echo "Enter your Nostr private key (nsec or hex), or press enter to generate one: "
    
    # Disable terminal echo
    stty -echo
    while IFS= read -r -n1 char; do
        if [[ "$char" == "" ]]; then
            break
        elif [[ "$char" == $'\x7f' ]] || [[ "$char" == $'\b' ]]; then
            if [[ -n "$NSEC" ]]; then
                NSEC="${NSEC%?}"
                echo -ne "\b \b"
            fi
        else
            NSEC+="$char"
            echo -n "•"
        fi
    done
    # Re-enable terminal echo
    stty echo
    echo ""
    
    if [ -z "$NSEC" ]; then
        echo "No key entered. Generating a new Nostr private key..."
        NSEC=$(nak key generate 2>/dev/null || true)
        if [ -z "$NSEC" ]; then
            echo "Error: Failed to generate a private key"
            exit 1
        fi
    
        echo "Generated new private key. It is stored in nostr.config.json."
    fi
    
    # Handle both nsec (bech32) and hex private key formats
    if [[ "$NSEC" == nsec1* ]]; then
        # Decode nsec to hex for nak key public
        HEX_KEY=$(nak decode "$NSEC" 2>/dev/null)
        if [ -z "$HEX_KEY" ]; then
            echo "Error: Invalid nsec"
            exit 1
        fi
    else
        # Assume hex format
        HEX_KEY="$NSEC"
    fi
fi

# Get public key (hex) from private key
PUBKEY_HEX=$(nak key public "$HEX_KEY" 2>/dev/null)
if [ -z "$PUBKEY_HEX" ]; then
    echo "Error: Invalid private key"
    exit 1
fi

# Encode public key to npub for display
NPUB=$(nak encode npub "$PUBKEY_HEX" 2>/dev/null)
if [ -z "$NPUB" ]; then
    echo "Error: Failed to encode public key"
    exit 1
fi

# Encode private key to nsec for storage
NSEC_ENCODED=$(nak encode nsec "$HEX_KEY" 2>/dev/null || echo "")

# Save to config file if it doesn't exist or was invalid
if [ ! -f "$NOSTR_CONFIG_FILE" ] || [ -z "$(jq -r '.private_key.hex // empty' "$NOSTR_CONFIG_FILE" 2>/dev/null)" ]; then
    save_nostr_config "$HEX_KEY" "$NSEC_ENCODED" "$PUBKEY_HEX" "$NPUB"
fi

echo "Authenticated as: $NPUB"
echo ""

# Function to create NIP-98 auth event
# Usage: nip98_auth <method> <url> [payload]
nip98_auth() {
    local method="$1"
    local url="$2"
    local payload="${3:-}"
    
    local signed_event
    
    # If there's a payload, include payload hash tag
    if [ -n "$payload" ]; then
        local payload_hash=$(echo -n "$payload" | sha256sum | cut -d' ' -f1)
        signed_event=$(nak event -k 27235 -c "" \
            -t "u=$url" \
            -t "method=$method" \
            -t "payload=$payload_hash" \
            --sec "$NSEC" 2>/dev/null)
    else
        signed_event=$(nak event -k 27235 -c "" \
            -t "u=$url" \
            -t "method=$method" \
            --sec "$NSEC" 2>/dev/null)
    fi
    
    # Encode as base64 for Authorization header (macOS base64 doesn't have -w flag)
    if [ "$OS_TYPE" = "mac" ]; then
        echo "$signed_event" | base64
    else
        echo "$signed_event" | base64 -w 0
    fi
}

# Function to make authenticated API call
api_call() {
    local method="$1"
    local endpoint="$2"
    local payload="${3:-}"
    local url="${API_BASE}${endpoint}"
    
    local auth_token=$(nip98_auth "$method" "$url" "$payload")
    
    if [ -n "$payload" ]; then
        curl -s -X "$method" \
            -H "Authorization: Nostr $auth_token" \
            -H "Content-Type: application/json" \
            -d "$payload" \
            "$url"
    else
        curl -s -X "$method" \
            -H "Authorization: Nostr $auth_token" \
            "$url"
    fi
}

# Function to format timestamp
format_date() {
    local timestamp="$1"
    if [ -n "$timestamp" ] && [ "$timestamp" != "null" ]; then
        if [ "$OS_TYPE" = "mac" ]; then
             date -r "$timestamp" "+%Y-%m-%d %H:%M" 2>/dev/null || echo "$timestamp"
        else
             date -d "@$timestamp" "+%Y-%m-%d %H:%M" 2>/dev/null || echo "$timestamp"
        fi
    else
        echo "N/A"
    fi
}

# Function to calculate days until expiry
days_until() {
    local date_str="$1"
    if [ -n "$date_str" ] && [ "$date_str" != "null" ]; then
        local expiry_ts=""
        if [ "$OS_TYPE" = "mac" ]; then
            # Try to parse ISO format on Mac
            expiry_ts=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${date_str%%.*}" +%s 2>/dev/null)
        else
            expiry_ts=$(date -d "$date_str" +%s 2>/dev/null)
        fi

        if [ -n "$expiry_ts" ]; then
            local now=$(date +%s)
            local diff=$(( (expiry_ts - now) / 86400 ))
            echo "$diff"
        else
            echo "?"
        fi
    else
        echo "?"
    fi
}

SKIP_CREATION=false

# Check for existing VMs
echo "Checking for existing VMs..."
vms_response=$(api_call "GET" "/vm")
vms=$(echo "$vms_response" | jq -r '.data // []')

if [ -n "$vms" ] && [ "$vms" != "[]" ] && [ "$vms" != "null" ]; then
    echo ""
    echo "=== Existing VMs ==="
    echo ""
    
    # Build VM list with indexes
    vm_opt_num=1
    vm_options_ids=()
    
    # Save VM data to temp file to avoid subshell issues
    echo "$vms" | jq -c '.[]' > /tmp/lnvps_vms_$$
    
    while IFS= read -r vm; do
        id=$(echo "$vm" | jq -r '.id')
        status=$(echo "$vm" | jq -r '.status.state // "unknown"')
        ip=$(echo "$vm" | jq -r '.ip_assignments[0].ip // "pending"')
        expires=$(echo "$vm" | jq -r '.expires // null')
        
        expiry_str="N/A"
        if [ -n "$expires" ] && [ "$expires" != "null" ]; then
             days=$(days_until "$expires")
             if [ "$days" != "?" ]; then
                expiry_str="$days days"
             fi
        fi
        
        printf "  [%d] VM %s | %-7s | %-16s | %s\n" "$vm_opt_num" "$id" "$status" "$ip" "$expiry_str"
        vm_options_ids[$vm_opt_num]="$id"
        vm_opt_num=$((vm_opt_num + 1))
    done < /tmp/lnvps_vms_$$
    rm -f /tmp/lnvps_vms_$$
    
    # Add option to create new VM
    echo ""
    echo "  [$vm_opt_num] Create a new VM"
    create_new_option=$vm_opt_num
    
    echo ""
    echo -n "Enter your choice [1-$vm_opt_num] (enter = default 1): "
    read vm_choice
    
    if [ -z "$vm_choice" ]; then
        vm_choice=1
    fi
    
    if [ "$vm_choice" -eq "$create_new_option" ] 2>/dev/null; then
        echo "Creating a new VM..."
    elif [ -n "${vm_options_ids[$vm_choice]}" ]; then
        use_vm_id="${vm_options_ids[$vm_choice]}"
        echo "Fetching details for VM $use_vm_id..."
        vm_details_resp=$(api_call "GET" "/vm/${use_vm_id}")
        vm_data=$(echo "$vm_details_resp" | jq -r '.data // null')
        
        if [ -n "$vm_data" ] && [ "$vm_data" != "null" ]; then
            echo "Selected VM $use_vm_id"
            SKIP_CREATION=true
            vm_id="$use_vm_id"
            
            vm_state=$(echo "$vm_data" | jq -r '.status.state // "unknown"')
            vm_ip=$(echo "$vm_data" | jq -r '.ip_assignments[0].ip // "pending"')
            vm_expires=$(echo "$vm_data" | jq -r '.expires // null')
            vm_days="?"
            if [ -n "$vm_expires" ] && [ "$vm_expires" != "null" ]; then
                vm_days=$(days_until "$vm_expires")
            fi
            
            if [ "$vm_state" = "stopped" ]; then
                 # Check if VM needs payment (stopped + pending IP + 0 days)
                 if [ "$vm_ip" = "pending" ] && [ "$vm_days" = "0" ]; then
                     echo "VM is stopped and requires payment to be activated."
                     echo -n "Do you want to pay for this VM? [Y/n] "
                     read pay_choice
                     if [[ "$pay_choice" =~ ^[Yy] ]] || [ -z "$pay_choice" ]; then
                         echo "Getting payment invoice..."
                         renew_resp=$(api_call "GET" "/vm/${vm_id}/renew")
                         payment=$(echo "$renew_resp" | jq -r '.data // null')
                         
                         if [ -n "$payment" ] && [ "$payment" != "null" ]; then
                             payment_id=$(echo "$payment" | jq -r '.id')
                             invoice=$(echo "$payment" | jq -r '.data.lightning // .invoice')
                             amount=$(echo "$payment" | jq -r '.amount')
                             amount=$((amount / 1000))
                             
                             echo ""
                             echo "Payment Invoice ($amount sats):"
                             echo "$invoice"
                             echo ""
                             print_qr_code "$invoice"
                             
                             echo "Waiting for payment..."
                             while true; do
                                sleep 5
                                chk=$(api_call "GET" "/payment/${payment_id}")
                                paid=$(echo "$chk" | jq -r '.data.is_paid')
                                if [ "$paid" = "true" ]; then
                                    echo "Payment received!"
                                    echo "Waiting for VM to start..."
                                    sleep 5
                                    break
                                fi
                             done
                         else
                             echo "Error: Could not get payment invoice."
                             exit 1
                         fi
                     else
                        echo "Cannot proceed without payment."
                        exit 1
                     fi
                 else
                     echo "VM is stopped."
                     echo -n "Do you want to start this VM? [Y/n] "
                     read start_choice
                     if [[ "$start_choice" =~ ^[Yy] ]] || [ -z "$start_choice" ]; then
                         echo "Starting VM..."
                         start_resp=$(api_call "PATCH" "/vm/${vm_id}/start")
                         echo "VM start command sent."
                         echo "Waiting for VM to start..."
                         sleep 5
                     else
                        echo "Cannot proceed with stopped VM."
                        exit 1
                     fi
                 fi
            elif [ "$vm_state" = "expired" ]; then
                 echo "VM is expired."
                 echo -n "Do you want to renew this VM? [Y/n] "
                 read renew_choice
                 if [[ "$renew_choice" =~ ^[Yy] ]] || [ -z "$renew_choice" ]; then
                     echo "Getting renewal invoice..."
                     renew_resp=$(api_call "GET" "/vm/${vm_id}/renew")
                     payment=$(echo "$renew_resp" | jq -r '.data // null')
                     
                     if [ -n "$payment" ] && [ "$payment" != "null" ]; then
                         payment_id=$(echo "$payment" | jq -r '.id')
                         invoice=$(echo "$payment" | jq -r '.data.lightning // .invoice')
                         amount=$(echo "$payment" | jq -r '.amount')
                         amount=$((amount / 1000))
                         
                         echo ""
                         echo "Renewal Invoice ($amount sats):"
                         echo "$invoice"
                         echo ""
                         print_qr_code "$invoice"
                         
                         echo "Waiting for payment..."
                         while true; do
                            sleep 5
                            chk=$(api_call "GET" "/payment/${payment_id}")
                            paid=$(echo "$chk" | jq -r '.data.is_paid')
                            if [ "$paid" = "true" ]; then
                                echo "Payment received!"
                                break
                            fi
                         done
                     else
                         echo "Error: Could not get renewal invoice."
                         exit 1
                     fi
                 else
                    echo "Cannot proceed with expired VM without renewal."
                    exit 1
                 fi
            elif [ "$vm_state" = "running" ]; then
                 echo "VM is already running."
            fi
            
            echo ""
            echo "To configure this VM, we need the local SSH private key."
            echo ""
            
            # Fetch SSH keys from API
            echo "Fetching your SSH keys from LNVPS..."
            existing_ssh_keys_response=$(api_call "GET" "/ssh-key")
            existing_ssh_keys=$(echo "$existing_ssh_keys_response" | jq -r '.data // []')
            
            # Find local SSH private keys (look for .pub files and derive private key paths)
            existing_local_keys=()
            existing_key_paths=()
            if [ -d "$HOME/.ssh" ]; then
                find "$HOME/.ssh" -maxdepth 1 -name "*.pub" 2>/dev/null > /tmp/lnvps_existing_keys_$$
                while IFS= read -r pubkey; do
                    if [ -n "$pubkey" ]; then
                        priv_key="${pubkey%.pub}"
                        if [ -f "$priv_key" ]; then
                            existing_local_keys+=("$pubkey")
                            existing_key_paths+=("$priv_key")
                        fi
                    fi
                done < /tmp/lnvps_existing_keys_$$
                rm -f /tmp/lnvps_existing_keys_$$
            fi
            
            echo ""
            echo "=== SSH Key Selection ==="
            echo ""
            
            existing_opt_num=1
            existing_options_values=()
            default_option=1
            
            # List API keys first (so they become default)
            if [ -n "$existing_ssh_keys" ] && [ "$existing_ssh_keys" != "[]" ] && [ "$existing_ssh_keys" != "null" ]; then
                echo "Already uploaded to LNVPS:"
                echo "$existing_ssh_keys" | jq -r '.[] | "\(.id)|\(.name)"' > /tmp/lnvps_existing_api_keys_$$
                
                while IFS= read -r line; do
                    key_id=$(echo "$line" | cut -d'|' -f1)
                    key_name=$(echo "$line" | cut -d'|' -f2)
                    echo "  [$existing_opt_num] $key_name (ID: $key_id)"
                    existing_options_values[$existing_opt_num]="api:$key_id:$key_name"
                    existing_opt_num=$((existing_opt_num + 1))
                done < /tmp/lnvps_existing_api_keys_$$
                rm -f /tmp/lnvps_existing_api_keys_$$
                echo ""
            fi
            
            # List local SSH keys
            if [ ${#existing_local_keys[@]} -gt 0 ]; then
                echo "Local SSH keys (~/.ssh/):"
                for i in "${!existing_local_keys[@]}"; do
                    pubkey="${existing_local_keys[$i]}"
                    key_name=$(basename "$pubkey" .pub)
                    key_type=$(awk '{print $1}' "$pubkey" | sed 's/ssh-//')
                    key_comment=$(awk '{print $3}' "$pubkey")
                    echo "  [$existing_opt_num] $key_name ($key_type) ${key_comment:+- $key_comment}"
                    existing_options_values[$existing_opt_num]="local:$pubkey"
                    existing_opt_num=$((existing_opt_num + 1))
                done
                echo ""
            fi
            
            if [ $((existing_opt_num - 1)) -eq 0 ]; then
                echo "No SSH keys found."
                echo "Using default: ~/.ssh/id_rsa"
                ssh_private_key="$HOME/.ssh/id_rsa"
            else
                echo -n "Enter your choice [1-$((existing_opt_num-1))] (enter = default $default_option): "
                read key_choice
                
                if [ -z "$key_choice" ]; then
                    key_choice=$default_option
                fi
                
                if [ -z "${existing_options_values[$key_choice]}" ]; then
                    echo "Invalid selection, using default."
                    key_choice=$default_option
                fi
                
                selected_key="${existing_options_values[$key_choice]}"
                
                if [[ "$selected_key" == local:* ]]; then
                    pubkey_path="${selected_key#local:}"
                    ssh_private_key="${pubkey_path%.pub}"
                    echo "Using private key: $ssh_private_key"
                elif [[ "$selected_key" == api:* ]]; then
                    selected_content="${selected_key#api:}"
                    api_key_id=$(echo "$selected_content" | cut -d':' -f1)
                    api_key_name=$(echo "$selected_content" | cut -d':' -f2)
                    
                    echo "Using existing SSH key ID: $api_key_id"
                    
                    # Check if key exists locally by name
                    if [ -n "$api_key_name" ] && [ -f "$HOME/.ssh/$api_key_name" ]; then
                        ssh_private_key="$HOME/.ssh/$api_key_name"
                        echo "Found local key: $ssh_private_key"
                    elif [ -f "$HOME/.ssh/$api_key_id" ]; then
                        ssh_private_key="$HOME/.ssh/$api_key_id"
                        echo "Found local key: $ssh_private_key"
                    else
                        echo ""
                        echo "Please provide the path to your local SSH private key:"
                        echo -n "Path (default: ~/.ssh/id_rsa): "
                        read ssh_private_key
                        ssh_private_key="${ssh_private_key:-$HOME/.ssh/id_rsa}"
                        ssh_private_key="${ssh_private_key/#\~/$HOME}"
                    fi
                    echo "Using private key: $ssh_private_key"
                fi
            fi
            
            if [ ! -f "$ssh_private_key" ]; then
                echo "Warning: Key file not found at $ssh_private_key"
            fi
            
        else
            echo "VM ID not found. Creating new VM."
        fi
    else
        echo "Invalid selection, creating new VM."
    fi
fi

if [ "$SKIP_CREATION" = "false" ]; then
    # Desired custom VM specs
    DESIRED_CPU=2
    DESIRED_MEMORY=2147483648      # 2 GB in bytes
    DESIRED_DISK=42949672960       # 40 GB in bytes
    DESIRED_DISK_TYPE="ssd"
    DESIRED_DISK_INTERFACE="pcie"

    # Get available VM templates
    echo "Fetching available VM templates..."
    templates_response=$(curl -s "${API_BASE}/vm/templates")
    templates=$(echo "$templates_response" | jq -r '.data.templates // []')
    custom_templates=$(echo "$templates_response" | jq -r '.data.custom_template // []')

    if [ -z "$templates" ] || [ "$templates" = "[]" ] || [ "$templates" = "null" ]; then
        echo "Error: Could not fetch templates"
        exit 1
    fi

    # Function to check if custom template supports our desired specs
    check_custom_template() {
        local region_name="$1"
        local ct=$(echo "$custom_templates" | jq -r ".[] | select(.region.name | test(\"$region_name\"))")
        
        if [ -z "$ct" ] || [ "$ct" = "null" ]; then
            return 1
        fi
        
        local pricing_id=$(echo "$ct" | jq -r '.id')
        local min_cpu=$(echo "$ct" | jq -r '.min_cpu')
        local max_cpu=$(echo "$ct" | jq -r '.max_cpu')
        local min_mem=$(echo "$ct" | jq -r '.min_memory')
        local max_mem=$(echo "$ct" | jq -r '.max_memory')
        
        # Check CPU bounds
        if [ "$DESIRED_CPU" -lt "$min_cpu" ] || [ "$DESIRED_CPU" -gt "$max_cpu" ]; then
            return 1
        fi
        
        # Check memory bounds
        if [ "$DESIRED_MEMORY" -lt "$min_mem" ] || [ "$DESIRED_MEMORY" -gt "$max_mem" ]; then
            return 1
        fi
        
        # Check disk bounds for SSD
        local disk_ok=$(echo "$ct" | jq -r ".disks[] | select(.disk_type == \"$DESIRED_DISK_TYPE\" and .disk_interface == \"$DESIRED_DISK_INTERFACE\") | select(.min_disk <= $DESIRED_DISK and .max_disk >= $DESIRED_DISK) | .disk_type")
        
        if [ -z "$disk_ok" ]; then
            return 1
        fi
        
        echo "$pricing_id"
        return 0
    }

    # Try to get custom template pricing
    get_custom_price() {
        local pricing_id="$1"
        local price_response=$(curl -s "${API_BASE}/vm/custom-template/price" \
            -X POST \
            -H "Content-Type: application/json" \
            -d "{\"pricing_id\": $pricing_id, \"cpu\": $DESIRED_CPU, \"memory\": $DESIRED_MEMORY, \"disk\": $DESIRED_DISK, \"disk_type\": \"$DESIRED_DISK_TYPE\", \"disk_interface\": \"$DESIRED_DISK_INTERFACE\"}")
        
        local amount=$(echo "$price_response" | jq -r '.data.amount // empty')
        local currency=$(echo "$price_response" | jq -r '.data.currency // empty')
        
        if [ -n "$amount" ] && [ "$amount" != "null" ]; then
            echo "$amount|$currency"
            return 0
        fi
        return 1
    }

    USE_CUSTOM_TEMPLATE=false
    CUSTOM_PRICING_ID=""
    CUSTOM_REGION_NAME=""

    echo ""
    echo "Checking for custom VM configuration (2 CPU, 2GB RAM, 40GB SSD)..."

    # Try Dublin first
    dublin_pricing_id=$(check_custom_template "Dublin")
    if [ -n "$dublin_pricing_id" ]; then
        price_info=$(get_custom_price "$dublin_pricing_id")
        if [ -n "$price_info" ]; then
            USE_CUSTOM_TEMPLATE=true
            CUSTOM_PRICING_ID="$dublin_pricing_id"
            CUSTOM_REGION_NAME="Dublin (IE)"
            CUSTOM_PRICE=$(echo "$price_info" | cut -d'|' -f1)
            CUSTOM_CURRENCY=$(echo "$price_info" | cut -d'|' -f2)
            echo "  Dublin available: $CUSTOM_PRICE $CUSTOM_CURRENCY/month"
        fi
    fi

    # Try London if Dublin failed
    if [ "$USE_CUSTOM_TEMPLATE" = false ]; then
        london_pricing_id=$(check_custom_template "London")
        if [ -n "$london_pricing_id" ]; then
            price_info=$(get_custom_price "$london_pricing_id")
            if [ -n "$price_info" ]; then
                USE_CUSTOM_TEMPLATE=true
                CUSTOM_PRICING_ID="$london_pricing_id"
                CUSTOM_REGION_NAME="London (GB)"
                CUSTOM_PRICE=$(echo "$price_info" | cut -d'|' -f1)
                CUSTOM_CURRENCY=$(echo "$price_info" | cut -d'|' -f2)
                echo "  London available: $CUSTOM_PRICE $CUSTOM_CURRENCY/month"
            fi
        fi
    fi

    if [ "$USE_CUSTOM_TEMPLATE" = true ]; then
        echo ""
        echo "Custom VM configuration selected:"
        echo "  Region: $CUSTOM_REGION_NAME"
        echo "  CPU: $DESIRED_CPU cores"
        echo "  RAM: $((DESIRED_MEMORY / 1024 / 1024 / 1024)) GB"
        echo "  Disk: $((DESIRED_DISK / 1024 / 1024 / 1024)) GB SSD"
        echo "  Cost: $CUSTOM_PRICE $CUSTOM_CURRENCY/month"
        echo ""
    else
        # Fall back to showing available templates
        echo ""
        echo "Custom configuration not available. Please select a template:"
        echo ""
        echo "Available VM Templates:"
        echo "========================================"
        
        template_count=$(echo "$templates" | jq 'length')
        for i in $(seq 0 $((template_count - 1))); do
            t=$(echo "$templates" | jq ".[$i]")
            t_id=$(echo "$t" | jq -r '.id')
            t_name=$(echo "$t" | jq -r '.name')
            t_cpu=$(echo "$t" | jq -r '.cpu')
            t_ram=$(echo "$t" | jq -r '.memory')
            t_disk=$(echo "$t" | jq -r '.disk_size')
            t_cost=$(echo "$t" | jq -r '.cost_plan.amount')
            t_currency=$(echo "$t" | jq -r '.cost_plan.currency')
            t_region=$(echo "$t" | jq -r '.region.name')
            
            ram_gb=$((t_ram / 1024 / 1024 / 1024))
            disk_gb=$((t_disk / 1024 / 1024 / 1024))
            
            echo "  [$((i + 1))] $t_name - ${t_cpu} CPU, ${ram_gb}GB RAM, ${disk_gb}GB - $t_cost $t_currency/mo ($t_region)"
        done
        
        echo ""
        echo -n "Enter your choice [1-$template_count]: "
        read template_choice
        
        if [ -z "$template_choice" ] || [ "$template_choice" -lt 1 ] || [ "$template_choice" -gt "$template_count" ]; then
            echo "Error: Invalid selection"
            exit 1
        fi
        
        selected_template=$(echo "$templates" | jq ".[$((template_choice - 1))]")
        template_id=$(echo "$selected_template" | jq -r '.id')
        template_name=$(echo "$selected_template" | jq -r '.name')
        template_cpu=$(echo "$selected_template" | jq -r '.cpu')
        template_ram=$(echo "$selected_template" | jq -r '.memory')
        template_disk=$(echo "$selected_template" | jq -r '.disk_size')
        template_cost=$(echo "$selected_template" | jq -r '.cost_plan.amount')
        template_currency=$(echo "$selected_template" | jq -r '.cost_plan.currency')
        
        echo ""
        echo "Template selected:"
        echo "  Name: $template_name"
        echo "  CPU: ${template_cpu} cores"
        echo "  RAM: $((template_ram / 1024 / 1024)) MB"
        echo "  Disk: $((template_disk / 1024 / 1024 / 1024)) GB"
        echo "  Cost: $template_cost $template_currency/month"
        echo ""
    fi

    # List SSH keys - both local and from API
    echo "Fetching your SSH keys from LNVPS..."
    ssh_keys_response=$(api_call "GET" "/ssh-key")
    ssh_keys=$(echo "$ssh_keys_response" | jq -r '.data // []')

    # Find local SSH public keys
    local_keys=()
    local_key_paths=()
    if [ -d "$HOME/.ssh" ]; then
        # Use temp file to avoid subshell issues (Bash 3.2 compatible)
        find "$HOME/.ssh" -maxdepth 1 -name "*.pub" 2>/dev/null > /tmp/lnvps_local_keys_$$
        while IFS= read -r pubkey; do
            if [ -n "$pubkey" ]; then
                local_keys+=("$pubkey")
                local_key_paths+=("$pubkey")
            fi
        done < /tmp/lnvps_local_keys_$$
        rm -f /tmp/lnvps_local_keys_$$
    fi

    echo ""
    echo "=== SSH Key Selection ==="
    echo ""

    option_num=1
    # Use indexed arrays instead of associative arrays for Bash 3.2 compatibility
    options_values=()

    # List API keys first (so they become default)
    if [ -n "$ssh_keys" ] && [ "$ssh_keys" != "[]" ] && [ "$ssh_keys" != "null" ]; then
        echo "Already uploaded to LNVPS:"
        # Save to temp file to avoid subshell issues with while loop
        echo "$ssh_keys" | jq -r '.[] | "\(.id)|\(.name)"' > /tmp/lnvps_api_keys_$$
        
        while IFS= read -r line; do
            key_id=$(echo "$line" | cut -d'|' -f1)
            key_name=$(echo "$line" | cut -d'|' -f2)
            echo "  [$option_num] $key_name (ID: $key_id)"
            options_values[$option_num]="api:$key_id:$key_name"
            option_num=$((option_num + 1))
        done < /tmp/lnvps_api_keys_$$
        rm -f /tmp/lnvps_api_keys_$$
        echo ""
    fi

    # List local SSH keys
    if [ ${#local_keys[@]} -gt 0 ]; then
        echo "Local SSH keys (~/.ssh/):"
        for pubkey in "${local_key_paths[@]}"; do
            key_name=$(basename "$pubkey" .pub)
            key_type=$(awk '{print $1}' "$pubkey" | sed 's/ssh-//')
            key_comment=$(awk '{print $3}' "$pubkey")
            echo "  [$option_num] $key_name ($key_type) ${key_comment:+- $key_comment}"
            options_values[$option_num]="local:$pubkey"
            option_num=$((option_num + 1))
        done
        echo ""
    fi

    # Option to generate new key
    echo "Generate new key:"
    echo "  [$option_num] Generate new SSH key (ssh-keygen)"
    options_values[$option_num]="generate"
    option_num=$((option_num + 1))

    echo ""
    echo -n "Enter your choice [1-$((option_num-1))] (enter = default 1): "
    read ssh_choice

    if [ -z "$ssh_choice" ]; then
        ssh_choice=1
    fi

    if [ -z "${options_values[$ssh_choice]}" ]; then
        echo "Error: Invalid selection"
        exit 1
    fi

    selected="${options_values[$ssh_choice]}"

    if [[ "$selected" == local:* ]]; then
        # Upload local key to API
        pubkey_path="${selected#local:}"
        ssh_private_key="${pubkey_path%.pub}"
        key_name=$(basename "$pubkey_path" .pub)
        key_data=$(cat "$pubkey_path")
        
        echo ""
        echo "Uploading '$key_name' to LNVPS..."
        payload=$(jq -n --arg name "$key_name" --arg key "$key_data" '{name: $name, key_data: $key}')
        key_response=$(api_call "POST" "/ssh-key" "$payload")
        ssh_key_id=$(echo "$key_response" | jq -r '.data.id')
        
        if [ -z "$ssh_key_id" ] || [ "$ssh_key_id" = "null" ]; then
            echo "Error: Failed to upload SSH key"
            echo "Response: $key_response"
            exit 1
        fi
        
        echo "SSH key uploaded with ID: $ssh_key_id"

    elif [[ "$selected" == api:* ]]; then
        # Use existing API key - need local private key path
        selected_content="${selected#api:}"
        ssh_key_id=$(echo "$selected_content" | cut -d':' -f1)
        key_name=$(echo "$selected_content" | cut -d':' -f2)
        
        echo "Using existing SSH key ID: $ssh_key_id"
        
        # Check if key exists locally by name or ID
        if [ -n "$key_name" ] && [ -f "$HOME/.ssh/$key_name" ]; then
            ssh_private_key="$HOME/.ssh/$key_name"
            echo "Found local key: $ssh_private_key"
        elif [ -f "$HOME/.ssh/$ssh_key_id" ]; then
            ssh_private_key="$HOME/.ssh/$ssh_key_id"
            echo "Found local key: $ssh_private_key"
        else
            echo ""
            echo "Please provide the path to your local SSH private key:"
            echo -n "Path (default: ~/.ssh/id_rsa): "
            read ssh_private_key
            ssh_private_key="${ssh_private_key:-$HOME/.ssh/id_rsa}"
            
            # Expand ~ to home directory
            ssh_private_key="${ssh_private_key/#\~/$HOME}"
            
            if [ ! -f "$ssh_private_key" ]; then
                echo "Error: Private key not found at $ssh_private_key"
                exit 1
            fi
        fi
        echo "Using private key: $ssh_private_key"

    elif [ "$selected" = "generate" ]; then
        # Generate new SSH key
        echo ""
        echo -n "Enter key name (default: id_rsa): "
        read key_name
        key_name="${key_name:-id_rsa}"
        
        key_path="$HOME/.ssh/${key_name}"
        
        if [ -f "$key_path" ]; then
            echo "Error: Key already exists at $key_path"
            exit 1
        fi
        
        echo ""
        echo "Generating new SSH key..."
        ssh-keygen -t rsa -b 4096 -f "$key_path" -N "" -C "$key_name@lnvps"
        
        if [ ! -f "${key_path}.pub" ]; then
            echo "Error: Failed to generate SSH key"
            exit 1
        fi
        
        key_data=$(cat "${key_path}.pub")
        
        echo ""
        echo "Uploading '$key_name' to LNVPS..."
        payload=$(jq -n --arg name "$key_name" --arg key "$key_data" '{name: $name, key_data: $key}')
        key_response=$(api_call "POST" "/ssh-key" "$payload")
        ssh_key_id=$(echo "$key_response" | jq -r '.data.id')
        
        if [ -z "$ssh_key_id" ] || [ "$ssh_key_id" = "null" ]; then
            echo "Error: Failed to upload SSH key"
            echo "Response: $key_response"
            exit 1
        fi
        
        ssh_private_key="$key_path"
        echo "SSH key generated and uploaded with ID: $ssh_key_id"
        echo "Private key saved to: $key_path"
    fi

    # Get available OS images
    echo ""
    echo "Fetching available OS images..."
    images_response=$(curl -s "${API_BASE}/image")
    images=$(echo "$images_response" | jq -r '.data // []')

    if [ -z "$images" ] || [ "$images" = "[]" ] || [ "$images" = "null" ]; then
        echo "Error: Could not fetch images"
        exit 1
    fi

    echo ""
    echo "Available OS images:"
    echo "$images" | jq -r '.[] | "  \(.id): \(.distribution) \(.version) (\(.flavour))"'
    echo ""
    echo "Enter image ID (or press enter for Ubuntu default):"
    read image_id

    if [ -z "$image_id" ]; then
        # Find Ubuntu image as default
        image_id=$(echo "$images" | jq -r '[.[] | select(.distribution == "ubuntu")] | .[0].id // .[0].id')
        echo "Using image ID: $image_id"
    fi

    # Create VM order
    echo ""
    echo "Creating VM order..."

    if [ "$USE_CUSTOM_TEMPLATE" = true ]; then
        # Custom template order
        payload=$(jq -n \
            --argjson pricing_id "$CUSTOM_PRICING_ID" \
            --argjson cpu "$DESIRED_CPU" \
            --argjson memory "$DESIRED_MEMORY" \
            --argjson disk "$DESIRED_DISK" \
            --arg disk_type "$DESIRED_DISK_TYPE" \
            --arg disk_interface "$DESIRED_DISK_INTERFACE" \
            --argjson image "$image_id" \
            --argjson ssh "$ssh_key_id" '{
            pricing_id: $pricing_id,
            cpu: $cpu,
            memory: $memory,
            disk: $disk,
            disk_type: $disk_type,
            disk_interface: $disk_interface,
            image_id: $image,
            ssh_key_id: $ssh
        }')
        
        vm_response=$(api_call "POST" "/vm/custom-template" "$payload")
    else
        # Standard template order
        payload=$(jq -n --argjson template "$template_id" --argjson image "$image_id" --argjson ssh "$ssh_key_id" '{
            template_id: $template,
            image_id: $image,
            ssh_key_id: $ssh
        }')
        
        vm_response=$(api_call "POST" "/vm" "$payload")
    fi

    vm_id=$(echo "$vm_response" | jq -r '.data.id')

    if [ -z "$vm_id" ] || [ "$vm_id" = "null" ]; then
        echo "Error: Failed to create VM"
        echo "Response: $vm_response"
        exit 1
    fi

    echo "VM created with ID: $vm_id"

    # Get payment invoice
    echo ""
    echo "Getting payment invoice..."
    payment_response=$(api_call "GET" "/vm/${vm_id}/renew")
    payment=$(echo "$payment_response" | jq -r '.data')

    if [ -z "$payment" ] || [ "$payment" = "null" ]; then
        echo "Error: Failed to get payment"
        echo "Response: $payment_response"
        exit 1
    fi

    payment_id=$(echo "$payment" | jq -r '.id')
    LNVPS_INVOICE=$(echo "$payment" | jq -r '.data.lightning')
    amount_raw=$(echo "$payment" | jq -r '.amount')
    amount=$((amount_raw / 1000))
    currency=$(echo "$payment" | jq -r '.currency')

    echo ""
    echo "========================================"
    echo "VPS COST: $amount sats"
    echo "========================================"

    if [ "$OS_TYPE" = "mac" ]; then
        # macOS: Direct Lightning payment (no cdk-cli)
        echo ""
        echo "Pay the VPS invoice directly with your Lightning wallet:"
        echo ""
        echo "Lightning Invoice:"
        echo "$LNVPS_INVOICE"
        echo ""
        echo "========================================"
        echo ""
        echo "Scan to pay:"
        echo ""
        print_qr_code "$LNVPS_INVOICE"
        echo ""
        echo "Scan the QR code above with a Lightning wallet to pay!"

    else
        # Linux: Use cdk-cli for Cashu payment
        echo ""
        echo "Select Routstr topup amount:"
        echo "  [1] 4200 sats (recommended)"
        echo "  [2] 2100 sats"
        echo "  [3] 1000 sats"
        echo "  [4] Custom amount"
        echo ""
        echo -n "Enter your choice [1-4] (enter = default 1): "
        read topup_choice

        if [ -z "$topup_choice" ]; then
            topup_choice=1
        fi

        case "$topup_choice" in
            1)
                topup_amount=4200
                ;;
            2)
                topup_amount=2100
                ;;
            3)
                topup_amount=1000
                ;;
            4)
                echo -n "Enter custom topup amount (sats): "
                read topup_amount
                if [ -z "$topup_amount" ] || ! [[ "$topup_amount" =~ ^[0-9]+$ ]]; then
                    echo "Error: Invalid amount. Using default 4200 sats."
                    topup_amount=4200
                fi
                ;;
            *)
                echo "Invalid choice. Using default 4200 sats."
                topup_amount=4200
                ;;
        esac

        total_sats=$((amount + topup_amount))
        echo ""
        echo "========================================"
        echo "VPS COST: $amount sats"
        echo "ROUTSTR TOPUP: $topup_amount sats"
        echo "TOTAL: $total_sats"
        echo "========================================"
        echo ""
        echo "CREATING LIGHTING INVOICE..."

        MINT_OUTPUT=$(timeout 5 "$CDK_CLI_BIN" mint "$MINT_URL" "$total_sats" 2>&1) || true
        MINT_QUOTE_ID=$(echo "$MINT_OUTPUT" | grep -oP 'id: "\K[^"]+' || echo "")
        MINT_INVOICE=$(echo "$MINT_OUTPUT" | grep -oP 'Please pay: \K\S+' || echo "")
        if [ -z "$MINT_INVOICE" ]; then
            MINT_INVOICE=$(echo "$MINT_OUTPUT" | grep -oP 'request: "\K[^"]+' || echo "")
        fi

        echo ""
        echo "========================================"
        echo "MINT INVOICE (FUND CASHU)"
        echo "========================================"
        echo "Amount: $total_sats sats"
        echo ""
        echo "Lightning Invoice:"
        echo "$MINT_INVOICE"
        echo "Quote ID:"
        echo "$MINT_QUOTE_ID"
        echo ""
        echo "========================================"
        echo ""

        if [ -z "$MINT_QUOTE_ID" ] || [ -z "$MINT_INVOICE" ]; then
            echo "Error: Failed to create mint invoice"
            echo "Raw output:"
            echo "$MINT_OUTPUT"
            exit 1
        fi

        echo "Scan to pay:"
        echo ""
        print_qr_code "$MINT_INVOICE"
        echo ""
        echo "Scan the QR code above with a Lightning wallet to pay!"

        echo "Waiting for mint invoice payment (checking every 10 seconds)..."
        while true; do
            sleep 10
            
            QUOTE_STATUS=$("$CDK_CLI_BIN" mint "$MINT_URL" -q "$MINT_QUOTE_ID" 2>&1) || true
            echo "$QUOTE_STATUS"
            if echo "$QUOTE_STATUS" | grep -q "Received $total_sats from mint"; then
                echo ""
                echo "Mint invoice paid."
                break
            fi
            
            echo -n "."
        done

        echo ""
        echo "Paying VPS invoice with cdk-cli..."
        echo "$LNVPS_INVOICE" | "$CDK_CLI_BIN" melt --mint-url "$MINT_URL"
    fi
fi

if [ "$SKIP_CREATION" = "false" ]; then
    # Poll for payment status (only for new VMs)
    echo "Waiting for payment (checking every 10 seconds)..."
    while true; do
        sleep 10

        payment_check=$(api_call "GET" "/payment/${payment_id}")
        is_paid=$(echo "$payment_check" | jq -r '.data.is_paid')
        
        if [ "$is_paid" = "true" ]; then
            echo ""
            echo "Payment received!"
            break
        fi
        
        echo -n "."
    done

    # Get VM details
    echo ""
    echo "Provisioning VM..."
    sleep 5

    vm_details=$(api_call "GET" "/vm/${vm_id}")
    vm_ip=$(echo "$vm_details" | jq -r '.data.ip_assignments[0].ip // empty')
    vm_user=$(echo "$vm_details" | jq -r '.data.image.default_username // "root"')

    if [ -z "$vm_ip" ] || [ "$vm_ip" = "null" ]; then
        echo "Waiting for IP assignment..."
        for i in {1..12}; do
            sleep 10
            vm_details=$(api_call "GET" "/vm/${vm_id}")
            vm_ip=$(echo "$vm_details" | jq -r '.data.ip_assignments[0].ip // empty')
            if [ -n "$vm_ip" ] && [ "$vm_ip" != "null" ]; then
                break
            fi
            echo -n "."
        done
    fi

    if [ -z "$vm_ip" ] || [ "$vm_ip" = "null" ]; then
        echo ""
        echo "Warning: Could not get VM IP. Check status manually:"
        echo "  VM ID: $vm_id"
        exit 1
    fi
else
    # For existing VMs, get current details
    echo ""
    echo "Fetching existing VM details..."
    vm_details=$(api_call "GET" "/vm/${vm_id}")
    vm_ip=$(echo "$vm_details" | jq -r '.data.ip_assignments[0].ip // empty')
    vm_user=$(echo "$vm_details" | jq -r '.data.image.default_username // "root"')
    
    if [ -z "$vm_ip" ] || [ "$vm_ip" = "null" ]; then
        echo ""
        echo "Warning: Could not get VM IP. Check status manually:"
        echo "  VM ID: $vm_id"
        exit 1
    fi
fi

# Strip CIDR suffix (e.g., /25) from IP address
vm_ip_clean="${vm_ip%%/*}"

echo ""
echo "========================================"
echo "VM READY!"
echo "========================================"
echo "VM ID: $vm_id"
echo "IP Address: $vm_ip_clean"
echo "Username: $vm_user"
echo ""
echo "Command to SSH into VPS:"
echo "ssh -i $ssh_private_key $vm_user@$vm_ip_clean"

# Save VM info to a text file in the current folder
VM_INFO_FILE="./vm-info.txt"
cat > "$VM_INFO_FILE" << EOF
VM READY!
========================================
VM ID: $vm_id
IP Address: $vm_ip_clean
Username: $vm_user

Command to SSH into VPS:
ssh -i $ssh_private_key $vm_user@$vm_ip_clean

Generated at: $(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
echo ""
echo "VM info saved to: $VM_INFO_FILE"

# Check if VM is stopped and start it if necessary
echo ""
echo "Checking VM state..."
vm_details_resp=$(api_call "GET" "/vm/${vm_id}")
vm_data=$(echo "$vm_details_resp" | jq -r '.data // null')

if [ -n "$vm_data" ] && [ "$vm_data" != "null" ]; then
    vm_state=$(echo "$vm_data" | jq -r '.status.state // "unknown"')
    echo "VM state: $vm_state"
    
    if [ "$vm_state" = "stopped" ]; then
        echo "Starting VM..."
        start_resp=$(api_call "PATCH" "/vm/${vm_id}/start")
        echo "VM start command sent."
        
        # Wait a moment for VM to start
        echo "Waiting for VM to start..."
        sleep 10
    fi
fi

echo ""
echo "Installing OpenClaw on VPS, this will take a solid 5 mins..."
if [ -n "$ssh_private_key" ]; then

    if [ "$OS_TYPE" = "mac" ]; then
        # Mac: Skip cashu token generation and run without --cashu flag
        if ! ssh -i "$ssh_private_key" "$vm_user@$vm_ip_clean" "curl -L https://routstr.com/routstr-openclaw.sh | bash -s -- --lnvps"; then
            echo ""
            echo "Error: Failed to configure Routstr on VPS."
            echo ""
            echo "This is usually caused by SSH connection timeout while the VPS is still booting."
            echo "Please wait a minute and run this script again - it will detect your existing VPS."
            echo ""
            exit 1
        fi
    else
        if ! ssh -i "$ssh_private_key" "$vm_user@$vm_ip_clean" "curl -fsSL https://openclaw.bot/install.sh | bash -s -- --no-onboard"; then
            echo ""
            echo "Error: Failed to install OpenClaw on VPS."
            echo ""
            echo "This is usually caused by SSH connection timeout while the VPS is still booting."
            echo "Please wait a minute and run this script again - it will detect your existing VPS."
            echo ""
            exit 1
        fi

        echo ""
        echo "Configuring Routstr..."

        # Linux: Generate cashu token and run with --cashu flag
        # Capture full output for debugging
        
        # Check balance first
        echo "Checking wallet balance..."
        BALANCE_OUTPUT=$("$CDK_CLI_BIN" balance 2>&1)
        # Extract balance for the specific mint URL
        # Output format: 0: https://mint.cubabitcoin.org 3879 sat
        CURRENT_BALANCE=$(echo "$BALANCE_OUTPUT" | grep "$MINT_URL" | awk '{print $(NF-1)}')
        
        if [ -z "$CURRENT_BALANCE" ]; then
            CURRENT_BALANCE=0
        fi
        
        if [ "$CURRENT_BALANCE" -lt "$topup_amount" ]; then
             echo "Using available balance: $CURRENT_BALANCE sats"
             topup_amount=$CURRENT_BALANCE
        fi

        SEND_OUTPUT=$(echo -e "$topup_amount\n\n" | "$CDK_CLI_BIN" send --mint-url "$MINT_URL" 2>&1 || true)
        CASHU_TOKEN=$(echo "$SEND_OUTPUT" | grep -oP 'cashu\S+' || true)

        if [ -z "$CASHU_TOKEN" ]; then
            echo "Error: Failed to generate Cashu token."
            echo "Debug Output from cdk-cli:"
            echo "$SEND_OUTPUT"
            exit 1
        fi

        echo "Generated Token: ${CASHU_TOKEN}"
        echo "${CASHU_TOKEN}" > ./cashu_token.txt

        if ! ssh -i "$ssh_private_key" "$vm_user@$vm_ip_clean" "curl -L https://routstr.com/routstr-openclaw.sh | bash -s -- --cashu $CASHU_TOKEN --lnvps"; then
            echo ""
            echo "Error: Failed to configure Routstr on VPS."
            echo ""
            echo "This is usually caused by SSH connection timeout while the VPS is still booting."
            echo "Please wait a minute and run this script again - it will detect your existing VPS."
            echo ""
            exit 1
        fi
    fi

    echo "Copying nostr config to VPS..."
    if ! ssh -i "$ssh_private_key" "$vm_user@$vm_ip_clean" "mkdir -p ~/.openclaw/identity/"; then
        echo ""
        echo "Error: Failed to create directory on VPS."
        echo ""
        echo "This is usually caused by SSH connection timeout while the VPS is still booting."
        echo "Please wait a minute and run this script again - it will detect your existing VPS."
        echo ""
        exit 1
    fi
    if ! scp -i "$ssh_private_key" "$NOSTR_CONFIG_FILE" "$vm_user@$vm_ip_clean:~/.openclaw/identity/nostr.config.json"; then
        echo ""
        echo "Error: Failed to copy nostr config to VPS."
        echo ""
        echo "This is usually caused by SSH connection timeout while the VPS is still booting."
        echo "Please wait a minute and run this script again - it will detect your existing VPS."
        echo ""
        exit 1
    fi
    
    echo ""
    echo "#######################################################"
    echo "#                                                     #"
    echo "#      OPENCLAW & ROUTSTR SETUP COMPLETE! 🚀          #"
    echo "#                                                     #"
    echo "#######################################################"
    echo ""
    echo "⚠️  ONE LAST ACTION REQUIRED ⚠️"
    echo ""
    echo "To setup your message channels, SSH into your VPS:"
    echo ""
    echo "  ssh -i $ssh_private_key $vm_user@$vm_ip_clean"
    echo ""
    echo "Then run this command:"
    echo ""
    echo "  openclaw channels add"
else
    echo "Something must've gone wrong, can't find your SSH key, pls try again"
fi
echo ""
echo "========================================"
