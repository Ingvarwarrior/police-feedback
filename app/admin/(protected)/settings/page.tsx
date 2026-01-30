import { checkPermission } from "@/lib/auth-utils"
import { getSettings } from "./actions/settingsActions"
import SettingsForm from "./SettingsForm"

export default async function SettingsPage() {
    await checkPermission("permManageSettings", true)

    const settings = await getSettings()

    return (
        <div className="pb-12">
            <SettingsForm initialSettings={settings} />
        </div>
    )
}
