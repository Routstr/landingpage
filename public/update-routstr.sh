#!/bin/bash

set -e

# Parse command line arguments
LNVPS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --lnvps)
            LNVPS=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--lnvps]"
            exit 1
            ;;
    esac
done

# Determine which kit to download
if [ "$LNVPS" = true ]; then
    KIT_URL="https://routstr.com/routstr-kit-lnvps-openclaw.tar.gz"
    KIT_FILE="routstr-kit-lnvps-openclaw.tar.gz"
else
    KIT_URL="https://routstr.com/routstr-kit-openclaw.tar.gz"
    KIT_FILE="routstr-kit-openclaw.tar.gz"
fi

echo "=== Downloading Routstr kit ==="
echo "URL: $KIT_URL"
echo ""

# Download the tar.gz file
curl -L -o "$KIT_FILE" "$KIT_URL"

echo "Download complete!"
echo ""

# Extract the tar.gz file
echo "=== Extracting files ==="
tar -xzvf "$KIT_FILE"

echo "Extraction complete!"
echo ""

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
# First try the default npm-global path
TARGET_SKILLS_DIR="$HOME/.npm-global/lib/node_modules/openclaw/skills/"

# Check if directory exists and has subdirectories
if [ ! -d "$TARGET_SKILLS_DIR" ] || [ -z "$(find "$TARGET_SKILLS_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null)" ]; then
    # Fall back to finding skills dir relative to npm location
    if command -v npm >/dev/null 2>&1; then
        NPM_PATH=$(command -v npm)
        NPM_DIR=$(dirname "$NPM_PATH")
        # NPM_DIR is <node_version>/bin, we need <node_version>/lib/node_modules/openclaw/skills
        NODE_VERSION_DIR=$(dirname "$NPM_DIR")
        FALLBACK_SKILLS_DIR="$NODE_VERSION_DIR/lib/node_modules/openclaw/skills/"
        if [ -d "$FALLBACK_SKILLS_DIR" ] || [ -d "$(dirname "$FALLBACK_SKILLS_DIR")" ]; then
            TARGET_SKILLS_DIR="$FALLBACK_SKILLS_DIR"
            mkdir -p "$TARGET_SKILLS_DIR"
        fi
    fi
fi

# Ensure target directory exists
mkdir -p "$TARGET_SKILLS_DIR"

echo "=== Copying skills to $TARGET_SKILLS_DIR ==="
for skill in skills/*; do
    if [ -e "$skill" ]; then
        skill_name=$(basename "$skill")
        if [ ! -e "$TARGET_SKILLS_DIR/$skill_name" ]; then
            mv "$skill" "$TARGET_SKILLS_DIR"
            echo "  Copied: $skill_name"
        else
            echo "  Skipped: $skill_name (already exists)"
        fi
    fi
done

# Move AGENTS.md to workspace directory
mkdir -p ~/.openclaw/workspace
if [ -f AGENTS.md ]; then
    mv AGENTS.md ~/.openclaw/workspace/
    echo "  Copied: AGENTS.md"
fi

# Clean up
rm -rf skills
rm "$KIT_FILE"

echo ""
echo "=== Update complete! ==="
echo "Files copied to:"
echo "  - ~/.openclaw/openclaw.json"
echo "  - $TARGET_SKILLS_DIR"
echo "  - ~/.openclaw/workspace/AGENTS.md"
