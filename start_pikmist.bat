@echo off
chcp 65001 >nul
title PikMist
cd /d "%~dp0"
echo.
echo   Запускается PikMist... Окно браузера откроется автоматически.
echo   НЕ закрывайте это окно, пока работаете с PikMist.
echo.
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://127.0.0.1:8787"
python app.py
pause
