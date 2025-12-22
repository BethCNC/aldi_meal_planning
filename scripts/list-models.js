import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // Note: The JS SDK doesn't expose listModels directly on the main class easily in all versions,
    // but we can try to find a working model by trial/error or assuming standard ones.
    // Actually, it's typically a separate API call.
    // However, I can try to generate content with 'gemini-1.5-flash' which is usually available.
    
    const modelsToCheck = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro', 'gemini-1.0-pro'];
    
    for (const modelName of modelsToCheck) {
      console.log(`Checking ${modelName}...`);
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello');
        console.log(`✅ ${modelName} is WORKING.`);
        console.log('Response:', result.response.text());
        return; // Stop after finding one
      } catch (error) {
        console.log(`❌ ${modelName} failed: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

listModels();
