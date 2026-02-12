'use client'

import { useState } from "react"
import { toast } from "sonner"
import { QRCodeSVG } from "qrcode.react"
import { ShieldCheck, Loader2, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { confirmTwoFactorSetup, disableTwoFactor, startTwoFactorSetup } from "./actions/profileActions"

interface TwoFactorSettingsProps {
    enabled: boolean
    enabledAt: string | null
    globallyEnabled: boolean
}

export default function TwoFactorSettings({ enabled, enabledAt, globallyEnabled }: TwoFactorSettingsProps) {
    const [isEnabled, setIsEnabled] = useState(enabled)
    const [setupLoading, setSetupLoading] = useState(false)
    const [confirmLoading, setConfirmLoading] = useState(false)
    const [disableLoading, setDisableLoading] = useState(false)
    const [otpauthUrl, setOtpauthUrl] = useState("")
    const [manualSecret, setManualSecret] = useState("")
    const [otpCode, setOtpCode] = useState("")
    const [currentPassword, setCurrentPassword] = useState("")

    const handleStartSetup = async () => {
        setSetupLoading(true)
        try {
            const result = await startTwoFactorSetup()
            if (result?.error) {
                toast.error(result.error)
                return
            }

            setOtpauthUrl(result.otpauthUrl || "")
            setManualSecret(result.secret || "")
            toast.success("QR-код згенеровано. Скануйте його в Google Authenticator.")
        } catch (error) {
            toast.error("Не вдалося згенерувати QR-код")
        } finally {
            setSetupLoading(false)
        }
    }

    const handleConfirm = async () => {
        setConfirmLoading(true)
        try {
            const result = await confirmTwoFactorSetup(otpCode)
            if (result?.error) {
                toast.error(result.error)
                return
            }

            setIsEnabled(true)
            setOtpauthUrl("")
            setManualSecret("")
            setOtpCode("")
            toast.success("2FA увімкнено")
            window.location.reload()
        } catch (error) {
            toast.error("Не вдалося підтвердити код")
        } finally {
            setConfirmLoading(false)
        }
    }

    const handleDisable = async () => {
        setDisableLoading(true)
        try {
            const result = await disableTwoFactor(currentPassword)
            if (result?.error) {
                toast.error(result.error)
                return
            }

            setIsEnabled(false)
            setCurrentPassword("")
            toast.success("2FA вимкнено")
            window.location.reload()
        } catch (error) {
            toast.error("Не вдалося вимкнути 2FA")
        } finally {
            setDisableLoading(false)
        }
    }

    if (!globallyEnabled) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Двофакторна автентифікація наразі вимкнена в конфігурації системи.
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                    Статус: {isEnabled ? "Увімкнено" : "Вимкнено"}
                </p>
                {enabledAt && isEnabled ? (
                    <p className="text-xs text-slate-500 mt-1">Активовано: {enabledAt}</p>
                ) : null}
            </div>

            {!isEnabled && (
                <div className="space-y-4">
                    <Button
                        type="button"
                        onClick={handleStartSetup}
                        disabled={setupLoading}
                        className="w-full rounded-xl h-11 font-bold uppercase tracking-wide"
                    >
                        {setupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                        Згенерувати QR для Google Authenticator
                    </Button>

                    {otpauthUrl && (
                        <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                            <div className="flex justify-center rounded-xl bg-white p-4">
                                <QRCodeSVG value={otpauthUrl} size={180} />
                            </div>
                            <div>
                                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Секрет (ручне введення)</Label>
                                <Input value={manualSecret} readOnly className="mt-1 font-mono tracking-wide" />
                            </div>
                            <div>
                                <Label htmlFor="totp-code" className="text-xs font-black uppercase tracking-widest text-slate-400">Код підтвердження</Label>
                                <Input
                                    id="totp-code"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="6 цифр"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    className="mt-1 tracking-[0.3em]"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleConfirm}
                                disabled={confirmLoading}
                                className="w-full rounded-xl h-11 font-semibold"
                            >
                                {confirmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                                Підтвердити та увімкнути 2FA
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {isEnabled && (
                <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <Label htmlFor="disable-2fa-password" className="text-xs font-black uppercase tracking-widest text-red-500">
                        Поточний пароль для вимкнення 2FA
                    </Label>
                    <Input
                        id="disable-2fa-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Введіть пароль"
                        className="bg-white"
                    />
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDisable}
                        disabled={disableLoading}
                        className="w-full rounded-xl h-11 font-semibold"
                    >
                        {disableLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Вимкнути 2FA
                    </Button>
                </div>
            )}
        </div>
    )
}
