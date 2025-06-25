import { useState, useCallback, useEffect } from 'react';
import { Room, RemoteParticipant, LocalParticipant, RoomEvent } from 'livekit-client';
import { liveKitService } from '@/services/livekit-service';

export function useMeeting() {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);

  const connectToRoom = useCallback(async (roomName: string, participantName: string) => {
    try {
      setIsConnecting(true);
      setError(null);

      const connectedRoom = await liveKitService.connectToRoom(roomName, participantName);
      
      setRoom(connectedRoom);
      setIsConnected(true);
      setLocalParticipant(connectedRoom.localParticipant);
      setParticipants(Array.from(connectedRoom.remoteParticipants.values()));

      // Set up event listeners with error handling
      connectedRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('Participant connected:', participant.identity);
        setParticipants(prev => [...prev, participant]);
      });

      connectedRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log('Participant disconnected:', participant.identity);
        setParticipants(prev => prev.filter(p => p.sid !== participant.sid));
      });

      connectedRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('Track subscribed:', track.kind, 'from', participant.identity);
        // Force re-render when tracks are subscribed
        setParticipants(prev => [...prev]);
      });

      connectedRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
        setParticipants(prev => [...prev]);
      });

      connectedRoom.on(RoomEvent.LocalTrackPublished, () => {
        setIsMuted(!connectedRoom.localParticipant.isMicrophoneEnabled);
        setIsVideoDisabled(!connectedRoom.localParticipant.isCameraEnabled);
      });

      connectedRoom.on(RoomEvent.LocalTrackUnpublished, () => {
        setIsMuted(!connectedRoom.localParticipant.isMicrophoneEnabled);
        setIsVideoDisabled(!connectedRoom.localParticipant.isCameraEnabled);
      });

      connectedRoom.on(RoomEvent.Disconnected, (reason) => {
        console.log('Room disconnected, reason:', reason);
        // Only log unexpected disconnections, don't attempt auto-reconnect to avoid loops
        if (reason !== 'CLIENT_INITIATED') {
          console.warn('Unexpected disconnection detected');
        }
        setIsConnected(false);
        setRoom(null);
        setLocalParticipant(null);
        setParticipants([]);
      });

      connectedRoom.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        if (quality === 'poor') {
          console.warn('Poor connection quality for:', participant.identity);
        }
      });

      // Simple event handlers without complex reconnection logic
      connectedRoom.on(RoomEvent.Reconnecting, () => {
        console.log('Reconnecting...');
      });

      connectedRoom.on(RoomEvent.Reconnected, () => {
        console.log('Reconnected');
        setError(null);
      });

    } catch (err) {
      console.error('Failed to connect to room:', err);
      let errorMessage = 'Failed to connect to room';
      
      if (err instanceof Error) {
        if (err.message.includes('timeout')) {
          errorMessage = 'Connection timeout - please check your internet connection';
        } else if (err.message.includes('unauthorized')) {
          errorMessage = 'Authentication failed - please try again';
        } else if (err.message.includes('not found')) {
          errorMessage = 'Room not found - please check the room name';
        } else if (err.message.includes('Failed to get access token')) {
          errorMessage = 'Failed to get access token';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectFromRoom = useCallback(async () => {
    try {
      await liveKitService.disconnectFromRoom();
      setRoom(null);
      setLocalParticipant(null);
      setParticipants([]);
      setIsConnected(false);
      setError(null);
    } catch (err) {
      console.error('Failed to disconnect from room:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect from room');
    }
  }, []);

  const toggleMute = useCallback(async () => {
    try {
      const muted = await liveKitService.toggleMute();
      setIsMuted(!muted);
    } catch (err) {
      console.error('Failed to toggle mute:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle microphone');
    }
  }, []);

  const toggleVideo = useCallback(async () => {
    try {
      const videoEnabled = await liveKitService.toggleVideo();
      setIsVideoDisabled(!videoEnabled);
    } catch (err) {
      console.error('Failed to toggle video:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle camera');
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (room && isConnected) {
        liveKitService.disconnectFromRoom();
      }
    };
  }, [room, isConnected]);

  return {
    room,
    isConnecting,
    isConnected,
    error,
    participants,
    localParticipant,
    isMuted,
    isVideoDisabled,
    connectToRoom,
    disconnectFromRoom,
    toggleMute,
    toggleVideo,
  };
}
