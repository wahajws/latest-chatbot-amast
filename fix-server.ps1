# PowerShell script to fix Node.js GLIBC issue on server
# Uses PuTTY tools (plink, pscp) to connect and fix the issue

$PPK_FILE = "intern-ppk (1).ppk"
$SERVER_IP = "47.250.116.135"
$SERVER_USER = "root"
$PROJECT_PATH = "/opt/chatbot/latest-chatbot-amast"

Write-Host "🚀 Fixing Node.js GLIBC issue on server..." -ForegroundColor Cyan
Write-Host ""

# Check if PPK file exists
if (-not (Test-Path $PPK_FILE)) {
    Write-Host "❌ PPK file not found: $PPK_FILE" -ForegroundColor Red
    exit 1
}

# Check if plink exists
$plinkPath = Get-Command plink -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $plinkPath) {
    Write-Host "❌ PuTTY plink not found. Please install PuTTY." -ForegroundColor Red
    exit 1
}

Write-Host "📤 Copying deployment script to server..." -ForegroundColor Yellow

# Copy deployment script using pscp
$pscpPath = Get-Command pscp -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if ($pscpPath) {
    & $pscpPath -i $PPK_FILE deploy-server.sh "${SERVER_USER}@${SERVER_IP}:/root/deploy-server.sh"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Could not copy file. Will run commands directly." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🔧 Running fix commands on server..." -ForegroundColor Yellow
Write-Host ""

# Commands to fix the issue
$fixCommands = @"
# Install prerequisites
apt-get update -qq
apt-get install -y -qq curl wget git build-essential

# Install NVM
export NVM_DIR="`$HOME/.nvm"
if [ ! -d "`$NVM_DIR" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
fi
export NVM_DIR="`$HOME/.nvm"
[ -s "`$NVM_DIR/nvm.sh" ] && \. "`$NVM_DIR/nvm.sh"

# Install Node.js v16 (compatible with GLIBC 2.27)
nvm install 16.20.2
nvm use 16.20.2
nvm alias default 16.20.2

# Add to bashrc for persistence
echo 'export NVM_DIR="`$HOME/.nvm"' >> ~/.bashrc
echo '[ -s "`$NVM_DIR/nvm.sh" ] && \. "`$NVM_DIR/nvm.sh"' >> ~/.bashrc
echo '[ -s "`$NVM_DIR/bash_completion" ] && \. "`$NVM_DIR/bash_completion"' >> ~/.bashrc

# Verify installation
echo ""
echo "✅ Node.js installation complete!"
node --version
npm --version

# Navigate to project and install dependencies
cd $PROJECT_PATH/backend
export NVM_DIR="`$HOME/.nvm"
[ -s "`$NVM_DIR/nvm.sh" ] && \. "`$NVM_DIR/nvm.sh"
npm install --production

echo ""
echo "✅ Setup complete! You can now run: npm start"
"@

# Run commands on server
& $plinkPath -i $PPK_FILE -batch "${SERVER_USER}@${SERVER_IP}" $fixCommands

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Server fix completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. SSH into server: plink -i `"$PPK_FILE`" ${SERVER_USER}@${SERVER_IP}" -ForegroundColor White
    Write-Host "   2. Navigate to project: cd $PROJECT_PATH/backend" -ForegroundColor White
    Write-Host "   3. Load NVM: source ~/.nvm/nvm.sh" -ForegroundColor White
    Write-Host "   4. Start application: npm start" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "⚠️  Some commands may have failed. Please check the output above." -ForegroundColor Yellow
    Write-Host "You can SSH manually and run the commands:" -ForegroundColor Yellow
    Write-Host "  plink -i `"$PPK_FILE`" ${SERVER_USER}@${SERVER_IP}" -ForegroundColor White
}





