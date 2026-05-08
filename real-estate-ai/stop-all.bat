@echo off
chcp 65001 > nul
title Real Estate AI - Stop All

echo.
echo  =============================================
echo   Real Estate AI - Stopping All Servers
echo  =============================================
echo.

echo  [1/2] Killing Node.js processes...
taskkill /F /IM node.exe /T > nul 2>&1
if %errorlevel% == 0 (
    echo         OK - Node.js stopped.
) else (
    echo         INFO - No Node.js process was running.
)

echo  [2/2] Releasing port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " 2^>nul') do (
    taskkill /F /PID %%a > nul 2>&1
)
echo         OK - Port 3000 released.

echo.
echo  All servers stopped.
echo.
pause
