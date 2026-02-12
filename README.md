# Police Feedback System

Сучасний веб-застосунок для збору та аналізу відгуків громадян про роботу патрульної поліції.

## Технології

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: SQLite (Development) / Prisma ORM
- **Auth**: NextAuth.js (v5 Beta)
- **UI Components**: Radix UI, Lucide React, Framer Motion

## Вимоги

- Node.js 18+
- npm 9+

## Встановлення та запуск

1. **Клонування репозиторію:**
   ```bash
   git clone <repository-url>
   cd police-feedback
   ```

2. **Встановлення залежностей:**
   ```bash
   npm install
   ```

3. **Налаштування змінних оточення:**
   Створіть файл `.env` в корені проєкту та додайте необхідні змінні (див. `.env.example` якщо є, або використовуйте змінні за замовчуванням для розробки).
   
   Приклад `.env`:
   ```env
   DATABASE_URL="file:./dev.db"
   AUTH_SECRET="your-secret-key"
   ENABLE_2FA=false
   TWO_FACTOR_ENCRYPTION_KEY="дуже-довгий-випадковий-рядок"
   ```

   `ENABLE_2FA=true` вмикає двофакторний вхід (Google Authenticator) для користувачів, у яких 2FA активовано в профілі.

4. **Підготовка бази даних:**
   ```bash
   npx prisma generate
   npx prisma db push
   # Опціонально: заповнення тестовими даними
   npm run prisma:seed 
   ```

5. **Запуск режиму розробки:**
   ```bash
   npm run dev
   ```
   Відкрийте [http://localhost:3000](http://localhost:3000) у вашому браузері.

## Структура проєкту

- `/app` - Сторінки та API маршрути (Next.js App Router)
  - `/admin` - Адмін-панель (захищена)
  - `/survey` - Публічна сторінка опитування
- `/components` - React компоненти
- `/lib` - Утиліти та конфігурації (Prisma, Utils)
- `/prisma` - Схема бази даних та міграції

---

## Налаштування сповіщень (SMTP)

Для того, щоб інспектори отримували сповіщення про нові відгуки, додайте наступні змінні у файл `.env` на сервері:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER="ваша-пошта@gmail.com"
SMTP_PASS="пароль-додатка-гугл"
SMTP_FROM="\"Police Feedback\" <ваша-пошта@gmail.com>"
ADMIN_NOTIFICATION_EMAIL="куди-надсилати@gmail.com" # (для застарілих функцій)
NEXT_PUBLIC_APP_URL="https://ваш-домен.com"
```

## Ліцензія

Proprietary / Internal Use Only
