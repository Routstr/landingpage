#!/bin/bash

# Download the zip file from GitHub (raw content URL)
curl -L -o routstr-kit-openclaw.zip "https://github.com/Routstr/agents-w-routstr/raw/main/routstr-kit-openclaw.zip"

# Unzip the file
unzip -o routstr-kit-openclaw.zip

# Create target directories if they don't exist
mkdir -p ~/.openclaw
mkdir -p ~/.npm-global/lib/node_modules/openclaw/skills

# Move openclaw.json to ~/.openclaw/
mv openclaw.json ~/.openclaw/

# Move contents of skills folder to the target location
mv skills/* ~/.npm-global/lib/node_modules/openclaw/skills/

# Clean up
rm -rf skills
rm routstr-kit-openclaw.zip

echo "Setup complete!"
