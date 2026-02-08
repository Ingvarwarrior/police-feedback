"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "")

export async function analyzeRecordImageAction(base64Image: string) {
    if (!process.env.GOOGLE_AI_API_KEY) {
        throw new Error("GOOGLE_AI_API_KEY не налаштовано в .env")
    }

    try {
        // Try multiple model strings that might work depending on regional availability/API version
        const modelNames = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash-001", "gemini-1.5-flash-002"]
        let lastError = null

        for (const modelName of modelNames) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName })
                const prompt = `
                Ти — висококваліфікований помічник поліцейського, спеціаліст з OCR. 
                Перед тобою сторінка "РАПОРТ" або витяг з системи ІПНП (Фабула ЄО).
                Твоє завдання — витягнути дані з конкретних розділів документа та повернути їх у форматі JSON.

                ІНСТРУКЦІЇ З ЕКСТРАКЦІЇ:
                1. eoNumber: Шукай номер ЄО. Він зазвичай у розділі "Документ" (напр. "ЄО №236") або у кутовому штампі "ЗАРЕЄСТРОВАНО... №236". Витягни ТІЛЬКИ число.
                2. eoDate: Шукай дату реєстрації ЄО поруч із номером. Формат у документі зазвичай "23.01.2026". Перетвори її в ISO 8601 (YYYY-MM-DD).
                3. description: Це заголовок події. Шукай його в розділі "Подія 102" або "Фабула ЄО" одразу під номером події. Зазвичай це текст ВЕЛИКИМИ ЛІТЕРАМИ (напр. "ІНШІ СКАРГИ НА ПОЛІЦЕЙСЬКИХ").
                4. applicant: Шукай у розділі "Заявник". Витягни ПІБ повністю (напр. "ГЕРАСИМЧУК ЄВГЕН АНАТОЛІЙОВИЧ") та номер телефону, якщо він є.
                5. address: Шукай у розділі "Місце скоєння" або "адреса проживання" у блоці заявника. Витягни фактичну адресу події.
                6. category: Визнач коротку категорію на основі опису (напр. "Скарга", "ДТП", "Адмінправопорушення"). Якщо в полі "description" вже є назва категорії (напр. "ІНШІ СКАРГИ..."), використовуй її.

                ДОДАТКОВІ ПРАВИЛА:
                - Якщо текст розмитий або нечіткий, спробуй розпізнати контекстуально.
                - Якщо поле відсутнє, залиш порожній рядок.
                - Поверни ТІЛЬКИ чистий JSON.

                JSON STRUCTURE:
                {
                  "eoNumber": "",
                  "eoDate": "",
                  "description": "",
                  "applicant": "",
                  "address": "",
                  "category": ""
                }
                `

                const base64Data = base64Image.split(",")[1] || base64Image

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
                    usedModel: modelName
                }
            } catch (e: any) {
                console.warn(`Model ${modelName} failed:`, e.message)
                lastError = e
                // If it's not a 404, maybe it's a real error we should stop at
                // but usually 404 means "try another name"
                continue
            }
        }

        throw lastError || new Error("Всі спроби підключитися до ШІ провалилися")

    } catch (error: any) {
        console.error("AI Analysis error:", error)
        return {
            success: false,
            error: error.message || "Помилка при роботі з ШІ"
        }
    }
}
