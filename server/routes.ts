import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertMeetingSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Meeting management endpoints
  app.post("/api/meetings", async (req, res) => {
    try {
      const meetingData = insertMeetingSchema.parse(req.body);
      const meeting = await storage.createMeeting(meetingData);
      res.json(meeting);
    } catch (error) {
      res.status(400).json({ error: "Invalid meeting data" });
    }
  });

  app.get("/api/meetings/:roomName", async (req, res) => {
    try {
      const { roomName } = req.params;
      const meeting = await storage.getMeetingByRoomName(roomName);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for Deepgram proxy and real-time features  
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    perMessageDeflate: false,
    clientTracking: true
  });

  console.log('WebSocket server initialized on path /ws');

  wss.on('connection', async (ws: WebSocket, req) => {
    console.log('WebSocket client connected from:', req.socket.remoteAddress);

    // Handle Deepgram WebSocket proxy
    let deepgramWs: WebSocket | null = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'start_transcription') {
          // Initialize Deepgram connection
          const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
          
          console.log('🔑 Checking Deepgram API key...', deepgramApiKey ? 'FOUND' : 'MISSING');
          
          if (!deepgramApiKey) {
            console.error('❌ Deepgram API key not configured');
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Deepgram API key not configured'
            }));
            return;
          }

          // Use working Deepgram parameters from June 21st
          const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&interim_results=true&smart_format=true&punctuate=true&encoding=linear16&sample_rate=16000&channels=1`;
          console.log('Connecting to Deepgram with URL:', deepgramUrl);
          
          deepgramWs = new WebSocket(deepgramUrl, {
            headers: {
              'Authorization': `Token ${deepgramApiKey}`,
            }
          });

          deepgramWs.on('open', () => {
            console.log('✅ Connected to Deepgram successfully');
            ws.send(JSON.stringify({
              type: 'transcription_started'
            }));
          });

          deepgramWs.on('message', (deepgramMessage) => {
            try {
              const result = JSON.parse(deepgramMessage.toString());
              console.log(`📥 DEEPGRAM FULL RESPONSE:`, JSON.stringify(result, null, 2));
              
              // Check all possible transcript locations
              if (result.type === 'Results') {
                const alternatives = result.channel?.alternatives || [];
                console.log(`🔍 Results format: ${alternatives.length} alternatives found`);
                
                if (alternatives.length > 0 && alternatives[0].transcript) {
                  const transcript = alternatives[0].transcript;
                  const confidence = alternatives[0].confidence || 0;
                  const isFinal = result.is_final || false;
                  
                  console.log(`🎯 FOUND TRANSCRIPT: "${transcript}" (final=${isFinal}, conf=${confidence})`);
                  
                  ws.send(JSON.stringify({
                    type: 'transcription',
                    data: {
                      transcript: transcript.trim(),
                      is_final: isFinal,
                      confidence: confidence,
                      timestamp: new Date().toISOString()
                    }
                  }));
                }
              } else if (result.alternatives && result.alternatives.length > 0) {
                // Direct alternatives format
                const transcript = result.alternatives[0].transcript;
                if (transcript) {
                  console.log(`🎯 DIRECT ALTERNATIVES: "${transcript}"`);
                  
                  ws.send(JSON.stringify({
                    type: 'transcription',
                    data: {
                      transcript: transcript.trim(),
                      is_final: true,
                      confidence: result.alternatives[0].confidence || 0.9,
                      timestamp: new Date().toISOString()
                    }
                  }));
                }
              } else {
                console.log(`📊 NON-TRANSCRIPT: type=${result.type || 'unknown'}`);
              }
            } catch (error) {
              console.error('❌ JSON PARSE ERROR:', error.message);
              console.error('❌ RAW RESPONSE:', deepgramMessage.toString());
            }
          });

          deepgramWs.on('error', (error) => {
            console.error('❌ Deepgram WebSocket error:', error.message || error);
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Transcription service error: ' + (error.message || 'Unknown error')
            }));
          });

          deepgramWs.on('close', () => {
            console.log('Deepgram connection closed');
            ws.send(JSON.stringify({
              type: 'transcription_ended'
            }));
          });
        } else if (data.type === 'inject_transcript') {
          // Test UI by injecting a known transcript
          console.log('📝 Injecting test transcript to verify UI');
          ws.send(JSON.stringify({
            type: 'transcription',
            data: data.data
          }));
        } else if (data.type === 'audio_data' && data.audio) {
          const audioBuffer = Buffer.from(data.audio, 'base64');
          
          // Enhanced debugging for audio processing
          const audioLevel = Array.from(new Int16Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.length / 2))
            .reduce((max, val) => Math.max(max, Math.abs(val)), 0);
          
          // Reduced server logging for performance
          if (Math.random() < 0.05) { // Log 5% of chunks
            console.log(`🔊 SERVER RECEIVED: ${audioBuffer.length}bytes, level=${audioLevel}, format=PCM`);
          }
          
          // CRITICAL FIX: Send raw binary PCM data to Deepgram (not JSON)
          if (deepgramWs && deepgramWs.readyState === 1) {
            deepgramWs.send(audioBuffer, { binary: true });
            if (Math.random() < 0.05) {
              console.log(`📤 SENT RAW PCM TO DEEPGRAM: ${audioBuffer.length}bytes`);
            }
          } else {
            console.error('📤 ERROR: Deepgram WebSocket not ready, state:', deepgramWs?.readyState);
          }
        } else if (data.type === 'stop_transcription' && deepgramWs) {
          deepgramWs.close();
          deepgramWs = null;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      if (deepgramWs) {
        deepgramWs.close();
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (deepgramWs) {
        deepgramWs.close();
      }
    });
  });

  // Health check endpoint for deployment monitoring
  app.get('/api/health', (req, res) => {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: 'connected',
        websocket: wss ? 'connected' : 'disconnected',
        jitsi: 'external_service',
        deepgram: process.env.DEEPGRAM_API_KEY ? 'configured' : 'not_configured',
        gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not_configured'
      }
    };
    
    console.log('🏥 Health check requested - Status:', healthStatus.status);
    res.json(healthStatus);
  });

  app.post('/api/gemini/follow-up-suggestions', async (req, res) => {
    try {
      console.log('🚀 Received follow-up suggestions request');
      const { transcriptText, jobDescription, customInstruction } = req.body;

      if (!transcriptText) {
        console.log('❌ No transcript text provided');
        return res.status(400).json({ error: 'Transcript text is required' });
      }

      console.log('📝 Transcript text received:', transcriptText);

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.log('❌ Gemini API key not configured');
        return res.status(500).json({ error: 'Gemini API key not configured' });
      }

      console.log('🔑 Gemini API key found, initializing AI service');
      
      // Initialize GoogleGenAI
      let ai;
      try {
        const { GoogleGenAI } = await import('@google/genai');
        ai = new GoogleGenAI({ apiKey });
        console.log('✅ GoogleGenAI initialized successfully');
      } catch (importError) {
        console.error('❌ Failed to import GoogleGenAI:', importError);
        return res.status(500).json({ error: 'Failed to initialize AI service' });
      }

      let prompt = `You are an expert interviewer.`;
      
      // Add job description context if provided
      if (jobDescription) {
        prompt += ` This interview is for the role of: ${jobDescription}. Use this context to suggest follow-up questions tailored to the job.`;
      }
      
      prompt += ` Based on the following transcript of a candidate's responses, suggest 1-2 intelligent follow-up questions that would help assess their technical skills, problem-solving approach, or experience in more depth.

Transcript:
${transcriptText}`;

      // Add custom instruction if provided
      if (customInstruction) {
        prompt += `

Additional instruction: ${customInstruction}`;
      }

      prompt += `

Generate 1-2 insightful follow-up questions that:
1. Build on what the candidate has said
2. Probe deeper into their technical knowledge
3. Assess problem-solving skills
4. Explore real-world experience
5. Are specific and actionable

Return in this exact JSON format:
{
  "suggestions": [
    {
      "question": "Your follow-up question here",
      "reasoning": "Brief explanation of why this question is valuable"
    }
  ]
}`;

      console.log('🧠 Sending request to Gemini AI...');
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    reasoning: { type: "string" }
                  },
                  required: ["question"]
                }
              }
            },
            required: ["suggestions"]
          }
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      console.log('📨 Received response from Gemini');
      
      const rawJson = response.text;
      console.log('✅ Raw JSON from Gemini:', rawJson);

      if (!rawJson) {
        console.error('❌ Empty response from Gemini');
        return res.status(500).json({ error: 'Empty response from Gemini' });
      }

      let data;
      try {
        data = JSON.parse(rawJson);
        console.log('✅ Parsed data:', data);
      } catch (parseError) {
        console.error('❌ Failed to parse Gemini response:', parseError);
        return res.status(500).json({ error: 'Failed to parse AI response' });
      }

      // Validate the response structure
      if (!data || !data.suggestions || !Array.isArray(data.suggestions)) {
        console.error('❌ Invalid response structure from Gemini:', data);
        return res.status(500).json({ error: 'Invalid response structure from AI' });
      }

      // Clean the response to ensure no circular references
      const cleanResponse = {
        suggestions: data.suggestions.map((suggestion: any) => ({
          question: String(suggestion.question || ''),
          reasoning: String(suggestion.reasoning || '')
        }))
      };

      console.log('✅ Sending clean response:', cleanResponse);
      res.json(cleanResponse);
    } catch (error) {
      console.error('❌ Error generating follow-up suggestions:', error);
      res.status(500).json({ error: 'Failed to generate follow-up suggestions' });
    }
  });

  return httpServer;
}