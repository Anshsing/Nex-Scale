Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   ScaleLab All-In-One Service Launcher   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Start Benchmark Target API on Port 4000
Write-Host "[1/3] Starting Benchmark Target E-Commerce API (Port 4000)..." -ForegroundColor Yellow
$target = Start-Process -FilePath "node" -ArgumentList "apps/benchmark-target/dist/server.js" -PassThru -NoNewWindow
Start-Sleep -Seconds 1

# 2. Start Core API Gateway on Port 3001
Write-Host "[2/3] Starting ScaleLab Core API Gateway (Port 3001)..." -ForegroundColor Yellow
$api = Start-Process -FilePath "node" -ArgumentList "apps/api/dist/server.js" -PassThru -NoNewWindow
Start-Sleep -Seconds 1

# 3. Start Next.js Developer Dashboard on Port 3000
Write-Host "[3/3] Starting ScaleLab Next.js Dashboard (Port 3000)..." -ForegroundColor Green
Write-Host "Opening http://localhost:3000 in browser..." -ForegroundColor Cyan
Start-Process "http://localhost:3000"

npm --workspace=@scalelab/dashboard run dev
