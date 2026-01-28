import StaticPageLayout from '@/components/layout/StaticPageLayout'

export default function PrivacyPage() {
    return (
        <StaticPageLayout title="Політика приватності">
            <p className="mb-6">
                Ваша приватність є нашим головним пріоритетом. Ми розробили цю систему, щоб ви могли залишати відгуки максимально безпечно.
            </p>
            <h2 className="text-2xl font-black text-primary mt-8 mb-4 uppercase italic">1. Анонімність</h2>
            <p className="mb-6">
                Ви маєте повне право подавати відгуки анонімно. Ми не вимагаємо вводу імені або номера телефону, якщо ви самі не забажаєте замовити зворотній зв'язок.
            </p>
            <h2 className="text-2xl font-black text-primary mt-8 mb-4 uppercase italic">2. Метадані та Фото</h2>
            <p className="mb-6">
                Наша система автоматично очищує всі завантажені фотографії від EXIF-метаданих (дані про модель телефону, час та точні координати зйомки), щоб запобігти випадковому розкриттю вашого місцезнаходження.
            </p>
            <h2 className="text-2xl font-black text-primary mt-8 mb-4 uppercase italic">3. Зберігання даних</h2>
            <p className="mb-6">
                Всі дані зберігаються на захищених серверах і використовуються виключно для аналізу якості роботи патрульної поліції та покращення сервісу.
            </p>
        </StaticPageLayout>
    )
}
