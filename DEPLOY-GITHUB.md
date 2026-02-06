# نشر المشروع على GitHub — خطوات سريعة

## 1. إنشاء المستودع على GitHub

- ادخل إلى: **https://github.com/new**
- **Repository name:** مثلاً `supplier-lists` أو `lists-app`
- **Public** → **Create repository** (بدون README أو .gitignore)

---

## 2. تنفيذ الأوامر من مجلد المشروع

افتح **Command Prompt** أو **PowerShell** ثم انتقل لمجلد المشروع:

```bash
cd "C:\Users\msi\Desktop\قوائم"
```

ثم نفّذ (غيّر `YOUR_USERNAME` و `YOUR_REPO_NAME`):

```bash
git init
git add .
git commit -m "Initial: نظام قوائم والموردين مع Firebase"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

عند الطلب أدخل اسم المستخدم وكلمة مرور GitHub (أو Personal Access Token).

---

## 3. تفعيل GitHub Pages (لإظهار الموقع كموقع ويب)

- من المستودع: **Settings** → **Pages**
- **Source:** Deploy from a branch
- **Branch:** main → / (root) → Save

الرابط سيكون: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`
