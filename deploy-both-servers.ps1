# PowerShell script to deploy to both servers
# 47.250.116.135 - Check Node.js configuration
# 47.250.127.75 - Update nginx configuration

$SSH_KEY = "intern-ppk (1).ppk"
$SERVER1 = "47.250.116.135"
$SERVER2 = "47.250.127.75"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deployment Script for Both Servers" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Node.js on Server 1
Write-Host "Step 1: Checking Node.js on $SERVER1" -ForegroundColor Yellow
Write-Host ""

# Copy check script to server 1
Write-Host "Copying check script..." -ForegroundColor Gray
& pscp -i $SSH_KEY check-and-fix-nodejs-47.250.116.135.sh "root@${SERVER1}:/root/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Running Node.js check..." -ForegroundColor Gray
    & plink -i $SSH_KEY "root@${SERVER1}" "chmod +x /root/check-and-fix-nodejs-47.250.116.135.sh && bash /root/check-and-fix-nodejs-47.250.116.135.sh"
    Write-Host "✅ Node.js check completed on $SERVER1" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to copy script to $SERVER1" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 2: Updating nginx on $SERVER2" -ForegroundColor Yellow
Write-Host ""

# Copy nginx config to server 2
Write-Host "Copying nginx configuration..." -ForegroundColor Gray
& pscp -i $SSH_KEY nginx-taibot-47.250.127.75.conf "root@${SERVER2}:/tmp/nginx-taibot-47.250.127.75.conf"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Copying deployment script..." -ForegroundColor Gray
    & pscp -i $SSH_KEY deploy-nginx-47.250.127.75.sh "root@${SERVER2}:/root/"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Running nginx deployment..." -ForegroundColor Gray
        & plink -i $SSH_KEY "root@${SERVER2}" "chmod +x /root/deploy-nginx-47.250.127.75.sh && bash /root/deploy-nginx-47.250.127.75.sh"
        Write-Host "✅ Nginx deployment completed on $SERVER2" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to copy deployment script" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Failed to copy nginx config to $SERVER2" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server 1 ($SERVER1):" -ForegroundColor Yellow
Write-Host "  - Node.js configuration checked" -ForegroundColor Gray
Write-Host ""
Write-Host "Server 2 ($SERVER2):" -ForegroundColor Yellow
Write-Host "  - Nginx configuration updated" -ForegroundColor Gray
Write-Host "  - Frontend serving enabled" -ForegroundColor Gray
Write-Host "  - API proxy configured" -ForegroundColor Gray
Write-Host ""
Write-Host "Test your site:" -ForegroundColor Cyan
Write-Host "  https://taibot.amastsales-sandbox.com" -ForegroundColor White
Write-Host ""




