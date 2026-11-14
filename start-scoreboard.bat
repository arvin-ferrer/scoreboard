@echo off
cd /d "%~dp0"
title Get One Fourth Scoreboard
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed on this laptop.
  pause
  exit /b 1
)
echo Starting the scoreboard. Close this window to stop it.
node scripts\supervisor.js %*
echo.
echo The scoreboard has stopped.
pause
