'use client'

import { useState } from "react"
import { Award, Printer, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LetterGeneratorProps {
    response: any
}

export default function LetterGenerator({ response }: LetterGeneratorProps) {
    const [generating, setGenerating] = useState(false)

    const generateLetter = () => {
        setGenerating(true)

        const letterHTML = `
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>Подяка - ${response.id.slice(-8).toUpperCase()}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 20mm;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            background: white;
            padding: 20px;
        }
        .certificate {
            width: 100%;
            max-width: 277mm;
            height: 190mm;
            margin: 0 auto;
            border: 8px double #1e3a8a;
            padding: 30px;
            position: relative;
            background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
        }
        .inner-border {
            border: 2px solid #3b82f6;
            padding: 25px;
            height: 100%;
            position: relative;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .title {
            font-size: 48px;
            font-weight: 900;
            color: #1e3a8a;
            text-transform: uppercase;
            letter-spacing: 8px;
            margin-bottom: 15px;
        }
        .subtitle {
            font-size: 18px;
            color: #475569;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 3px;
        }
        .content {
            margin: 40px 0;
            text-align: center;
        }
        .intro {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 20px;
            font-style: italic;
        }
        .reference {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 15px 20px;
            margin: 20px auto;
            max-width: 600px;
            text-align: left;
        }
        .reference-title {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 1px;
            margin-bottom: 5px;
        }
        .reference-value {
            font-size: 14px;
            color: #1e293b;
            font-weight: 600;
        }
        .rating {
            display: inline-block;
            background: #fbbf24;
            color: white;
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: 900;
            font-size: 24px;
            margin: 15px 0;
        }
        .comment-box {
            background: #f1f5f9;
            border-radius: 15px;
            padding: 30px;
            margin: 30px auto;
            max-width: 700px;
            border: 1px solid #cbd5e1;
        }
        .comment {
            font-size: 16px;
            line-height: 1.8;
            color: #334155;
            font-style: italic;
            text-align: center;
        }
        .footer {
            position: absolute;
            bottom: 30px;
            left: 30px;
            right: 30px;
            display: flex;
            justify-content: space-between;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
        }
        .footer-item {
            font-size: 11px;
            color: #64748b;
        }
        .footer-label {
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .stamp {
            position: absolute;
            top: 40px;
            right: 40px;
            width: 80px;
            height: 80px;
            border: 3px solid #3b82f6;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #3b82f6;
            font-weight: 700;
            text-align: center;
            transform: rotate(15deg);
            opacity: 0.3;
        }
        @media print {
            body {
                padding: 0;
            }
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="inner-border">
            <div class="stamp">ОФІЦІЙНА<br/>ПОДЯКА</div>
            
            <div class="header">
                <div class="title">ПОДЯКА</div>
                <div class="subtitle">за високу оцінку роботи патрульної поліції</div>
            </div>

            <div class="content">
                <div class="intro">
                    Цей документ засвідчує позитивний відгук громадянина про якість виконання службових обов'язків
                </div>

                <div class="rating">★ ${response.rateOverall} / 5 ★</div>

                <div class="reference">
                    <div class="reference-title">Референс взаємодії</div>
                    <div class="reference-value">#${response.id.slice(-12).toUpperCase()}</div>
                </div>

                <div class="reference">
                    <div class="reference-title">Дата події</div>
                    <div class="reference-value">${response.interactionDate ? new Date(response.interactionDate).toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Не вказано'}</div>
                </div>

                ${response.patrolRef ? `
                <div class="reference">
                    <div class="reference-title">Патруль</div>
                    <div class="reference-value">${response.patrolRef}${response.badgeNumber ? ' (жетон ' + response.badgeNumber + ')' : ''}</div>
                </div>
                ` : ''}

                <div class="comment-box">
                    <div class="comment">
                        "${response.comment || 'Громадянин високо оцінив роботу, але не залишив письмового коментаря.'}"
                    </div>
                </div>
            </div>

            <div class="footer">
                <div class="footer-item">
                    <span class="footer-label">Дата формування:</span><br/>
                    ${new Date().toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div class="footer-item" style="text-align: right;">
                    <span class="footer-label">Система моніторингу якості роботи</span><br/>
                    Батальйон патрульної поліції Хмільницького району
                </div>
            </div>
        </div>
    </div>

    <script>
        window.onload = function() {
            window.print();
        }
    </script>
</body>
</html>
        `

        const printWindow = window.open('', '_blank')
        if (printWindow) {
            printWindow.document.write(letterHTML)
            printWindow.document.close()
        }

        setGenerating(false)
    }

    // Only show for rating >= 4
    if (response.rateOverall < 4) return null

    return (
        <div className="p-6 bg-amber-50 rounded-[2.5rem] border border-amber-200 space-y-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 rounded-xl text-white">
                    <Award className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-amber-900 font-black uppercase tracking-tight italic">Лист подяки</h3>
                    <p className="text-amber-700/70 text-xs font-medium">Роздрукуйте офіційний бланк за високу оцінку</p>
                </div>
            </div>

            <Button
                onClick={generateLetter}
                disabled={generating}
                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-amber-200 transition-all border-none"
            >
                {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <>
                        Роздрукувати лист
                        <Printer className="ml-2 w-4 h-4" />
                    </>
                )}
            </Button>
        </div>
    )
}
