@echo off
chcp 65001 >nul
cd /d "%~dp0"
git status
git add .
git commit -m "Fix: إزالة الكود المكرر وإصلاح أخطاء إعادة الإعلان"
git push origin main
pause
