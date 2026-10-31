# سرویس مستقل پنل ادمین POLIFY روی پورت 1000

این پوشه یک Frontend مستقل برای پنل مدیریت است. سرویس روی پورت 1000 اجرا می‌شود و API را از طریق Nginx به Backend فعلی روی پورت 8000 می‌فرستد؛ بنابراین دیتابیس جداگانه‌ای ساخته نمی‌شود.

## پیش‌نیاز مهم
- سرویس Django فعلی باید در Docker Compose در دسترس باشد و API آن روی پورت داخلی 8000 گوش کند.
- نام سرویس Django در نمونه زیر `backend` فرض شده است. اگر نام واقعی سرویس شما متفاوت است، مقدار `BACKEND_UPSTREAM` و `depends_on` را مطابق آن تغییر دهید.
- پنل به مسیرهای `/api/admin/session/`، `/api/admin/system-dashboard/`، `/api/admin/purchases/.../review/` و `/api/admin/withdrawals/.../complete/` نیاز دارد. Backend باید نسخه هماهنگ پنل مدیریت را داشته باشد (فایل `core/admin_dashboard.py` و مسیرهای ادمین در `core/urls.py` از بسته کامل قبلی).

## نصب با Docker Compose
1. این پوشه را در کنار `docker-compose.yml` پروژه با نام `admin-service` قرار دهید.
2. فایل `docker-compose.admin.yml` را کنار Compose اصلی قرار دهید و هر دو فایل را با هم اجرا کنید؛ این فایل فقط سرویس افزوده را تعریف می‌کند.
3. اگر backend اسم دیگری دارد، `BACKEND_UPSTREAM` و `depends_on` را اصلاح کنید.
4. اجرا:
   `docker compose -f docker-compose.yml -f docker-compose.admin.yml up -d --build admin-panel`
5. مشاهده لاگ:
   `docker compose logs -f admin-panel`
6. پنل:
   `http://SERVER_IP:1000`

## شبکه و امنیت
- پورت 1000 باید در فایروال/پنل سرور باز باشد.
- اگر از UFW استفاده می‌کنید: `sudo ufw allow 1000/tcp`
- بهتر است دسترسی پورت 1000 را با IP allowlist محدود کنید یا آن را پشت HTTPS reverse proxy قرار دهید. برای اینترنت عمومی، استفاده از HTTP خام توصیه نمی‌شود.
- ورود همچنان با Google Authenticator و نشست امضاشده Backend انجام می‌شود.
- از آنجا که Nginx مسیر `/api/` را proxy می‌کند، نیازی به فعال‌سازی CORS برای پورت 1000 نیست.

## اجرای بدون Docker (توسعه)
`npm install`
`npm run dev -- --host 0.0.0.0 --port 1000`
در حالت توسعه، برای proxy API باید یک proxy در Vite اضافه کنید یا از نسخه Docker استفاده کنید. روش Docker برای محیط سرور پیشنهاد می‌شود.
