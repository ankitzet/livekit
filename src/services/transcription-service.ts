import { Room } from 'livekit-client';

export type TranscriptionProvider = 'deepgram' | 'elevenlabs';

export interface TranscriptionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  timestamp: string;
  speaker?: string;
}

export abstract class TranscriptionService {
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract sendAudio(audioData: ArrayBuffer): void;
  abstract onTranscription(callback: (result: TranscriptionResult) => void): void;
  abstract onError(callback: (error: string) => void): void;

  // Optional method for room-based services
  initialize?(room: Room): Promise<void>;
  cleanup?(): void;
}

export class TranscriptionServiceFactory {
  static create(provider: TranscriptionProvider): TranscriptionService {
    switch (provider) {
      case 'deepgram':
        return new DeepgramService();
      case 'elevenlabs':
        // TODO: Implement ElevenLabs service
        throw new Error('ElevenLabs transcription not implemented yet');
      default:
        throw new Error(`Unknown transcription provider: ${provider}`);
    }
  }
}

// Mock implementation for demo purposes
class DeepgramService extends TranscriptionService {
  private onTranscriptionCallback?: (result: TranscriptionResult) => void;
  private onErrorCallback?: (error: string) => void;
  private mockInterval: any = null;
  private mockPhrases = [
    "Hello, can you hear me?",
    "I'm interested in this position because of the company culture.",
    "My experience includes three years at a similar company.",
    "I've worked with React and TypeScript extensively.",
    "I believe my skills align well with what you're looking for.",
    "Could you tell me more about the team I'd be working with?",
    "I'm comfortable with agile development methodologies.",
    "One of my strengths is problem-solving under pressure.",
    "I've led a team of five developers on my last project.",
    "The most challenging project I worked on was a real-time analytics dashboard."
  ];
  private mockIndex = 0;

  async start(): Promise<void> {
    console.log('Starting mock transcription service');
    
    // Simulate transcription with mock data
    this.mockInterval = setInterval(() => {
      if (this.onTranscriptionCallback) {
        const phrase = this.mockPhrases[this.mockIndex % this.mockPhrases.length];
        this.mockIndex++;
        
        // First send as interim
        this.onTranscriptionCallback({
          transcript: phrase,
          isFinal: false,
          confidence: 0.95,
          timestamp: new Date().toISOString(),
          speaker: Math.random() > 0.5 ? 'Interviewer' : 'Candidate'
        });
        
        // Then send as final after a short delay
        setTimeout(() => {
          if (this.onTranscriptionCallback) {
            this.onTranscriptionCallback({
              transcript: phrase,
              isFinal: true,
              confidence: 0.98,
              timestamp: new Date().toISOString(),
              speaker: Math.random() > 0.5 ? 'Interviewer' : 'Candidate'
            });
          }
        }, 1000);
      }
    }, 5000);
  }

  async stop(): Promise<void> {
    console.log('Stopping mock transcription service');
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }

  sendAudio(audioData: ArrayBuffer): void {
    // Mock implementation - does nothing with the audio data
  }

  onTranscription(callback: (result: TranscriptionResult) => void): void {
    this.onTranscriptionCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }
}