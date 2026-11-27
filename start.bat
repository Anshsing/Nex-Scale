@echo off
title ScaleLab Runner
echo =========================================
echo    ScaleLab All-In-One Service Launcher   
echo =========================================
echo.

echo [1/3] Starting Benchmark Target API (Port 4000)...
start "ScaleLab Benchmark Target" /min node apps/benchmark-target/dist/server.js

timeout /t 2 /nobreak >nul

echo [2/3] Starting ScaleLab API Gateway (Port 3001)...
start "ScaleLab Core API" /min node apps/api/dist/server.js

timeout /t 2 /nobreak >nul

echo [3/3] Starting ScaleLab Dashboard (Port 3000)...
start http://localhost:3000
npm --workspace=@scalelab/dashboard run dev
