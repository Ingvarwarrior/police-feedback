import nodemailer from 'nodemailer';
import { prisma } from './prisma';

export async function sendNewReportEmail(report: any) {
    // 1.Знайти всіх інспекторів (користувачів, які мають право переглядати звіти)
    const inspectors = await prisma.user.findMany({
        where: {
            active: true,
            email: { not: null },
            permViewReports: true
        },
        select: {
            email: true,
            firstName: true,
            lastName: true
        }
    });

    if (inspectors.length === 0) {
        console.log('[MAIL] No inspectors with email found to notify.');
        return false;
    }

    const recipientEmails = inspectors.map(i => i.email).filter(Boolean) as string[];

    // 2. Налаштування транспорту SMTP
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: process.env.SMTP_SECURE === 'true', // true для 465, false для інших
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const subject = `Новий відгук: ${report.rateOverall}/5 - ${report.districtOrCity || 'Локація не вказана'}`;
    const text = `
Шановні інспектори!

Отримано новий відгук у системі моніторингу.

Деталі:
- ID: ${report.id}
- Оцінка: ${report.rateOverall}/5
- Район/Місто: ${report.districtOrCity || 'Не вказано'}
- Коментар: ${report.comment || 'Без коментаря'}

Переглянути детальний звіт в адмін-панелі:
${process.env.NEXT_PUBLIC_APP_URL}/admin/reports/${report.id}

---
Система оперативного моніторингу
`.trim();

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"Police Feedback" <${process.env.SMTP_USER}>`,
            to: recipientEmails.join(', '), // Відправляємо всім одразу через кому
            subject,
            text,
        });

        console.log(`[MAIL] Successfully sent notification to ${recipientEmails.length} inspectors.`);
        return true;
    } catch (error) {
        console.error('[MAIL] Error sending email:', error);
        return false;
    }
}

export async function sendAssignmentEmail(assignee: any, report: any) {
    if (!assignee.email) return false;

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const subject = `Призначено звіт: #${report.id.slice(-8).toUpperCase()}`;
    const text = `
Шановний(-а) ${assignee.firstName || ''} ${assignee.lastName || ''}!

Вам призначено для опрацювання новий звіт у системі моніторингу.

Деталі звіту:
- ID: ${report.id}
- Локація: ${report.districtOrCity || 'Не вказано'}
- Рейтинг: ${report.rateOverall}/5
- Коментар: ${report.comment || 'Без коментаря'}

Будь ласка, опрацюйте цей звіт в найкоротші терміни:
${process.env.NEXT_PUBLIC_APP_URL}/admin/reports/${report.id}

---
Система оперативного моніторингу
`.trim();

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"Police Feedback" <${process.env.SMTP_USER}>`,
            to: assignee.email,
            subject,
            text,
        });

        console.log(`[MAIL] Assignment notification sent to ${assignee.email}`);
        return true;
    } catch (error) {
        console.error('[MAIL] Error sending assignment email:', error);
        return false;
    }
}
