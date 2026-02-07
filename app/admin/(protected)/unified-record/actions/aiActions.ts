"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "")

export async function analyzeRecordImageAction(base64Image: string) {
    if (!process.env.GOOGLE_AI_API_KEY) {
        throw new Error("GOOGLE_AI_API_KEY не налаштовано в .env")
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const prompt = `
        Ти — помічник поліцейського. Перед тобою фотографія картки Єдиного обліку (ЄО) або заяви.
        Твоє завдання — максимально точно витягнути дані з цієї картки та повернути їх у форматі JSON.
        
        Очікувані поля:
        - eoNumber: рядок (тільки число)
        - eoDate: рядок у форматі ISO 8601 (якщо є час, врахуй його, якщо ні — тільки дата)
        - description: опис події або суть звернення
        - applicant: ПІБ заявника
        - address: адреса місця події
        - category: категорія (напр. "Крадіжка", "ДТП", "Сімейний конфлікт" тощо)
        
        Якщо якесь поле неможливо розпізнати, залиш його порожнім рядком.
        Відповідай ТІЛЬКИ чистим JSON кодом без жодних префіксів типу \`\`\`json.
        `

        // Remove header if present (data:image/jpeg;base64,...)
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

        // Sometimes Gemini adds markdown backticks, let's clean them
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        const jsonString = jsonMatch ? jsonMatch[0] : text

        try {
            const parsedData = JSON.parse(jsonString)
            return {
                success: true,
                data: parsedData
            }
        } catch (parseError) {
            console.error("Failed to parse AI response:", text)
            return {
                success: false,
                error: "Не вдалося розпізнати структуру даних. Спробуйте інше фото."
            }
        }

    } catch (error: any) {
        console.error("AI Analysis error:", error)
        return {
            success: false,
            error: error.message || "Помилка при роботі з ШІ"
        }
    }
}
