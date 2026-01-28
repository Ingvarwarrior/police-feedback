import StaticPageLayout from '@/components/layout/StaticPageLayout'

export default function TermsPage() {
    return (
        <StaticPageLayout title="Правила використання">
            <p className="mb-6">
                Користуючись цією системою, ви погоджуєтесь з наступними правилами:
            </p>
            <ul className="list-disc pl-6 space-y-4 mb-6">
                <li>Ви зобов'язуєтесь надавати правдиву інформацію про події.</li>
                <li>Забороняється використовувати систему для надання завідомо неправдивих повідомлень.</li>
                <li>Система не призначена для екстрених викликів. У разі надзвичайної ситуації завжди телефонуйте 102.</li>
                <li>Ми залишаємо за собою право ігнорувати відгуки, що містять нецензурну лексику або погрози.</li>
            </ul>
            <p className="mt-8 font-black text-primary uppercase italic">
                Дякуємо за вашу активну громадянську позицію!
            </p>
        </StaticPageLayout>
    )
}
