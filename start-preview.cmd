@echo off
cd /d "%~dp0"
if not exist "node_modules\ws\package.json" (
  echo Installing COCKPIT's WebSocket server dependency...
  npm install --no-audit --no-fund
  if errorlevel 1 exit /b 1
)
node server.mjs
