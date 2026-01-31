#!/bin/bash

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
            echo "Usage: $0 --cashu <token>"
            exit 1
            ;;
    esac
done

if [ -z "$CASHU_TOKEN" ]; then
    echo "Error: --cashu <token> is required"
    echo "Usage: $0 --cashu <token>"
    exit 1
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

# Move openclaw.json to ~/.openclaw/
mv openclaw.json ~/.openclaw/

# Move contents of skills folder to the target location
mv skills/* ~/.npm-global/lib/node_modules/openclaw/skills/

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