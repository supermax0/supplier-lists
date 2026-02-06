@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo رفع التحديثات إلى GitHub
echo ========================================
echo.

REM التحقق من وجود git
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo خطأ: Git غير مثبت. يرجى تثبيت Git أولاً.
    pause
    exit /b 1
)

REM تهيئة git إذا لم يكن موجوداً
if not exist .git (
    echo تهيئة مستودع Git...
    git init
    git branch -M main
)

REM إضافة remote إذا لم يكن موجوداً
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo إضافة remote...
    git remote add origin https://github.com/supermax0/supplier-lists.git
)

REM إضافة جميع الملفات
echo إضافة الملفات...
git add .

REM عمل commit
echo عمل commit...
git commit -m "تحسينات: تعديل المورد، تحسين التصميم، Firebase"

REM رفع التحديثات
echo رفع التحديثات إلى GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ✓ تم رفع التحديثات بنجاح!
) else (
    echo.
    echo ✗ فشل رفع التحديثات. تحقق من الاتصال بالإنترنت وبيانات المصادقة.
)

echo.
pause
