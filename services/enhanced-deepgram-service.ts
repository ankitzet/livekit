// Enhanced Deepgram Service with Stable Audio Source Tagging
// Replace your enhanced-deepgram-service.ts with this

import { Room } from "livekit-client";
import {
  TranscriptionService,
  TranscriptionResult,
} from "./transcription-service";
import AudioCaptureService from "./audio-capture-service";

export class EnhancedDeepgramService extends TranscriptionService {
  private ws: WebSocket | null = null;
  private onTranscriptionCallback?: (result: TranscriptionResult) => void;
  private onErrorCallback?: (error: string) => void;
  private audioCaptureService: AudioCaptureService | null = null;
  private room: Room | null = null;

  // Track audio sources with timestamps
  private audioSourceTimestamps: Map<number, string> = new Map();
  private audioChunkCounter: number = 0;

  // Speaker detection stability
  private lastDeterminedSpeaker: string = "";
  private lastSpeakerChangeTime: number = 0;
  private speakerStabilityThreshold: number = 2000; // 2 seconds before allowing speaker change
  private confidenceThreshold: number = 0.8; // Confidence needed to change speaker

  constructor() {
    super();
    this.audioCaptureService = new AudioCaptureService({
      sampleRate: 16000,
      channelCount: 1,
      bufferSize: 4096,
    });
  }

  async initialize(room: Room): Promise<void> {
    this.room = room;

    // Initialize with URL role as default
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get("role");
    this.lastDeterminedSpeaker =
      role === "interviewer" ? "Interviewer" : "Candidate";
    this.lastSpeakerChangeTime = Date.now();

    if (this.audioCaptureService) {
      await this.audioCaptureService.initialize(room);

      console.log("🔧 SETTING UP SEPARATE AUDIO CALLBACKS...");

      // Set up separate callbacks for local and remote audio
      this.audioCaptureService.onLocalAudio((audioData: ArrayBuffer) => {
        console.log("🎤 SENDING LOCAL AUDIO to Deepgram");
        this.sendAudioWithSource(audioData, "local");
      });

      this.audioCaptureService.onRemoteAudio((audioData: ArrayBuffer) => {
        console.log("🎤 SENDING REMOTE AUDIO to Deepgram");
        this.sendAudioWithSource(audioData, "remote");
      });

      console.log("✅ SEPARATE AUDIO CALLBACKS CONFIGURED");
    }
  }

  private sendAudioWithSource(
    audioData: ArrayBuffer,
    source: "local" | "remote",
  ): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const timestamp = Date.now();

      // Store audio source with timestamp
      this.audioSourceTimestamps.set(timestamp, source);

      // Convert audio data
      const uint8Array = new Uint8Array(audioData);
      const base64Audio = btoa(
        String.fromCharCode.apply(null, Array.from(uint8Array)),
      );

      // Send audio with source metadata
      this.ws.send(
        JSON.stringify({
          type: "audio_data",
          audio: base64Audio,
          source: source,
          timestamp: timestamp,
        }),
      );

      if (Math.random() < 0.01) {
        // 1% logging
        console.log(
          `🎤 Sent ${source.toUpperCase()} audio: timestamp=${timestamp}, size=${audioData.byteLength}`,
        );
      }

      // Clean up old entries (keep only last 10 seconds)
      const cutoffTime = timestamp - 10000;
      for (const [ts, _] of this.audioSourceTimestamps.entries()) {
        if (ts < cutoffTime) {
          this.audioSourceTimestamps.delete(ts);
        }
      }
    }
  }

  private determineSpeakerFromAudioActivity(): string {
    const now = Date.now();
    const analysisWindow = 5000; // 5 seconds
    const minimumGapForSwitch = 1000; // 1 second gap needed to switch speakers

    // Get audio activity in the analysis window
    const recentActivity = Array.from(this.audioSourceTimestamps.entries())
      .filter(([timestamp, _]) => now - timestamp < analysisWindow)
      .sort(([a], [b]) => b - a); // Sort by timestamp, newest first

    if (recentActivity.length === 0) {
      console.log(
        "👤 NO RECENT ACTIVITY - keeping current speaker:",
        this.lastDeterminedSpeaker,
      );
      return this.lastDeterminedSpeaker;
    }

    // Analyze audio patterns
    const localCount = recentActivity.filter(
      ([_, source]) => source === "local",
    ).length;
    const remoteCount = recentActivity.filter(
      ([_, source]) => source === "remote",
    ).length;

    // Look for clear dominance (80% threshold)
    const totalCount = localCount + remoteCount;
    const localRatio = localCount / totalCount;
    const remoteRatio = remoteCount / totalCount;

    let suggestedSpeaker = this.lastDeterminedSpeaker;
    let confidence = 0;

    if (localRatio >= this.confidenceThreshold) {
      suggestedSpeaker = "Interviewer";
      confidence = localRatio;
    } else if (remoteRatio >= this.confidenceThreshold) {
      suggestedSpeaker = "Candidate";
      confidence = remoteRatio;
    }

    // Stability check - don't change speaker too frequently
    const timeSinceLastChange = now - this.lastSpeakerChangeTime;
    const canChangeSpeaker =
      timeSinceLastChange > this.speakerStabilityThreshold;

    console.log("🎯 SPEAKER ANALYSIS:", {
      localCount,
      remoteCount,
      localRatio: localRatio.toFixed(2),
      remoteRatio: remoteRatio.toFixed(2),
      suggestedSpeaker,
      confidence: confidence.toFixed(2),
      currentSpeaker: this.lastDeterminedSpeaker,
      canChangeSpeaker,
      timeSinceLastChange,
    });

    // Only change speaker if we have high confidence and enough time has passed
    if (
      suggestedSpeaker !== this.lastDeterminedSpeaker &&
      canChangeSpeaker &&
      confidence >= this.confidenceThreshold
    ) {
      console.log(
        `👤 SPEAKER CHANGE: ${this.lastDeterminedSpeaker} → ${suggestedSpeaker} (confidence: ${confidence.toFixed(2)})`,
      );
      this.lastDeterminedSpeaker = suggestedSpeaker;
      this.lastSpeakerChangeTime = now;
    } else if (suggestedSpeaker !== this.lastDeterminedSpeaker) {
      console.log(
        `👤 SPEAKER CHANGE BLOCKED: ${this.lastDeterminedSpeaker} → ${suggestedSpeaker} (confidence: ${confidence.toFixed(2)}, canChange: ${canChangeSpeaker})`,
      );
    }

    return this.lastDeterminedSpeaker;
  }

  async start(): Promise<void> {
    if (!this.room) {
      throw new Error("Room not initialized. Call initialize() first.");
    }

    // Start WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = async () => {
      console.log("✅ Connected to Deepgram via WebSocket proxy");
      if (this.ws) {
        this.ws.send(JSON.stringify({ type: "start_transcription" }));
      }

      // Start audio capture with source tagging
      if (this.audioCaptureService) {
        try {
          await this.audioCaptureService.startCapture();
          console.log("🎤 Audio capture started with STABLE SOURCE TAGGING");
        } catch (error) {
          console.error("❌ Failed to start audio capture:", error);
          if (this.onErrorCallback) {
            this.onErrorCallback("Failed to start audio capture");
          }
        }
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`🎧 CLIENT RECEIVED: type=${data.type}`, data);

        if (data.type === "transcription" && this.onTranscriptionCallback) {
          console.log(`🎯 PROCESSING TRANSCRIPT: "${data.data.transcript}"`);

          // Use stable speaker detection
          const speaker = this.determineSpeakerFromAudioActivity();

          const result: TranscriptionResult = {
            transcript: data.data.transcript,
            isFinal: data.data.is_final,
            confidence: data.data.confidence,
            timestamp: data.data.timestamp,
            speaker: speaker,
          };

          console.log(
            `📝 STABLE TRANSCRIPTION: speaker=${speaker}, text="${data.data.transcript}"`,
          );
          this.onTranscriptionCallback(result);
        } else if (data.type === "transcription_started") {
          console.log(`✅ TRANSCRIPTION SERVICE STARTED`);
        } else if (data.type === "error" && this.onErrorCallback) {
          console.error(`❌ TRANSCRIPTION ERROR:`, data.error);
          this.onErrorCallback(data.error);
        }
      } catch (error) {
        console.error("❌ CLIENT PARSE ERROR:", error);
        if (this.onErrorCallback) {
          this.onErrorCallback("Failed to parse transcription response");
        }
      }
    };

    this.ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      if (this.onErrorCallback) {
        this.onErrorCallback("WebSocket connection error");
      }
    };

    this.ws.onclose = () => {
      console.log("🔌 WebSocket connection closed");
      if (this.audioCaptureService) {
        this.audioCaptureService.stopCapture();
      }
    };
  }

  // Required abstract method (not used in this implementation)
  sendAudio(audioData: ArrayBuffer): void {
    // This method is required by the abstract class but not used
    // since we're using sendAudioWithSource instead
  }

  async stop(): Promise<void> {
    if (this.audioCaptureService) {
      this.audioCaptureService.stopCapture();
    }

    if (this.ws) {
      this.ws.send(JSON.stringify({ type: "stop_transcription" }));
      this.ws.close();
      this.ws = null;
    }

    // Clear audio source timestamps
    this.audioSourceTimestamps.clear();

    console.log("🛑 Enhanced Deepgram service stopped");
  }

  onTranscription(callback: (result: TranscriptionResult) => void): void {
    this.onTranscriptionCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  cleanup(): void {
    this.stop();
    if (this.audioCaptureService) {
      this.audioCaptureService.cleanup();
      this.audioCaptureService = null;
    }
    this.room = null;
  }
}
