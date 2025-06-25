//client/src/services/transcription-service.ts
import { Room } from 'livekit-client';

export type TranscriptionProvider = 'deepgram' | 'elevenlabs';

export interface TranscriptionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  timestamp: string;
  speaker?: string; // Added speaker identification
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

  // New factory method for enhanced services
  static createEnhanced(provider: TranscriptionProvider): TranscriptionService {
    switch (provider) {
      case 'deepgram':
        // Import the enhanced service dynamically
        const { EnhancedDeepgramService } = require('./enhanced-deepgram-service');
        return new EnhancedDeepgramService();
      case 'elevenlabs':
        throw new Error('ElevenLabs enhanced transcription not implemented yet');
      default:
        throw new Error(`Unknown enhanced transcription provider: ${provider}`);
    }
  }
}

// Keep the original DeepgramService for backward compatibility
class DeepgramService extends TranscriptionService {
  private ws: WebSocket | null = null;
  private onTranscriptionCallback?: (result: TranscriptionResult) => void;
  private onErrorCallback?: (error: string) => void;

  async start(): Promise<void> {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.ws = new WebSocket(wsUrl);
    this.ws.onopen = () => {
      console.log('Connected to transcription WebSocket');
      if (this.ws) {
        this.ws.send(JSON.stringify({
          type: 'start_transcription'
        }));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message from server:', data);

        if (data.type === 'transcription' && this.onTranscriptionCallback) {
          console.log('Processing transcription:', data.data);
          this.onTranscriptionCallback({
            transcript: data.data.transcript,
            isFinal: data.data.is_final,
            confidence: data.data.confidence,
            timestamp: data.data.timestamp
          });
        } else if (data.type === 'error' && this.onErrorCallback) {
          console.error('Transcription error from server:', data.error);
          this.onErrorCallback(data.error);
        } else {
          console.log('Received message type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        if (this.onErrorCallback) {
          this.onErrorCallback('Failed to parse transcription response');
        }
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback('WebSocket connection error');
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }

  async stop(): Promise<void> {
    if (this.ws) {
      this.ws.send(JSON.stringify({
        type: 'stop_transcription'
      }));
      this.ws.close();
      this.ws = null;
    }
  }

  sendAudio(audioData: ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Convert ArrayBuffer to base64
      const uint8Array = new Uint8Array(audioData);
      const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));

      this.ws.send(JSON.stringify({
        type: 'audio_data',
        audio: base64Audio
      }));
    }
  }

  onTranscription(callback: (result: TranscriptionResult) => void): void {
    this.onTranscriptionCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }
}