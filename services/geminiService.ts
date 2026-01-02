import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

export class GeminiService {
  constructor() {}

  async analyzeRoomImage(source: string, currentTemp: number, currentBrightness: number, isBase64: boolean = false): Promise<AIAnalysisResult> {
    let base64Data = '';

    if (isBase64) {
      base64Data = source;
    } else {
      const imgRes = await fetch(source);
      const blob = await imgRes.blob();
      const reader = new FileReader();
      
      base64Data = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(blob);
      });
    }

    const prompt = `
      Current Node Status: Temperature: ${currentTemp}°C, Ambient Light: ${currentBrightness} Lux.
      
      Audit Rules (STRICT):
      1. Occupancy: Detect total human count.
      2. Lighting Management:
         - If occupants > 0 AND Ambient Light < 60 Lux: Recommend ON.
         - Otherwise: Recommend OFF.
      3. Thermal Management (Occupancy Triggered):
         - If occupants = 0: AC OFF, Fan OFF.
         - If occupants > 0:
            - If Temp > 26°C: AC ON (Target 23°C), Fan OFF.
            - If 24°C <= Temp <= 26°C: AC OFF, Fan ON (Speed 4).
            - If Temp < 24°C: AC OFF, Fan OFF.
      
      Output ONLY JSON format following the schema provided.
    `;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              occupied: { type: Type.BOOLEAN },
              personCount: { type: Type.INTEGER },
              lightRecommendation: { type: Type.STRING, enum: ['ON', 'OFF'] },
              fanRecommendation: { type: Type.STRING, enum: ['ON', 'OFF'] },
              fanSpeed: { type: Type.INTEGER, minimum: 0, maximum: 5 },
              acRecommendation: { type: Type.STRING, enum: ['ON', 'OFF'] },
              targetTemp: { type: Type.NUMBER }
            },
            required: ["occupied", "personCount", "lightRecommendation", "fanRecommendation", "fanSpeed", "acRecommendation", "targetTemp"]
          }
        }
      });

      const text = response.text || "{}";
      return JSON.parse(text.trim()) as AIAnalysisResult;
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();