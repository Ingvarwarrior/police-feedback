'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { loginAction } from './actions/login'

export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData()
        formData.append('username', username)
        formData.append('password', password)

        try {
            const result = await loginAction(formData)
            if (result?.error) {
                toast.error(result.error)
                setLoading(false)
            }
            // If success, next-auth handles redirect via 'redirectTo' in Server Action
        } catch (error) {
            // NextAuth server actions throw on success to perform redirect
            // If it's not a generic error, it's likely the redirect happening
            if ((error as any).message === 'NEXT_REDIRECT') {
                return
            }
            toast.error("Сталася помилка при вході")
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
            <Card className="max-w-md w-full shadow-2xl border-0 ring-1 ring-slate-200 rounded-3xl">
                <CardHeader className="text-center pt-10 pb-6">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20 animate-in zoom-in duration-500">
                            <ShieldCheck className="w-10 h-10" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-black tracking-tighter uppercase italic text-slate-900">Панель доступу</CardTitle>
                    <CardDescription className="text-slate-500 font-medium pt-1">
                        Система моніторингу Хмільницької поліції
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-3">
                            <Label htmlFor="username" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Логін співробітника</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Логін (напр. inspector_ivan)"
                                className="h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-primary shadow-inner"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="password" title="password_label" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Пароль доступу</Label>
                            <div className="relative group/pass">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    className="h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-primary shadow-inner pr-12"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Авторизуватися"}
                        </Button>
                    </form>

                    <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 text-xs text-amber-800 font-medium">
                        <div className="p-1 bg-amber-200 rounded-lg h-fit">
                            <ShieldCheck className="w-3 h-3" />
                        </div>
                        Заборонено використання особистих облікових записів. Усі дії в системі фіксуються в журналі аудиту.
                    </div>
                </CardContent>
            </Card>
            <div className="fixed bottom-6 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] opacity-50">
                Internal Security Protocol — Alpha-7
            </div>
        </div>
    )
}
