export async function sendNewReportEmail(report: any) {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@example.com';

    console.log(`[MAIL] Sending notification to ${adminEmail} for report ${report.id}`);

    const subject = `Новий відгук: ${report.rateOverall}/5 - ${report.districtOrCity || 'Локація не вказана'}`;
    const text = `
        Отримано новий відгук у системі моніторингу.
        
        ID: ${report.id}
        Оцінка: ${report.rateOverall}/5
        Район: ${report.districtOrCity || 'Не вказано'}
        Коментар: ${report.comment || 'Без коментаря'}
        
        Переглянути в адмінці: ${process.env.NEXT_PUBLIC_APP_URL}/admin/reports/${report.id}
    `.trim();

    // In a real environment, you'd use nodemailer here:
    // const transporter = nodemailer.createTransport(...)
    // await transporter.sendMail({ from, to: adminEmail, subject, text })

    console.log(`[MAIL CONTENT]:\n${text}`);

    return true;
}
