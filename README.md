# Jome Forms

سامانه محلی و فارسی برای مدیریت پرونده‌ها، فرم‌ها و اسناد املاک.

رابط کاربری از فونت Vazirmatn به‌صورت محلی استفاده می‌کند؛ فایل WOFF2 برای مرورگرهای جدید و TTF به‌عنوان جایگزین در `src/assets/fonts/` قرار دارد. فونت تحت مجوز SIL Open Font License است و متن مجوز همراه فایل‌ها نگهداری می‌شود.

## ساختار

- `src/` — رابط کاربری React + Vite. به‌صورت پیش‌فرض داده‌ها محلی (local-first) ذخیره می‌شوند.
- `backend/` — API با Express + PostgreSQL؛ راهنمای کامل در [backend/README.md](backend/README.md) و مستندات API در `/api/docs`.
- `docker-compose.yml` — اجرای کامل سامانه (وب + API + PostgreSQL) با یک فرمان.

## اجرا با Docker

```bash
cp docker/.env.example docker/.env
# مقدار JWT_SECRET و POSTGRES_PASSWORD را در docker/.env عوض کنید
npm run docker:up          # معادل: docker compose --env-file docker/.env up -d --build
```

- رابط کاربری: <http://localhost:8080>
- API و مستندات: <http://localhost:4000/api/docs>
- کانتینر وب در حالت سروری ساخته می‌شود (`VITE_API_MODE=server`) و درخواست‌های `/api` را به سرویس API می‌فرستد؛ حالت محلی همچنان با `npm run dev` در دسترس است.
- ساخت اولین مدیر ارشد (یک‌بار): `npm run docker:seed`

`PUBLIC_ORIGIN` را برابر آدرسی بگذارید که کاربر در مرورگر باز می‌کند؛ این مقدار برای CORS و
کوکی نشست استفاده می‌شود. در محیط واقعی پشت HTTPS مقدار `COOKIE_SECURE=true` را فعال کنید.
دستورهای `npm run docker:logs`، `npm run docker:down` و `npm run docker:reset` (حذف داده‌ها) نیز موجود است.

## اجرای محلی بدون Docker

```bash
npm install && npm run dev            # وب :5173
cd backend && npm install && npm run db:migrate && npm run db:seed && npm run dev   # API :4000
```

برای اتصال رابط کاربری به API، فایل `.env.local` را از `.env.example` بسازید و
`VITE_API_MODE=server` را تنظیم کنید (پیش‌فرض: حالت محلی).
