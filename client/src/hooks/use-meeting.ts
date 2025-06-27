import { useState, useCallback, useEffect, useRef } from 'react';
import { jitsiService, type JitsiMeetConfig } from '@/services/jitsi-service';

export function useMeeting() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const connectToRoom = useCallback(async (roomName: string, participantName: string, userRole?: 'interviewer' | 'candidate') => {
    if (!containerRef.current) {
      setError('Meeting container not ready');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      const config: JitsiMeetConfig = {
        roomName,
        participantName,
        userRole
      };

      // Set up event listeners before connecting
      jitsiService.on('connected', (participant: any) => {
        console.log('Connected to Jitsi meeting:', participant);
        setIsConnected(true);
        setIsConnecting(false);
      });

      jitsiService.on('disconnected', () => {
        console.log('Disconnected from Jitsi meeting');
        setIsConnected(false);
        setParticipants([]);
      });

      jitsiService.on('participantJoined', (participant: any) => {
        console.log('Participant joined:', participant);
        setParticipants(prev => [...prev, participant]);
      });

      jitsiService.on('participantLeft', (participant: any) => {
        console.log('Participant left:', participant);
        setParticipants(prev => prev.filter(p => p.id !== participant.id));
      });

      jitsiService.on('audioMuteChanged', (data: any) => {
        setIsMuted(data.muted);
      });

      jitsiService.on('videoMuteChanged', (data: any) => {
        setIsVideoDisabled(data.muted);
      });

      await jitsiService.initializeJitsi(config, containerRef.current);
      
    } catch (err) {
      console.error('Failed to connect to Jitsi meeting:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to meeting');
      setIsConnecting(false);
    }
  }, []);

  const disconnectFromRoom = useCallback(async () => {
    try {
      jitsiService.cleanup();
      setIsConnected(false);
      setParticipants([]);
      setError(null);
    } catch (err) {
      console.error('Failed to disconnect from meeting:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect from meeting');
    }
  }, []);

  const toggleMute = useCallback(() => {
    jitsiService.toggleMute();
  }, []);

  const toggleVideo = useCallback(() => {
    jitsiService.toggleVideo();
  }, []);

  const toggleScreenShare = useCallback(() => {
    jitsiService.toggleScreenShare();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      jitsiService.cleanup();
    };
  }, []);

  return {
    containerRef,
    isConnecting,
    isConnected,
    error,
    participants,
    isMuted,
    isVideoDisabled,
    connectToRoom,
    disconnectFromRoom,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
  };
}