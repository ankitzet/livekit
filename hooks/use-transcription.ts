//client/src/hooks/use-transcription.ts
import { useState, useCallback, useEffect, useRef } from "react";
import {
  TranscriptionServiceFactory,
  TranscriptionResult,
} from "@/services/transcription-service";
import type { TranscriptionEntry } from "@/components/transcription-panel";

export function useTranscription(
  provider: "deepgram" | "elevenlabs" = "deepgram",
  room?: any,
  isInterviewer: boolean = false,
) {
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>(
    [],
  );
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcriptionServiceRef = useRef(
    TranscriptionServiceFactory.create(provider),
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const startTranscription = useCallback(async () => {
    try {
      setError(null);

      // Get user media with settings optimized for speech recognition
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 16000,
          channelCount: 1,
        },
      });

      audioStreamRef.current = stream;

      // CRITICAL: Use Web Audio API for PCM audio capture (replaces MediaRecorder)
      console.log("🎤 INITIALIZING: Web Audio API for PCM audio capture");

      try {
        const audioContext = new AudioContext({ sampleRate: 16000 });
        console.log("🎤 AudioContext created:", audioContext.sampleRate, "Hz");

        const source = audioContext.createMediaStreamSource(stream);
        console.log("🎤 MediaStreamSource created");

        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        console.log("🎤 ScriptProcessor created");

        processor.onaudioprocess = (event) => {
          const inputBuffer = event.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);

          // Check for meaningful audio
          const audioLevel = Math.max(...inputData.map(Math.abs));

          // Convert float32 to int16 PCM
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(
              -32768,
              Math.min(32767, inputData[i] * 32768),
            );
          }

          // Send audio data with threshold to reduce noise
          if (audioLevel > 0.01) {
            // Only send meaningful audio
            if (Math.random() < 0.05) {
              // Reduced logging
              console.log(
                `🎤 CAPTURING: PCM=${pcmData.length} samples, level=${audioLevel.toFixed(4)}`,
              );
            }
            transcriptionServiceRef.current.sendAudio(pcmData.buffer);
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        // Store references for cleanup
        audioContextRef.current = audioContext;
        sourceRef.current = source;
        processorRef.current = processor;

        // Mock MediaRecorder interface for compatibility
        mediaRecorderRef.current = {
          stop: () => {
            console.log("🎤 CLEANUP: Stopping Web Audio API");
            if (processor) processor.disconnect();
            if (source) source.disconnect();
            if (audioContext && audioContext.state !== "closed")
              audioContext.close();
          },
          state: "recording",
        } as any;

        console.log("🎤 SUCCESS: Web Audio API transcription started");
        console.log("Transcription started successfully with Web Audio API");
      } catch (error) {
        console.error("🎤 FAILED: Web Audio API setup error:", error);
        throw error;
      }

      // Set up transcription service callbacks
      transcriptionServiceRef.current.onTranscription(
        (result: TranscriptionResult) => {
          // Process all transcripts
          if (!result.transcript || result.transcript.trim().length === 0) {
            return;
          }

          // Determine speaker based on participant identity or role
          const determineSpeaker = () => {
            // Primary: Use URL parameter
            const urlParams = new URLSearchParams(window.location.search);
            const role = urlParams.get("role");

            if (role === "interviewer") {
              return "Interviewer";
            } else if (role === "candidate") {
              return "Candidate";
            }

            // Secondary: Check participant identity
            const participantIdentity = room?.localParticipant?.identity || "";
            if (participantIdentity.includes("interviewer")) {
              return "Interviewer";
            } else if (participantIdentity.includes("candidate")) {
              return "Candidate";
            }

            // Fallback: Use the isInterviewer parameter
            return isInterviewer ? "Interviewer" : "Candidate";
          };

          const speakerRole = determineSpeaker();

          const entry: TranscriptionEntry = {
            id: `${Date.now()}-${Math.random()}`,
            speaker: speakerRole,
            text: result.transcript,
            timestamp: result.timestamp,
            isFinal: result.isFinal,
            confidence: result.confidence,
          };

          setTranscriptions((prev) => {
            const finalEntries = prev.filter((t) => t.isFinal);
            const newTranscriptions = result.isFinal
              ? [...finalEntries, entry]
              : [...finalEntries, entry];

            // Broadcast final transcription to interviewer via data channel
            if (result.isFinal && room?.localParticipant && !isInterviewer) {
              try {
                const transcriptionData = JSON.stringify({
                  type: "transcription",
                  entry: entry,
                });
                room.localParticipant.publishData(
                  new TextEncoder().encode(transcriptionData),
                  { reliable: true },
                );
                console.log(
                  "Broadcasting transcription to interviewer:",
                  entry.text,
                );
              } catch (error) {
                console.error("Error broadcasting transcription:", error);
              }
            }

            return newTranscriptions;
          });
        },
      );

      transcriptionServiceRef.current.onError((errorMessage: string) => {
        console.error("Transcription error:", errorMessage);
        setError(errorMessage);
        setIsTranscribing(false);
      });

      // Start transcription service
      await transcriptionServiceRef.current.start();

      setIsTranscribing(true);
      console.log("Transcription started successfully with MediaRecorder");
    } catch (err) {
      console.error("Failed to start transcription:", err);
      setError(
        err instanceof Error ? err.message : "Failed to start transcription",
      );
      setIsTranscribing(false);
    }
  }, []);

  const stopTranscription = useCallback(async () => {
    if (!isTranscribing) return;

    try {
      console.log("Stopping transcription service...");

      // Stop transcription service first
      if (transcriptionServiceRef.current) {
        await transcriptionServiceRef.current.stop();
      }

      // Clean up Web Audio API resources
      if (processorRef.current) {
        try {
          processorRef.current.disconnect();
          processorRef.current.onaudioprocess = null;
        } catch (e) {
          console.warn("Error disconnecting processor:", e);
        }
        processorRef.current = null;
      }

      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {
          console.warn("Error disconnecting source:", e);
        }
        sourceRef.current = null;
      }

      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        try {
          await audioContextRef.current.close();
        } catch (e) {
          console.warn("Error closing audio context:", e);
        }
        audioContextRef.current = null;
      }

      // Stop MediaRecorder interface
      if (mediaRecorderRef.current && mediaRecorderRef.current.stop) {
        mediaRecorderRef.current.stop();
      }

      // Stop audio stream
      if (audioStreamRef.current) {
        console.log("Stopping media stream...");
        try {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
        } catch (e) {
          console.warn("Error stopping media tracks:", e);
        }
        audioStreamRef.current = null;
      }

      // Clean up MediaRecorder reference
      mediaRecorderRef.current = null;

      setIsTranscribing(false);
      setError(null);
      console.log("Transcription stopped successfully");
    } catch (err) {
      console.error("Failed to stop transcription:", err);
      setError(
        err instanceof Error ? err.message : "Failed to stop transcription",
      );

      // Force cleanup even if error occurred
      audioStreamRef.current = null;
      mediaRecorderRef.current = null;
      setIsTranscribing(false);
    }
  }, [isTranscribing]);

  const clearTranscriptions = useCallback(() => {
    setTranscriptions([]);
  }, []);

  // Clean up on unmount with proper async handling
  useEffect(() => {
    return () => {
      if (isTranscribing) {
        stopTranscription().catch(console.error);
      }
    };
  }, [isTranscribing, stopTranscription]);

  // Additional cleanup for page navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (
        isTranscribing &&
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        try {
          // Synchronous emergency cleanup
          if (processorRef.current) {
            processorRef.current.disconnect();
          }
          if (sourceRef.current) {
            sourceRef.current.disconnect();
          }
          audioContextRef.current.close();
        } catch (e) {
          console.warn("Emergency cleanup failed:", e);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isTranscribing]);

  // Listen for transcriptions from other participants (only if interviewer)
  useEffect(() => {
    if (!room || !isInterviewer) return;

    const handleDataReceived = (payload: Uint8Array, participant: any) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === "transcription") {
          const speakerName = participant.identity?.startsWith("interviewer-")
            ? "Interviewer"
            : "Candidate";
          const entry: TranscriptionEntry = {
            ...data.entry,
            speaker: speakerName,
            id: `${participant.identity}-${data.entry.id}`,
          };

          setTranscriptions((prev) => [...prev, entry]);
        }
      } catch (error) {
        console.error("Error parsing transcription data:", error);
      }
    };

    room.on("dataReceived", handleDataReceived);

    return () => {
      room.off("dataReceived", handleDataReceived);
    };
  }, [room, isInterviewer]);

  return {
    transcriptions,
    isTranscribing,
    error,
    startTranscription,
    stopTranscription,
    clearTranscriptions,
  };
}
