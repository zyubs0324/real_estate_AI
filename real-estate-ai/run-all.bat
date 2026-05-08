@echo off
chcp 65001 > nul
title Real Estate AI - Dev Server

echo.
echo  =============================================
echo   Real Estate AI - Starting Dev Server
echo  =============================================
echo.

cd /d "%~dp0"

echo  [1/1] Starting Next.js dev server (port 3000)...
echo.
echo  Access: http://localhost:3000
echo  Press Ctrl+C in this window to stop.
echo.

npm run dev

pause
