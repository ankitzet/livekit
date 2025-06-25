import { GoogleGenAI } from "@google/genai";

export interface FollowUpSuggestion {
  question: string;
  reasoning?: string;
}

export interface FollowUpResponse {
  suggestions: FollowUpSuggestion[];
}

class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // In development, we'll use a server endpoint to proxy the Gemini API
    this.ai = new GoogleGenAI({ apiKey: 'proxy' });
  }

  async getFollowUpSuggestions(transcriptText: string, jobDescription?: string | null, customInstruction?: string): Promise<FollowUpResponse> {
    try {
      console.log('🌐 Making API request to /api/gemini/follow-up-suggestions');
      
      // Ensure all values are clean strings to avoid circular references
      const requestBody = {
        transcriptText: String(transcriptText || ''),
        jobDescription: jobDescription ? String(jobDescription) : null,
        customInstruction: customInstruction ? String(customInstruction) : undefined
      };
      
      console.log('📤 Request payload:', {
        transcriptText: requestBody.transcriptText,
        jobDescription: requestBody.jobDescription,
        customInstruction: requestBody.customInstruction
      });
      
      const response = await fetch('/api/gemini/follow-up-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const responseText = await response.text();
      console.log('📥 Raw response text:', responseText);
      
      let data: FollowUpResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        throw new Error(`Failed to parse JSON response: ${parseError}`);
      }
      
      console.log('✅ Successfully parsed API response:', data);
      
      // Validate response structure
      if (!data || !data.suggestions || !Array.isArray(data.suggestions)) {
        throw new Error('Invalid response structure: missing suggestions array');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Error in getFollowUpSuggestions:', error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();