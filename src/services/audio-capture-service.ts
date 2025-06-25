import { Room } from "livekit-client";

export interface AudioCaptureOptions {
  sampleRate?: number;
  channelCount?: number;
  bufferSize?: number;
}

export class AudioCaptureService {
  private onLocalAudioCallback?: (audioData: ArrayBuffer) => void;
  private onRemoteAudioCallback?: (audioData: ArrayBuffer) => void;
  private isCapturing = false;
  private room: Room | null = null;
  private mockInterval: any = null;

  constructor(private options: AudioCaptureOptions = {}) {
    this.options = {
      sampleRate: 16000,
      channelCount: 1,
      bufferSize: 4096,
      ...options,
    };
  }

  async initialize(room: Room): Promise<void> {
    this.room = room;
    console.log("AudioCaptureService initialized");
  }

  async startCapture(): Promise<void> {
    if (!this.room) {
      throw new Error("AudioCaptureService not initialized");
    }

    // For demo purposes, we'll simulate audio capture
    this.mockInterval = setInterval(() => {
      // Create mock audio data (random noise)
      const buffer = new ArrayBuffer(this.options.bufferSize || 4096);
      const view = new Int16Array(buffer);
      for (let i = 0; i < view.length; i++) {
        view[i] = Math.random() * 2000 - 1000; // Random values between -1000 and 1000
      }
      
      // Send to local and remote callbacks
      if (this.onLocalAudioCallback && Math.random() > 0.5) {
        this.onLocalAudioCallback(buffer);
      }
      
      if (this.onRemoteAudioCallback && Math.random() > 0.5) {
        this.onRemoteAudioCallback(buffer);
      }
    }, 500);

    this.isCapturing = true;
    console.log("🎤 Audio capture started (mock implementation)");
  }

  stopCapture(): void {
    this.isCapturing = false;
    
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }

    console.log("🛑 Audio capture stopped");
  }

  cleanup(): void {
    this.stopCapture();
    this.room = null;
    console.log("AudioCaptureService cleaned up");
  }

  onLocalAudio(callback: (audioData: ArrayBuffer) => void): void {
    this.onLocalAudioCallback = callback;
    console.log("✅ Local audio callback set");
  }

  onRemoteAudio(callback: (audioData: ArrayBuffer) => void): void {
    this.onRemoteAudioCallback = callback;
    console.log("✅ Remote audio callback set");
  }

  onAudioData(callback: (audioData: ArrayBuffer) => void): void {
    this.onLocalAudioCallback = callback;
  }
}

export default AudioCaptureService;