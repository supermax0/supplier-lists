# رفع التحديثات إلى GitHub

## الطريقة السهلة (موصى بها)

**انقر نقراً مزدوجاً على الملف:** `push-to-github.bat`

سيقوم الملف تلقائياً بـ:
- تهيئة Git (إذا لزم الأمر)
- إضافة جميع الملفات
- عمل commit
- رفع التحديثات إلى GitHub

---

## الطريقة اليدوية

افتح **Command Prompt** في مجلد المشروع ثم نفّذ:

```bash
cd "C:\Users\msi\Desktop\قوائم"

git add .

git commit -m "تحسينات: تعديل المورد، تحسين التصميم، Firebase"

git push origin main
```

إذا كان المستودع جديداً أو لم يتم ربطه بعد:

```bash
git init
git branch -M main
git remote add origin https://github.com/supermax0/supplier-lists.git
git push -u origin main
```

---

## ملاحظات

- إذا طُلب منك اسم المستخدم وكلمة المرور، استخدم:
  - **اسم المستخدم:** supermax0
  - **كلمة المرور:** Personal Access Token (ليس كلمة مرور GitHub العادية)
  
  لإنشاء Token: GitHub → Settings → Developer settings → Personal access tokens → Generate new token
