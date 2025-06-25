// Complete audio-capture-service.ts

import {
  Room,
  RemoteParticipant,
  LocalParticipant,
  Track,
  ParticipantEvent,
} from "livekit-client";

export interface AudioCaptureOptions {
  sampleRate?: number;
  channelCount?: number;
  bufferSize?: number;
}

export class AudioCaptureService {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private localProcessor: ScriptProcessorNode | null = null;
  private remoteProcessor: ScriptProcessorNode | null = null;
  private localSource: MediaStreamAudioSourceNode | null = null;
  private remoteSource: MediaStreamAudioSourceNode | null = null;
  private onLocalAudioCallback?: (audioData: ArrayBuffer) => void;
  private onRemoteAudioCallback?: (audioData: ArrayBuffer) => void;
  private isCapturing = false;
  private room: Room | null = null;

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
    this.audioContext = new AudioContext({
      sampleRate: this.options.sampleRate,
    });

    // Create gain node for mixing audio
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);

    console.log("AudioCaptureService initialized");
  }

  async startCapture(): Promise<void> {
    if (!this.room || !this.audioContext || !this.gainNode) {
      throw new Error("AudioCaptureService not initialized");
    }

    // Create separate processors for local and remote audio
    this.localProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.remoteProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

    // CAPTURE LOCAL MICROPHONE SEPARATELY
    await this.captureLocalAudio();

    // CAPTURE REMOTE PARTICIPANTS SEPARATELY  
    await this.captureRemoteAudio();

    this.isCapturing = true;
    console.log("🎤 Separate audio capture started (local + remote streams)");
  }

  private async captureLocalAudio(): Promise<void> {
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.options.sampleRate,
          channelCount: this.options.channelCount,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.localSource = this.audioContext!.createMediaStreamSource(localStream);

      // Process local audio separately
      this.localProcessor!.onaudioprocess = (event) => {
        if (!this.isCapturing || !this.onLocalAudioCallback) return;

        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        const audioLevel = Math.max.apply(Math, Array.from(inputData).map(Math.abs));

        if (audioLevel > 0.01) { // Only meaningful audio
          const int16Array = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const sample = Math.max(-1, Math.min(1, inputData[i]));
            int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          }

          // Send with local identifier
          this.onLocalAudioCallback(int16Array.buffer);

          if (Math.random() < 0.01) { // Occasional logging
            console.log(`🎤 LOCAL AUDIO: level=${audioLevel.toFixed(4)}`);
          }
        }
      };

      this.localSource.connect(this.localProcessor!);
      this.localProcessor!.connect(this.audioContext!.destination);

      console.log("✅ Local microphone connected for separate processing");
    } catch (error) {
      console.error("❌ Failed to capture local audio:", error);
    }
  }

  private async captureRemoteAudio(): Promise<void> {
    if (!this.room || !this.audioContext) return;

    // Capture existing remote participants
    this.room.remoteParticipants.forEach((participant) => {
      this.attachRemoteParticipantAudio(participant);
    });

    // Listen for new remote participants
    this.room.on('trackSubscribed', (track, publication, participant) => {
      if (track.kind === 'audio') {
        console.log("🎧 New remote audio track subscribed");
        this.attachRemoteParticipantAudio(participant);
      }
    });
  }

  private attachRemoteParticipantAudio(participant: any): void {
    if (!this.audioContext) return;

    const audioTrackPublication = Array.from(participant.audioTrackPublications.values())[0];
    const audioTrack = (audioTrackPublication as any)?.track;
    if (!audioTrack) {
      console.log("⚠️ No audio track found for participant:", participant.identity);
      return;
    }

    try {
      const remoteStream = new MediaStream([audioTrack.mediaStreamTrack]);
      this.remoteSource = this.audioContext.createMediaStreamSource(remoteStream);

      // Process remote audio separately
      this.remoteProcessor!.onaudioprocess = (event) => {
        if (!this.isCapturing || !this.onRemoteAudioCallback) return;

        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        const audioLevel = Math.max.apply(Math, Array.from(inputData).map(Math.abs));

        if (audioLevel > 0.01) { // Only meaningful audio
          const int16Array = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const sample = Math.max(-1, Math.min(1, inputData[i]));
            int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          }

          // Send with remote identifier
          this.onRemoteAudioCallback(int16Array.buffer);

          if (Math.random() < 0.01) { // Occasional logging
            console.log(`🎤 REMOTE AUDIO: level=${audioLevel.toFixed(4)}`);
          }
        }
      };

      this.remoteSource.connect(this.remoteProcessor!);
      this.remoteProcessor!.connect(this.audioContext.destination);

      console.log(`✅ Remote audio from ${participant.identity} connected for separate processing`);
    } catch (error) {
      console.error(`❌ Failed to connect remote audio from ${participant.identity}:`, error);
    }
  }

  stopCapture(): void {
    this.isCapturing = false;

    if (this.localSource) {
      this.localSource.disconnect();
      this.localSource = null;
    }

    if (this.remoteSource) {
      this.remoteSource.disconnect();
      this.remoteSource = null;
    }

    if (this.localProcessor) {
      this.localProcessor.disconnect();
      this.localProcessor = null;
    }

    if (this.remoteProcessor) {
      this.remoteProcessor.disconnect();
      this.remoteProcessor = null;
    }

    console.log("🛑 Separate audio capture stopped");
  }

  cleanup(): void {
    this.stopCapture();

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.room = null;
    console.log("AudioCaptureService cleaned up");
  }

  // Separate callbacks for local and remote audio
  onLocalAudio(callback: (audioData: ArrayBuffer) => void): void {
    this.onLocalAudioCallback = callback;
    console.log("✅ Local audio callback set");
  }

  onRemoteAudio(callback: (audioData: ArrayBuffer) => void): void {
    this.onRemoteAudioCallback = callback;
    console.log("✅ Remote audio callback set");
  }

  // Keep the old method for backwards compatibility
  onAudioData(callback: (audioData: ArrayBuffer) => void): void {
    // This will be used for local audio by default
    this.onLocalAudioCallback = callback;
  }
}

export default AudioCaptureService;