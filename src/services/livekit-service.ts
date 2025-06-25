import { Room, RemoteParticipant, LocalParticipant, RoomEvent, RemoteTrackPublication } from "livekit-client";

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  roomName: string;
  meetingId: number;
}

export class LiveKitService {
  private room: Room | null = null;

  async getAccessToken(roomName: string, participantName: string): Promise<LiveKitTokenResponse> {
    // For local development, we'll use a mock token
    const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;
    
    // In a real app, this would be a server call
    // For demo purposes, we're using the client-side API directly
    const response = await fetch('/api/livekit-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomName,
        participantName,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get access token');
    }

    return await response.json();
  }

  async connectToRoom(roomName: string, participantName: string): Promise<Room> {
    try {
      // Disconnect existing room first
      if (this.room) {
        await this.disconnectFromRoom();
      }

      // For demo purposes, we'll create a token directly
      // In production, this should be done server-side
      const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;
      
      // Create a mock token response
      const mockResponse = {
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTA3ODAwMDAsImlzcyI6IkFQSVMyU0ZhTndFVnozUiIsIm5hbWUiOiJUZXN0IFVzZXIiLCJuYmYiOjE3NTA2OTM2MDAsInN1YiI6InRlc3QtdXNlciIsInZpZGVvIjp7InJvb20iOiJ0ZXN0LXJvb20iLCJyb29tSm9pbiI6dHJ1ZX19.HS4A0Nj_OdVe9rGFvHFEkCVnrfn2F2WTYUIkTlTDtlk",
        url: livekitUrl,
        roomName,
        meetingId: 1
      };
      
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          dtx: false, // Disable discontinuous transmission
          stopMicTrackOnMute: false,
          videoCodec: 'vp8',
        },
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      console.log('Connecting to room with enhanced configuration...');
      await this.room.connect(mockResponse.url, mockResponse.token);
      console.log('Successfully connected to room');
      
      // Enable camera and microphone with error handling
      try {
        await this.room.localParticipant.enableCameraAndMicrophone();
        console.log('Camera and microphone enabled successfully');
      } catch (mediaError) {
        console.warn('Failed to enable media, will allow manual retry:', mediaError);
      }

      return this.room;
    } catch (error) {
      console.error('Failed to connect to room:', error);
      throw error;
    }
  }

  async disconnectFromRoom(): Promise<void> {
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
  }

  getRoom(): Room | null {
    return this.room;
  }

  async toggleMute(): Promise<boolean> {
    if (!this.room) return false;
    
    const enabled = this.room.localParticipant.isMicrophoneEnabled;
    await this.room.localParticipant.setMicrophoneEnabled(!enabled);
    return !enabled;
  }

  async toggleVideo(): Promise<boolean> {
    if (!this.room) return false;
    
    const enabled = this.room.localParticipant.isCameraEnabled;
    await this.room.localParticipant.setCameraEnabled(!enabled);
    return !enabled;
  }

  async toggleScreenShare(): Promise<boolean> {
    if (!this.room) return false;
    
    const isSharing = this.room.localParticipant.isScreenShareEnabled;
    await this.room.localParticipant.setScreenShareEnabled(!isSharing);
    return !isSharing;
  }

  onParticipantConnected(callback: (participant: RemoteParticipant) => void): void {
    if (this.room) {
      this.room.on(RoomEvent.ParticipantConnected, callback);
    }
  }

  onParticipantDisconnected(callback: (participant: RemoteParticipant) => void): void {
    if (this.room) {
      this.room.on(RoomEvent.ParticipantDisconnected, callback);
    }
  }

  onTrackPublished(callback: (publication: RemoteTrackPublication, participant: RemoteParticipant) => void): void {
    if (this.room) {
      this.room.on(RoomEvent.TrackPublished, callback);
    }
  }
}

export const liveKitService = new LiveKitService();