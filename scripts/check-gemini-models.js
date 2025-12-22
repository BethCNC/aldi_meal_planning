import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    // The listModels method is not directly on genAI in some versions, 
    // it might be under a different namespace or we might need to use fetch.
    // However, let's try a different trick: try to use 'gemini-1.5-flash-8b' or other variants.
    
    console.log('Testing specific models...');
    const models = [
      'gemini-1.5-pro',
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-pro'
    ];

    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        const result = await model.generateContent('ping');
        console.log(`✅ Model ${m} is available!`);
        return;
      } catch (e) {
        console.log(`❌ Model ${m} failed: ${e.message}`);
      }
    }
  } catch (error) {
    console.error('List models failed:', error);
  }
}

listModels();
