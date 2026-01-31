#!/bin/bash

# Download the tar.gz file from GitHub (raw content URL)
curl -L -o routstr-kit-openclaw.tar.gz "https://github.com/Routstr/agents-w-routstr/raw/main/routstr-kit-openclaw.tar.gz"

# Extract the tar.gz file
tar -xzvf routstr-kit-openclaw.tar.gz

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

echo "Setup complete!"
