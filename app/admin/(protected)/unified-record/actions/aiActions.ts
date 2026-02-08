"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"
import OpenAI from "openai"

// Don't initialize outside to ensure we pick up the latest process.env
export async function analyzeRecordImageAction(base64Image: string) {
    const googleKey = process.env.GOOGLE_AI_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    const prompt = `
    Ти — висококваліфікований помічник поліцейського, спеціаліст з OCR та аналізу документів. 
    Перед тобою сторінка "РАПОРТ" або витяг з системи ІПНП (Фабула ЄО).
    Твоє завдання — витягнути дані з конкретних розділів документа та повернути їх у форматі JSON.

    ІНСТРУКЦІЇ З ЕКСТРАКЦІЇ:
    1. eoNumber: Шукай номер ЄО (ТІЛЬКИ цифри).
    2. eoDate: Дата реєстрації в форматі YYYY-MM-DD.
    3. description: Короткий заголовок (ЗАЗВИЧАЙ ВЕЛИКИМИ ЛІТЕРАМИ). ПИШИ ВЕРИФІКОВАНО, ЯК У ТЕКСТІ.
    4. content: ПОВНИЙ зміст. ПРАВИЛО: Очищуй текст від випадкових переносів рядків у середині речень, виправляй подвійні пробіли, але НЕ змінюй слова. Текст має бути цілісним абзацом.
    5. applicant: ПІБ ТА ТЕЛЕФОН. КРИТИЧНО: Перевіряй кожну літеру в прізвищі, не "виправляй" їх на свій розсуд, пиши ТІЛЬКИ те, що бачиш.
    6. address: Фактична адреса події.
    7. category: Коротка категорія.

    ДОДАТКОВІ ПРАВИЛА:
    - Мова документа: УКРАЇНСЬКА. Звертай увагу на літери "і", "ї", "є", "ґ". Не плутай їх з російськими.
    - Якщо текст розмитий, роби найкраще припущення на основі контексту, але не галюцинуй.
    - Поверни ТІЛЬКИ чистий JSON.

    JSON STRUCTURE:
    {
      "eoNumber": "",
      "eoDate": "",
      "description": "",
      "content": "",
      "applicant": "",
      "address": "",
      "category": ""
    }
    `

    const base64Data = base64Image.split(",")[1] || base64Image
    let errors: string[] = []

    // --- Try Google Gemini ---
    if (googleKey) {
        const genAI = new GoogleGenerativeAI(googleKey)
        const modelNames = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-latest"]

        for (const modelName of modelNames) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName })
                const result = await model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: "image/jpeg"
                        }
                    }
                ])

                const response = await result.response
                const text = response.text().trim()
                const jsonMatch = text.match(/\{[\s\S]*\}/)
                const jsonString = jsonMatch ? jsonMatch[0] : text

                const parsedData = JSON.parse(jsonString)
                return {
                    success: true,
                    data: parsedData,
                    usedProvider: "Gemini",
                    usedModel: modelName
                }
            } catch (e: any) {
                const msg = e.message || "Unknown error"
                console.warn(`Gemini (${modelName}) failed:`, msg)

                // If quota exceeded, don't bother with other Gemini models
                if (msg.includes("429") || msg.includes("quota")) {
                    errors.push(`Gemini: Перевищено ліміт запитів (Quota Exceeded)`)
                    break
                }
                errors.push(`Gemini (${modelName}): ${msg.substring(0, 50)}...`)
            }
        }
    } else {
        errors.push("Gemini: Ключ відсутній")
    }

    // --- Try SiliconFlow (Very cheap alternative) ---
    const siliconKey = process.env.SILICONFLOW_API_KEY
    if (siliconKey) {
        try {
            const sf = new OpenAI({
                apiKey: siliconKey,
                baseURL: "https://api.siliconflow.cn/v1"
            })
            const response = await sf.chat.completions.create({
                model: "Qwen/Qwen2-VL-7B-Instruct", // Excellent and very cheap OCR
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Data}`,
                                },
                            },
                        ],
                    },
                ],
                response_format: { type: "json_object" },
            })

            const content = response.choices[0].message.content
            if (content) {
                const parsedData = JSON.parse(content)
                return {
                    success: true,
                    data: parsedData,
                    usedProvider: "SiliconFlow",
                    usedModel: "Qwen2-VL-7B"
                }
            }
        } catch (e: any) {
            console.warn("SiliconFlow failed:", e.message)
            errors.push(`SiliconFlow: ${e.message.substring(0, 50)}...`)
        }
    }

    // --- Try OpenAI fallback ---
    if (openaiKey) {
        try {
            const openai = new OpenAI({ apiKey: openaiKey })
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Data}`,
                                },
                            },
                        ],
                    },
                ],
                response_format: { type: "json_object" },
            })

            const content = response.choices[0].message.content
            if (content) {
                const parsedData = JSON.parse(content)
                return {
                    success: true,
                    data: parsedData,
                    usedProvider: "OpenAI",
                    usedModel: "gpt-4o-mini"
                }
            }
        } catch (e: any) {
            console.error("OpenAI failed:", e.message)
            errors.push(`OpenAI: ${e.message.includes("insufficient_quota") ? "Недостатньо коштів на балансі" : e.message.substring(0, 100)}`)
        }
    } else {
        errors.push("OpenAI: Ключ відсутній")
    }

    return {
        success: false,
        error: errors.join(" | ")
    }
}
