import StaticPageLayout from '@/components/layout/StaticPageLayout'
import { Mail, Phone, MapPin } from 'lucide-react'

export default function ContactsPage() {
    return (
        <StaticPageLayout title="Контакти">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {/* Address Card */}
                <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group">
                    <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                        <MapPin className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black uppercase text-slate-900 mb-4 italic tracking-tight">Адреса</h3>
                    <div className="space-y-2 text-slate-600 font-medium leading-relaxed">
                        <p className="text-slate-900 font-bold">пров. Кондрацького, 1А, м. Козятин,</p>
                        <p>Хмільницький р-н., Вінницька обл., 22100.</p>
                        <div className="pt-4 border-t border-slate-100 mt-4 text-xs font-bold uppercase tracking-widest text-primary/60">
                            Батальйон патрульної поліції з обслуговування Хмільницького району УПП у Вінницькій області ДПП
                        </div>
                    </div>
                </div>

                {/* Phone Card */}
                <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group">
                    <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                        <Phone className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black uppercase text-slate-900 mb-4 italic tracking-tight">Телефон</h3>
                    <div className="space-y-1">
                        <a href="tel:0434227100" className="text-2xl font-black text-primary hover:underline tracking-tighter">
                            (04342) 2-71-00
                        </a>
                        <p className="text-slate-500 font-medium">Чергова частина (цілодобово)</p>
                    </div>
                </div>

                {/* Email Card */}
                <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group">
                    <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                        <Mail className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black uppercase text-slate-900 mb-4 italic tracking-tight">Електронна пошта</h3>
                    <div className="space-y-1">
                        <a href="mailto:kozyatyn@patrol.police.gov.ua" className="text-lg font-bold text-primary hover:underline break-all">
                            kozyatyn@patrol.police.gov.ua
                        </a>
                        <p className="text-slate-500 font-medium">Для офіційного листування</p>
                    </div>
                </div>
            </div>
        </StaticPageLayout>
    )
}
