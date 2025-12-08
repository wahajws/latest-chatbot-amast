#!/bin/bash
# Startup script for backend - ensures NVM is loaded

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Navigate to backend directory
cd /opt/chatbot/latest-chatbot-amast/backend

# Start the application
npm start

