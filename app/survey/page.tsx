import SurveyWizard from '@/components/survey/SurveyWizard'
import { getGlobalSettings } from '@/lib/system-settings'

export const dynamic = 'force-dynamic'

export default async function SurveyPage() {
    const settings = await getGlobalSettings()

    return (
        <div className="flex flex-col min-h-screen bg-primary">
            <main className="flex-1 pt-0 flex flex-col h-dvh overflow-y-auto">
                <SurveyWizard
                    unitName={settings.unitName}
                    emergencyPhone={settings.emergencyPhone}
                    welcomeMessage={settings.welcomeMessage}
                    unitAddress={settings.unitAddress}
                />
            </main>
        </div>
    )
}
