import { getUnifiedRecords } from "./actions/recordActions"
import RecordList from "./components/RecordList"
import ImportDialog from "./components/ImportDialog"
import CreateRecordDialog from "./components/CreateRecordDialog"
import { ClipboardList, Info } from "lucide-react"

export default async function UnifiedRecordPage() {
    const records = await getUnifiedRecords()

    return (
        <div className="space-y-8 pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-slate-900 p-8 md:p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
                    <ClipboardList className="w-48 h-48" />
                </div>

                <div className="space-y-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-xl">
                            <ClipboardList className="w-6 h-6 text-blue-400" />
                        </div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400/80">Центр адміністрування</h2>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic leading-none">
                        Єдиний облік <br />
                        <span className="text-blue-400">& звернення</span>
                    </h1>
                    <p className="max-w-md text-slate-400 font-medium text-sm">
                        Офіційний реєстр подій та звернень громадян для контролю виконавчої дисципліни та класифікації інцидентів.
                    </p>
                </div>

                <div className="flex flex-wrap gap-4 relative z-10">
                    <CreateRecordDialog />
                    <ImportDialog />
                </div>
            </div>

            {/* Info Note */}
            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-3xl flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                    <Info className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-slate-600">
                    Тут відображаються дані, імпортовані з офіційних звітів Excel. Ви можете фільтрувати їх за категорією або шукати за адресою та номером ЄО.
                </p>
            </div>

            {/* Content Section */}
            <RecordList initialRecords={records} />
        </div>
    )
}
