import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { GameType, Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Question Generation ---

const QUESTION_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      question: { type: Type.STRING },
      options: { type: Type.ARRAY, items: { type: Type.STRING } },
      correctAnswer: { type: Type.STRING },
      explanation: { type: Type.STRING },
    },
    required: ["id", "question", "options", "correctAnswer"],
  },
};

export async function generateInitialQuestions(level: number = 1): Promise<Record<string, Question[]>> {
  const CACHE_KEY = `vut_elimu_questions_lvl_${level}_v1`;
  
  // 1. Try Cache
  try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
          console.log(`Using cached questions for level ${level}`);
          return JSON.parse(cached);
      }
  } catch (e) {
      console.warn("Cache read error", e);
  }

  // 2. Generate with Gemini Flash (Faster & Cheaper than Pro)
  try {
    const difficultyContext = level === 1 ? "simple basics for beginners (age 6-8)" 
      : level <= 3 ? "intermediate concepts for junior students (age 8-10)" 
      : level <= 5 ? "challenging questions for senior primary (age 10-12)"
      : "advanced concepts for competitive students";

    const mathPrompt = level === 1 ? "addition and subtraction under 20" 
      : level <= 3 ? "multiplication, division, and mixed arithmetic"
      : "fractions, percentages, and simple algebra";

    const prompt = `
      Generate engaging educational questions for students at Level ${level}. Context: ${difficultyContext}.
      
      You must generate 5 questions for EACH of the following 3 categories (15 questions total):
      
      1. MATHS: Focus on ${mathPrompt}. Return 4 numeric options.
      2. AFRICAN_GK: General knowledge about Africa (Geography, Animals, Culture). Return 4 text options.
      3. UNIVERSE_GK: General knowledge about Space and Science. Return 4 text options.
      
      Make questions fun, inclusive and distinctly African where possible.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // OPTIMIZATION: Switched to Flash
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            math: QUESTION_SCHEMA,
            african_gk: QUESTION_SCHEMA,
            universe_gk: QUESTION_SCHEMA,
          },
        },
      },
    });

    // Sanitize output to remove markdown code blocks if present
    let jsonText = response.text || "{}";
    jsonText = jsonText.replace(/```json\n?|```/g, '').trim();

    const data = JSON.parse(jsonText);
    
    // Tag types
    if (data.math) data.math.forEach((q: any) => q.type = GameType.MATHS);
    if (data.african_gk) data.african_gk.forEach((q: any) => q.type = GameType.AFRICAN_GK);
    if (data.universe_gk) data.universe_gk.forEach((q: any) => q.type = GameType.UNIVERSE_GK);

    // 3. Save to Cache
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn("Cache write error (quota?)", e);
    }

    return data;
  } catch (error) {
    console.error("Failed to generate questions:", error);
    // Fallback/Mock data could be returned here in a real app
    return { math: [], african_gk: [], universe_gk: [] };
  }
}

// --- Content Generation for Language Games ---

export async function generateReadingParagraph(level: number): Promise<string> {
    try {
        const difficulty = level <= 2 ? "simple sentences, very short" : "a short paragraph with interesting vocabulary";
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Write a fun, educational paragraph for a child (Level ${level}) to read aloud. 
            Topic: African Wildlife or Space. 
            Constraint: Keep it under 30 words. ${difficulty}. 
            Return ONLY the text.`,
        });
        return response.text.trim();
    } catch (e) {
        return "The sun shines bright over the big mountain. Lions sleep in the grass.";
    }
}

export async function generateListeningContent(level: number): Promise<{story: string, questions: Question[]}> {
    try {
        const prompt = `
            Create a listening comprehension test for Level ${level} students.
            1. Write a very short story (max 40 words, approx 10 seconds read time).
            2. Generate 4 multiple-choice questions based on this story.
            
            Return JSON format.
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        story: { type: Type.STRING },
                        questions: QUESTION_SCHEMA
                    },
                    required: ["story", "questions"]
                }
            }
        });
        
        let jsonText = response.text || "{}";
        jsonText = jsonText.replace(/```json\n?|```/g, '').trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error(e);
        return { 
            story: "Error loading story.", 
            questions: [] 
        };
    }
}

// --- Avatar Generation ---

export async function generateAvatar(
  ethnicity: string,
  gender: string,
  age: string,
  style: string
): Promise<string | null> {
  try {
    const prompt = `Create a 3D rendered avatar of a ${age} ${ethnicity} ${gender}, in a ${style} style (like Pixar or Teletoon). 
    Cute, vibrant colors, solid blue background, ready for a game profile picture. Head and shoulders only.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview", // Keep High Quality for Profile Images
      contents: prompt,
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Avatar Gen Error:", e);
    return null;
  }
}

export async function generateTeamLogo(name: string): Promise<string | null> {
  try {
    const prompt = `Create a vector-style e-sports team logo or school badge for a group named "${name}". 
    Vibrant colors, thick outlines, sticker art style, white background. 
    Make it look cool for kids.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: prompt,
      config: {
        imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Logo Gen Error:", e);
    return null;
  }
}

// --- Text to Speech (for Blind/Listen mode) ---

export async function speakText(text: string): Promise<ArrayBuffer | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { parts: [{ text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Puck" }, // Friendly voice
          },
        },
      },
    });

    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64) return null;

    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (e) {
    console.error("TTS Error:", e);
    return null;
  }
}

// --- Writing/Vision Correction ---

export async function evaluateWriting(imageData: string, targetWord: string): Promise<{correct: boolean, feedback: string}> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/png", data: imageData.split(',')[1] } },
          { text: `The child was asked to write the word/letter "${targetWord}". Check if the handwriting matches. Return JSON: { "correct": boolean, "feedback": "encouraging short string" }` }
        ]
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || '{"correct": false, "feedback": "Try again!"}');
  } catch (e) {
    console.error(e);
    return { correct: false, feedback: "Could not evaluate." };
  }
}

export const liveClient = ai.live;