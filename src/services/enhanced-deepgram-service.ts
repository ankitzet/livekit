import { Room } from "livekit-client";
import { TranscriptionService, TranscriptionResult } from "./transcription-service";

export class EnhancedDeepgramService extends TranscriptionService {
  private onTranscriptionCallback?: (result: TranscriptionResult) => void;
  private onErrorCallback?: (error: string) => void;
  private mockInterval: any = null;
  private room: Room | null = null;
  private lastDeterminedSpeaker: string = "";
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

  async initialize(room: Room): Promise<void> {
    this.room = room;
    
    // Initialize with URL role as default
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get("role");
    this.lastDeterminedSpeaker = role === "interviewer" ? "Interviewer" : "Candidate";
    
    console.log(`Initialized EnhancedDeepgramService with role: ${this.lastDeterminedSpeaker}`);
  }

  async start(): Promise<void> {
    console.log('Starting enhanced mock transcription service');
    
    // Simulate transcription with mock data
    this.mockInterval = setInterval(() => {
      if (this.onTranscriptionCallback) {
        const phrase = this.mockPhrases[this.mockIndex % this.mockPhrases.length];
        this.mockIndex++;
        
        // Toggle between interviewer and candidate
        this.lastDeterminedSpeaker = this.lastDeterminedSpeaker === "Interviewer" ? "Candidate" : "Interviewer";
        
        // First send as interim
        this.onTranscriptionCallback({
          transcript: phrase,
          isFinal: false,
          confidence: 0.95,
          timestamp: new Date().toISOString(),
          speaker: this.lastDeterminedSpeaker
        });
        
        // Then send as final after a short delay
        setTimeout(() => {
          if (this.onTranscriptionCallback) {
            this.onTranscriptionCallback({
              transcript: phrase,
              isFinal: true,
              confidence: 0.98,
              timestamp: new Date().toISOString(),
              speaker: this.lastDeterminedSpeaker
            });
          }
        }, 1000);
      }
    }, 5000);
  }

  async stop(): Promise<void> {
    console.log('Stopping enhanced mock transcription service');
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }

  sendAudio(audioData: ArrayBuffer): void {
    // Mock implementation - does nothing with the audio data
  }

  sendAudioWithSource(audioData: ArrayBuffer, source: "local" | "remote"): void {
    // Mock implementation - does nothing with the audio data
  }

  onTranscription(callback: (result: TranscriptionResult) => void): void {
    this.onTranscriptionCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  cleanup(): void {
    this.stop();
    this.room = null;
  }
}