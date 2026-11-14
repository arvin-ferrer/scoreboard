@echo off
rem Lets other laptops on the hotspot reach the scoreboard (TCP port 3000). Run once per host laptop.
rem Needs administrator rights, so it asks for elevation and re-runs itself.
net session >nul 2>nul
if errorlevel 1 (
  echo Asking for administrator permission...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
title Get One Fourth Scoreboard - firewall
netsh advfirewall firewall delete rule name="Get One Fourth Scoreboard" >nul 2>nul
netsh advfirewall firewall add rule name="Get One Fourth Scoreboard" dir=in action=allow protocol=TCP localport=3000 profile=any
if errorlevel 1 (
  echo Could not add the firewall rule.
) else (
  echo Done. Other laptops on the hotspot can now open the scoreboard on this laptop.
)
pause
