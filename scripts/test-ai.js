
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

async function listModels() {
    try {
        const listResult = await genAI.listModels();
        console.log("Available models:");
        listResult.models.forEach(m => {
            console.log(`- ${m.name} (supports: ${m.supportedGenerationMethods.join(", ")})`);
        });
    } catch (e) {
        console.error("Error listing models:", e.message);
    }
}

listModels();
