'use client'

import React from 'react'
import { format } from 'date-fns'
import { uk } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface ResolutionPrintProps {
    record: {
        eoNumber: string
        assignedAt: Date | string | null
        assignedUser?: {
            firstName: string | null
            lastName: string | null
        } | null
    }
    chiefName?: string
}

export default function ResolutionPrint({ record, chiefName = "Ігор ЗДРАВКОВ" }: ResolutionPrintProps) {
    const assignedDate = record.assignedAt ? new Date(record.assignedAt) : new Date()
    const inspectorName = record.assignedUser
        ? `${record.assignedUser.lastName} ${record.assignedUser.firstName}`.toUpperCase()
        : "___________________________"

    return (
        <div className="resolution-print-container bg-white p-8 text-black font-sans leading-tight print:p-0" style={{ width: '100%', maxWidth: '14.8cm' }}>
            <div className="flex flex-col border-2 border-black p-4 min-h-[10cm] relative">
                {/* Header Section */}
                <div className="text-center font-black text-[12px] uppercase mb-8 leading-tight">
                    НАЧАЛЬНИК ВІДДІЛЕННЯ МОНІТОРИНГУ ТА<br />
                    АНАЛІТИЧНОГО ЗАБЕЗПЕЧЕННЯ БАТАЛЬЙОНУ<br />
                    ПАТРУЛЬНОЇ ПОЛІЦІЇ З ОБСЛУГОВУВАННЯ<br />
                    ХМІЛЬНИЦЬКОГО РАЙОНУ УПРАВЛІННЯ ПАТРУЛЬНОЇ<br />
                    ПОЛІЦІЇ У ВІННИЦЬКІЙ ОБЛАСТІ<br />
                    ДЕПАРТАМЕНТУ ПАТРУЛЬНОЇ ПОЛІЦІЇ
                </div>

                {/* Inspector Section */}
                <div className="flex items-start gap-4 mb-8">
                    <span className="font-black text-[14px]">П.</span>
                    <div className="flex-1 border-b-2 border-black pb-1">
                        <span className="font-black text-[14px] uppercase">{inspectorName}</span>
                    </div>
                </div>

                {/* Instruction Section */}
                <div className="text-[13px] font-bold italic mb-12">
                    Розглянути відповідно до вимог ЗУ «Про звернення громадян» та<br />
                    Наказу МВС України від 15.11.2017 р. № 930
                </div>

                {/* Footer Section */}
                <div className="mt-auto">
                    <div className="flex justify-between items-end">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[14px] font-black">{format(assignedDate, 'dd', { locale: uk })}</span>
                                <span className="text-[14px] font-black border-b border-black px-4">{format(assignedDate, 'MMMM', { locale: uk })}</span>
                                <span className="text-[14px] font-black">{format(assignedDate, 'yyyy', { locale: uk })} р.</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[14px] font-black">До №</span>
                                <span className="text-[14px] font-black border-b border-black min-w-[120px] text-center">{record.eoNumber}</span>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="font-black text-[16px] uppercase tracking-tighter">
                                {chiefName}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: A5 landscape;
                        margin: 0;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .resolution-print-container, .resolution-print-container * {
                        visibility: visible;
                    }
                    .resolution-print-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                    }
                }
            `}</style>
        </div>
    )
}
