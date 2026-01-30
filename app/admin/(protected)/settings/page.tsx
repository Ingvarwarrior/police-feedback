```typescript
import { checkPermission } from "@/lib/auth-utils"
import { getSettings } from "./actions/settingsActions"
import SettingsForm from "./SettingsForm"

export default async function SettingsPage() {
    try {
        await checkPermission("permManageSettings", true)
        const settings = await getSettings()

        return (
            <div className="pb-12">
                <SettingsForm initialSettings={settings} />
            </div>
        )
    } catch (error: any) {
        return (
            <div className="p-8 bg-red-50 border border-red-200 rounded-3xl">
                <h2 className="text-red-900 font-black uppercase mb-2">Помилка завантаження</h2>
                <p className="text-red-700 text-sm">{error.message}</p>
                <div className="mt-4 p-4 bg-white/50 rounded-xl font-mono text-xs overflow-auto max-h-40">
                    {String(error)}
                </div>
            </div>
        )
    }
}
```
