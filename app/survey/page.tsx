import SurveyWizard from '@/components/survey/SurveyWizard'


export default function SurveyPage() {
    return (
        <div className="flex flex-col min-h-screen bg-primary">
            <main className="flex-1 pt-0 flex flex-col h-dvh overflow-y-auto">
                <SurveyWizard />
            </main>
        </div>
    )
}
