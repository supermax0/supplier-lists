# قوائم — نظام إدارة القوائم والموردين

تطبيق ويب لإدارة الموردين وقوائم الشراء والدفعات، مع دعم العملتين (دينار عراقي / دولار).

## المميزات

- لوحة تحكم بإحصائيات (موردين، قوائم، إجمالي صافي، مدفوع، دولار)
- إضافة وعرض الموردين مع الرصيد الافتتاحي والدفعات
- إضافة قوائم شراء مع منتجات وسعر وكمية
- تفاصيل كل مورد: القوائم والدفعات مع طباعة
- تفاصيل كل قائمة مع صورة وطباعة
- دفع جزئي على القوائم ودفع مباشر للمورد
- بحث في الموردين والقوائم والحركات
- تخزين البيانات في **Firebase Realtime Database**
- تخزين صور القوائم في **Firebase Storage**
- واجهة متجاوبة مع RTL ودعم الموبايل

## التقنيات

- HTML, CSS, JavaScript
- Firebase (Realtime Database, Storage, Analytics)

## التشغيل محلياً

1. افتح المجلد وافتح `index.html` في المتصفح، أو
2. شغّل خادم محلي، مثلاً:
   ```bash
   npx serve .
   ```
   ثم افتح الرابط المعروض.

## النشر على GitHub

### 1. إنشاء مستودع جديد على GitHub

1. اذهب إلى [github.com/new](https://github.com/new)
2. اختر اسماً للمستودع (مثلاً `supplier-lists` أو `قوائم`)
3. اختر **Public**
4. **لا** تختر "Add a README" — سنرفع الملفات من جهازك
5. اضغط **Create repository**

### 2. رفع المشروع من جهازك

افتح **Terminal** أو **PowerShell** في مجلد المشروع ثم نفّذ:

```bash
git init
git add .
git commit -m "Initial commit: نظام قوائم والموردين مع Firebase"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

استبدل `YOUR_USERNAME` باسم مستخدمك على GitHub و`YOUR_REPO_NAME` باسم المستودع.

### 3. تفعيل GitHub Pages (اختياري)

لنشر الموقع كصفحة ويب:

1. من صفحة المستودع على GitHub: **Settings** → **Pages**
2. تحت **Source** اختر **Deploy from a branch**
3. اختر الفرع **main** والمجلد **/ (root)**
4. احفظ — بعد دقائق سيكون الموقع متاحاً على:
   `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

## إعداد Firebase

- أنشئ مشروعاً في [Firebase Console](https://console.firebase.google.com)
- فعّل **Realtime Database** و **Storage** و **Analytics**
- ضع إعدادات المشروع في `firebase-config.js` (أو استخدم البيئة الحالية)
- اضبط **Database Rules** و **Storage Rules** من لوحة Firebase حسب احتياجك

## الترخيص

استخدام حر لأغراض شخصية أو تعليمية.
