//client/src/services/livekit-service.ts
import { Room, RemoteParticipant, LocalParticipant, RoomEvent, RemoteTrackPublication } from "livekit-client";

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  roomName: string;
  meetingId: number;
}

export class LiveKitService {
  private room: Room | null = null;A

  async getAccessToken(roomName: string, participantName: string): Promise<LiveKitTokenResponse> {
    const response = await fetch('/api/livekit/token', {
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

    return response.json();
  }

  async connectToRoom(roomName: string, participantName: string): Promise<Room> {
    try {
      // Disconnect existing room first
      if (this.room) {
        await this.disconnectFromRoom();
      }

      const { token, url } = await this.getAccessToken(roomName, participantName);
      
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
      await this.room.connect(url, token);
      console.log('Successfully connected to room');
      
      // Enable camera and microphone with error handling
      try {
        await this.room.localParticipant.enableCameraAndMicrophone();
        console.log('Camera and microphone enabled successfully');
      } catch (mediaError) {
        console.warn('Failed to enable media, will allow manual retry:', mediaError);
      }
      
      // Set participant metadata with timeout protection
      try {
        await Promise.race([
          this.room.localParticipant.setMetadata(JSON.stringify({ name: participantName })),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Metadata timeout')), 2000))
        ]);
      } catch (metadataError) {
        console.warn('Metadata setting failed, continuing:', metadataError);
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
