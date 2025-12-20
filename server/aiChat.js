import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Auth Middleware
const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });
  req.user = user;
  next();
};

router.post('/', verifyAuth, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const userId = req.user.id;

    // 1. Fetch current user preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('liked_ingredients, disliked_ingredients, dietary_tags')
      .eq('user_id', userId)
      .single();

    const currentPrefs = {
      likes: prefs?.liked_ingredients || [],
      dislikes: prefs?.disliked_ingredients || [],
      tags: prefs?.dietary_tags || []
    };

    // 2. Construct Prompt
    const systemPrompt = `
      You are a helpful culinary assistant for the Aldi Meal Planner app.
      Your goal is to help the user manage their dietary preferences and answer questions about meal planning.

      Current User Preferences:
      - Likes: ${currentPrefs.likes.join(', ') || 'None'}
      - Dislikes: ${currentPrefs.dislikes.join(', ') || 'None'}
      - Dietary Tags: ${currentPrefs.tags.join(', ') || 'None'}

      Capabilities:
      1. Add/Remove liked ingredients.
      2. Add/Remove disliked ingredients.
      3. Add/Remove dietary tags (e.g., Keto, Vegan, Gluten-Free).
      4. Answer cooking questions.

      If the user asks to change a preference, you MUST return a structured JSON response with the 'action' field.
      If it's just a chat, return a standard response.

      Response Format (JSON):
      {
        "reply": "Your conversational response here.",
        "action": {
          "type": "update_preferences",
          "add_likes": [],
          "remove_likes": [],
          "add_dislikes": [],
          "remove_dislikes": [],
          "add_tags": [],
          "remove_tags": []
        }
      }
      
      Example: User says "I hate mushrooms now"
      Response:
      {
        "reply": "Got it, I'll stop recommending recipes with mushrooms.",
        "action": {
          "type": "update_preferences",
          "add_dislikes": ["mushrooms"]
        }
      }

      Keep replies concise and friendly.
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] }))
      ]
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    // 3. Parse Response
    let parsedResponse;
    try {
      // Extract JSON if wrapped in markdown
      let cleanText = responseText.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\n?/g, '');
      }
      parsedResponse = JSON.parse(cleanText);
    } catch (e) {
      // Fallback if AI didn't return JSON
      parsedResponse = { reply: responseText };
    }

    // 4. Execute Action (Update Preferences)
    if (parsedResponse.action && parsedResponse.action.type === 'update_preferences') {
      const action = parsedResponse.action;
      let newLikes = [...currentPrefs.likes];
      let newDislikes = [...currentPrefs.dislikes];
      let newTags = [...currentPrefs.tags];

      // Helper to process lists
      const updateList = (list, add, remove) => {
        const set = new Set(list.map(i => i.toLowerCase()));
        (add || []).forEach(i => set.add(i.toLowerCase()));
        (remove || []).forEach(i => set.delete(i.toLowerCase()));
        return Array.from(set);
      };

      newLikes = updateList(newLikes, action.add_likes, action.remove_likes);
      newDislikes = updateList(newDislikes, action.add_dislikes, action.remove_dislikes);
      newTags = updateList(newTags, action.add_tags, action.remove_tags);

      // Save to Supabase
      await supabase
        .from('user_preferences')
        .update({
          liked_ingredients: newLikes,
          disliked_ingredients: newDislikes,
          dietary_tags: newTags,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
        
      // Update the reply to confirm what actually happened if needed, 
      // but usually the AI's reply is sufficient.
    }

    res.json(parsedResponse);

  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

export default router;

