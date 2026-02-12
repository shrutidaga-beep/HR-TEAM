
import { GoogleGenAI, Type } from '@google/genai';
import { EvaluationResult } from '../types';

export const evaluateCvWithGemini = async (
  jdText: string,
  cvBase64: string,
  cvMimeType: string
): Promise<EvaluationResult> => {
  // Always initialize with process.env.API_KEY as a named parameter.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
You are an expert technical recruiter and hiring manager.
Please evaluate the attached CV against the provided Job Description (JD).

Job Description:
${jdText}
---

Task:
1. Extract the candidate's full name from the CV. If not found, use "Unknown Candidate".
2. Extract the candidate's phone number from the CV. If not found, return "Not found".
3. Calculate a realistic match score from 0 to 100 based on how well the candidate's skills, experience, and education align with the JD requirements. Be critical.
4. Identify up to 3 key strengths (why they fit the role).
5. Identify up to 3 key weaknesses or missing requirements.
6. Provide a short, actionable recommendation summary (1-2 sentences).
7. Decide on the final action: 'Strong Hire', 'Interview', or 'Reject'.
`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      candidateName: {
        type: Type.STRING,
        description: "The full name of the candidate found in the CV.",
      },
      phoneNumber: {
        type: Type.STRING,
        description: "The phone number of the candidate found in the CV.",
      },
      matchScore: {
        type: Type.INTEGER,
        description: "An integer score from 0 to 100 representing the fit.",
      },
      strengths: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of up to 3 key strengths.",
      },
      weaknesses: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of up to 3 key weaknesses or missing skills.",
      },
      recommendation: {
        type: Type.STRING,
        description: "A short 1-2 sentence summary of your recommendation.",
      },
      action: {
        type: Type.STRING,
        description: "Must be exactly one of: 'Strong Hire', 'Interview', 'Reject'.",
      },
    },
    required: [
      "candidateName",
      "phoneNumber",
      "matchScore",
      "strengths",
      "weaknesses",
      "recommendation",
      "action",
    ],
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: cvBase64,
              mimeType: cvMimeType,
            },
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.2, // Low temperature for more analytical/consistent output
      },
    });

    // Directly access the .text property from the GenerateContentResponse object.
    const text = response.text || '{}';
    // Clean up potential markdown code block markers if the model ignores the mime type slightly
    const cleanJsonStr = text.replace(/^```json/m, '').replace(/```$/m, '').trim();
    const result = JSON.parse(cleanJsonStr) as EvaluationResult;
    return result;
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    throw new Error(error.message || "Failed to analyze CV");
  }
};
