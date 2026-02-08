"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"

// Don't initialize outside to ensure we pick up the latest process.env
export async function analyzeRecordImageAction(base64Image: string) {
    const googleKey = process.env.GOOGLE_AI_API_KEY

    const prompt = `
    Ти — висококваліфікований помічник поліцейського, спеціаліст з OCR та аналізу українських службових документів. 
    Перед тобою сторінка "РАПОРТ" або витяг з системи ІПНП (Фабула ЄО).
    Твоє завдання — максимально точно витягнути дані та повернути їх у форматі JSON.

    ІНСТРУКЦІЇ З ЕКСТРАКЦІЇ:
    1. eoNumber: Номер ЄО. Шукай у рядку "Документ" (напр. "ЄО №236 від..."), "Фабула ЄО" або у верхній частині документа. Пріоритет віддавай короткому номеру після знака № (напр. "236"), а не довгому цифровому коду події 102. Витягни ТІЛЬКИ цифри.
    2. eoDate: Дата реєстрації поруч із номером. Формат: YYYY-MM-DD.
    3. description: Короткий заголовок події. Шукай текст ВЕЛИКИМИ ЛІТЕРАМИ у розділі "Подія 102" або "Фабула". (Напр. "ІНШІ СКАРГИ НА ПОЛІЦЕЙСЬКИХ"). БЕЗ ДЕТАЛЬНОГО ОПИСУ.
    4. applicant: Шукай у розділі "Заявник". Витягни ПІБ повністю та номер телефону (якщо є).
    5. address: Місце події або адреса проживання заявника. 
    6. category: Визнач коротку логічну категорію (Скарги, ДТП, Крадіжка тощо).

    КРИТИЧНІ ПРАВИЛА:
    - Мова документа: УКРАЇНСЬКА. Звертай особливу увагу на літери "і", "ї", "є", "ґ".
    - Якщо текст розмитий, роби логічне припущення, але не вигадуй дані.
    - Поверни ТІЛЬКИ чистий JSON без жодних додаткових пояснень.
    - Якщо поле абсолютно неможливо знайти, залиш його порожнім.

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
    let errors: string[] = []

    // --- Try Google Gemini ---
    if (googleKey) {
        const genAI = new GoogleGenerativeAI(googleKey)
        // Order: Flash for speed/cost, Pro if available for better quality
        const modelNames = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]

        for (const modelName of modelNames) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        responseMimeType: "application/json",
                    }
                })

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

                // If quota exceeded or specific error that makes retry useless
                if (msg.includes("429") || msg.includes("quota")) {
                    errors.push(`Gemini: Перевищено ліміт запитів (Quota Exceeded). Будь ласка, зачекайте хвилину.`)
                    break
                }
                errors.push(`${modelName}: ${msg.substring(0, 50)}...`)
            }
        }
    } else {
        errors.push("Gemini: Ключ відсутній (GOOGLE_AI_API_KEY)")
    }

    return {
        success: false,
        error: errors.join(" | ")
    }
}
