'use client'

import React from 'react'
import Link from 'next/link'
import { FileText, Lock, MapPin, Star, ArrowRight, CheckCircle2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSurveyStore } from '@/lib/store'
import SiteHeader from '@/components/layout/SiteHeader'
import SiteFooter from '@/components/layout/SiteFooter'

export default function LandingPage() {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <SiteHeader />

            <main className="flex-1 pt-16">
                {/* Hero Section */}
                <section className="relative overflow-hidden bg-primary py-16 sm:py-24 md:py-32">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-10"></div>
                    <div className="max-w-7xl mx-auto px-4 relative z-10 text-center md:text-left">
                        <div className="max-w-3xl mx-auto md:mx-0">
                            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white leading-tight mb-4 sm:mb-6 uppercase italic">
                                ВАШ ВІДГУК <br className="hidden sm:block" />
                                <span className="text-accent underline decoration-4 underline-offset-8">ФОРМУЄ ДОВІРУ</span>
                            </h1>
                            <p className="text-lg sm:text-xl text-slate-200 mb-8 sm:mb-10 leading-relaxed font-medium px-2 sm:px-0">
                                Допоможіть нам стати кращими. Оцініть якість роботи патрулів Хмільницького району за 2 хвилини. Анонімно, безпечно та важливо.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                                <Button
                                    size="lg"
                                    onClick={() => {
                                        useSurveyStore.getState().resetSurvey();
                                        window.location.href = '/survey';
                                    }}
                                    className="w-full sm:w-auto bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-slate-900 font-black px-10 h-14 text-lg rounded-xl shadow-2xl shadow-yellow-500/50 group uppercase tracking-wide border-2 border-yellow-300 hover:scale-105 transition-all"
                                >
                                    Почати опитування
                                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>

                            {/* Legal Notice Backdrop */}
                            <div className="mt-12 p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-slate-200 text-sm max-w-2xl">
                                <div className="flex gap-4">
                                    <div className="p-2 bg-accent/20 rounded-lg h-fit">
                                        <Info className="w-5 h-5 text-accent" />
                                    </div>
                                    <div className="space-y-4 leading-relaxed">
                                        <div className="space-y-1">
                                            <p className="font-bold text-white uppercase tracking-wider text-xs">Важливе застереження</p>
                                            <p>
                                                Це опитування <span className="font-bold text-white underline decoration-accent">не є формою офіційного звернення</span>.
                                                У разі небезпеки негайно телефонуйте <span className="text-white font-black underline decoration-2 decoration-accent">102</span>.
                                            </p>
                                        </div>

                                        <div className="pt-6 border-t border-white/10 space-y-4">
                                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-accent">Офіційні канали для звернень:</p>
                                            <div className="grid grid-cols-1 gap-3">
                                                {[
                                                    { name: 'Електронне звернення НПУ', url: 'https://npu.gov.ua/onlajn-zvernennya', icon: '👮' },
                                                    { name: 'Електронне звернення МВС', url: 'https://mvs.gov.ua/work-with-citizens/elektronni-zvernennya-gromadyan', icon: '🏛️' },
                                                    { name: 'Електронне звернення Департамент патрульної поліції', url: 'https://patrolpolice.gov.ua/zapit/', icon: '🛡️' },
                                                    { name: 'Урядовий контактний центр', url: 'https://ukc.gov.ua/appeal/', icon: '📞' }
                                                ].map((link, i) => (
                                                    <a
                                                        key={i}
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/5 transition-all group"
                                                    >
                                                        <span className="text-xl group-hover:scale-110 transition-transform">{link.icon}</span>
                                                        <span className="text-white font-extrabold text-[13px] leading-tight group-hover:text-accent transition-colors">{link.name}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="hidden lg:block absolute right-[10%] top-1/2 -translate-y-1/2">
                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-3xl shadow-2xl space-y-8 min-w-[300px]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-accent rounded-2xl text-white">
                                    <Lock className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-white font-bold">100% Приватність</p>
                                    <p className="text-slate-300 text-sm">Дані захищені законом</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/10 rounded-2xl text-white">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-white font-bold">Офіційний аналіз</p>
                                    <p className="text-slate-300 text-sm">Всі відгуки опрацьовуються</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase">Чому це важливо?</h2>
                            <p className="text-slate-500 max-w-2xl mx-auto">Громадський контроль — це основа сучасної поліції сервісного типу</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                { icon: MapPin, title: "Геолокація події", desc: "Відмічайте місце взаємодії на мапі для виявлення проблемних зон району." },
                                { icon: Star, title: "Професійність", desc: "Оцінюйте ввічливість та дотримання процедур нашими співробітниками." },
                                { icon: CheckCircle2, title: "Швидкість", desc: "Опитування займає менше 2 хвилин вашого часу." }
                            ].map((item, idx) => (
                                <div key={idx} className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-xl transition-shadow group">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm mb-6 group-hover:scale-110 transition-transform">
                                        <item.icon className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                                    <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="py-24 bg-slate-900 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/20 blur-[120px]"></div>
                    <div className="max-w-7xl mx-auto px-4 relative z-10">
                        <div className="bg-slate-800/50 border border-slate-700 p-8 sm:p-16 rounded-[40px] flex flex-col items-center text-center gap-12">
                            <div className="max-w-3xl space-y-6">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 rounded-full text-sm font-bold border border-green-500/20 uppercase tracking-widest">
                                    Безпека перш за все
                                </div>
                                <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">Ваша анонімність — наш пріоритет</h2>
                                <p className="text-slate-400 text-lg leading-relaxed">
                                    Ми автоматично видаляємо метадані (EXIF) з ваших завантажених фотографій. Ваші координати можуть бути заокруглені для захисту приватності. Ми не логуємо вашу реальну IP-адресу.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Recruitment High-Impact Section */}
                <section className="py-24 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary via-indigo-900 to-slate-900"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>

                    <div className="max-w-7xl mx-auto px-4 relative z-10">
                        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-8 sm:p-20 shadow-2xl overflow-hidden relative group">
                            {/* Decorative background glow */}
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/30 blur-[100px] rounded-full group-hover:bg-accent/40 transition-colors"></div>

                            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24 relative z-10">
                                <div className="flex-1 space-y-8 text-center lg:text-left">
                                    <div className="inline-flex items-center gap-3 px-6 py-2 bg-accent text-white rounded-full text-sm font-black uppercase tracking-[0.2em] shadow-lg shadow-accent/20">
                                        <Star className="w-5 h-5 fill-current" />
                                        Кар'єра
                                    </div>
                                    <h2 className="text-4xl sm:text-6xl font-black text-white leading-none tracking-tighter uppercase italic">
                                        Бажаєте приєднатися <br className="hidden sm:block" />
                                        <span className="text-accent underline decoration-8 underline-offset-8">до нашої команди?</span>
                                    </h2>
                                    <p className="text-xl sm:text-2xl text-slate-200 font-medium leading-relaxed max-w-2xl">
                                        Ми будуємо нову поліцію сервісного типу. Якщо ти чесний, сміливий та готовий служити громаді — ми чекаємо саме на тебе.
                                    </p>
                                </div>

                                <div className="w-full lg:w-auto">
                                    <a
                                        href="https://anketa.patrolpolice.gov.ua/index.php?r=newcabinet/register"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                    >
                                        <Button size="lg" variant="accent" className="w-full sm:min-w-[300px] h-20 text-xl rounded-2xl shadow-2xl shadow-black/40 group relative overflow-hidden">
                                            <span className="relative z-10 flex items-center justify-center gap-3 uppercase tracking-wider">
                                                Подати анкету
                                                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                                            </span>
                                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        </Button>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    )
}
