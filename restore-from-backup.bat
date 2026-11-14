@echo off
cd /d "%~dp0"
title Get One Fourth Scoreboard - restore from backup
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed on this laptop.
  pause
  exit /b 1
)
echo Start the scoreboard from a backup (for example the USB drive).
set /p BACKUP=Backup folder, e.g. E:\scoreboard-backup : 
if "%BACKUP%"=="" exit /b 1
set BACKUP=%BACKUP:"=%
if "%BACKUP:~-1%"=="\" set BACKUP=%BACKUP:~0,-1%
set FORCE=
set /p ANS=Replace scores already on THIS laptop? (y/N) : 
if /i "%ANS%"=="y" set FORCE=--force
node scripts\supervisor.js --from-backup "%BACKUP%" %FORCE%
echo.
echo The scoreboard has stopped.
pause
