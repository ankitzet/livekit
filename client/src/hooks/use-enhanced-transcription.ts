// client/src/hooks/use-enhanced-transcription.ts
import { useState, useEffect, useCallback } from 'react';
import { Room } from 'livekit-client';
import { EnhancedDeepgramService } from '../services/enhanced-deepgram-service';
import { TranscriptionResult } from '../services/transcription-service';

export interface UseEnhancedTranscriptionReturn {
  isTranscribing: boolean;
  transcriptions: TranscriptionResult[];
  error: string | null;
  startTranscription: () => Promise<void>;
  stopTranscription: () => Promise<void>;
  clearTranscriptions: () => void;
}

export function useEnhancedTranscription(room: Room | null): UseEnhancedTranscriptionReturn {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deepgramService, setDeepgramService] = useState<EnhancedDeepgramService | null>(null);

  // Initialize service when room is available
  useEffect(() => {
    if (room && !deepgramService) {
      const service = new EnhancedDeepgramService();

      // Set up event handlers
      service.onTranscription((result: TranscriptionResult) => {
        console.log('📝 New transcription:', result);
        setTranscriptions(prev => {
          // Replace interim results, append final results
          if (result.isFinal) {
            return [...prev.filter(t => t.isFinal), result];
          } else {
            // Replace the last interim result if it exists
            const finalTranscriptions = prev.filter(t => t.isFinal);
            return [...finalTranscriptions, result];
          }
        });
      });

      service.onError((errorMessage: string) => {
        console.error('🚨 Transcription error:', errorMessage);
        setError(errorMessage);
        setIsTranscribing(false);
      });

      // Initialize with room
      service.initialize(room).then(() => {
        console.log('✅ Enhanced Deepgram service initialized');
        setDeepgramService(service);
      }).catch((err) => {
        console.error('❌ Failed to initialize Deepgram service:', err);
        setError('Failed to initialize transcription service');
      });
    }

    // Cleanup on unmount or room change
    return () => {
      if (deepgramService) {
        deepgramService.cleanup();
      }
    };
  }, [room, deepgramService]);

  const startTranscription = useCallback(async () => {
    if (!deepgramService) {
      setError('Transcription service not initialized');
      return;
    }

    try {
      setError(null);
      setIsTranscribing(true);
      await deepgramService.start();
      console.log('🎙️ Enhanced transcription started (capturing all participants)');
    } catch (err) {
      console.error('❌ Failed to start transcription:', err);
      setError(err instanceof Error ? err.message : 'Failed to start transcription');
      setIsTranscribing(false);
    }
  }, [deepgramService]);

  const stopTranscription = useCallback(async () => {
    if (!deepgramService) return;

    try {
      await deepgramService.stop();
      setIsTranscribing(false);
      console.log('🛑 Enhanced transcription stopped');
    } catch (err) {
      console.error('❌ Failed to stop transcription:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop transcription');
    }
  }, [deepgramService]);

  const clearTranscriptions = useCallback(() => {
    setTranscriptions([]);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (deepgramService) {
        deepgramService.cleanup();
      }
    };
  }, [deepgramService]);

  return {
    isTranscribing,
    transcriptions,
    error,
    startTranscription,
    stopTranscription,
    clearTranscriptions
  };
}