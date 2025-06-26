export interface JitsiMeetConfig {
  roomName: string;
  participantName: string;
  userRole?: 'interviewer' | 'candidate';
}

export interface JitsiMeetAPI {
  executeCommand: (command: string, ...args: any[]) => void;
  addEventListeners: (listeners: Record<string, Function>) => void;
  removeEventListeners: (listeners: Record<string, Function>) => void;
  dispose: () => void;
  getParticipantsInfo: () => any[];
  isAudioMuted: () => boolean;
  isVideoMuted: () => boolean;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: new (domain: string, options: any) => JitsiMeetAPI;
  }
}

export class JitsiService {
  private api: JitsiMeetAPI | null = null;
  private domain = 'meet.jit.si'; // Free Jitsi server
  private isConnected = false;
  private participants: any[] = [];
  private eventListeners: Record<string, Function[]> = {};

  async initializeJitsi(config: JitsiMeetConfig, containerElement: HTMLElement): Promise<void> {
    return new Promise((resolve, reject) => {
      // Load Jitsi Meet External API if not already loaded
      if (!window.JitsiMeetExternalAPI) {
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.onload = () => {
          this.createJitsiMeeting(config, containerElement, resolve, reject);
        };
        script.onerror = () => {
          reject(new Error('Failed to load Jitsi Meet External API'));
        };
        document.head.appendChild(script);
      } else {
        this.createJitsiMeeting(config, containerElement, resolve, reject);
      }
    });
  }

  private createJitsiMeeting(
    config: JitsiMeetConfig, 
    containerElement: HTMLElement, 
    resolve: Function, 
    reject: Function
  ): void {
    try {
      const options = {
        roomName: config.roomName,
        width: '100%',
        height: '100%',
        parentNode: containerElement,
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          enableClosePage: false,
          prejoinPageEnabled: false,
          disableInviteFunctions: true,
          toolbarButtons: [
            'microphone',
            'camera',
            'closedcaptions',
            'desktop',
            'fullscreen',
            'fodeviceselection',
            'hangup',
            'profile',
            'chat',
            'recording',
            'livestreaming',
            'etherpad',
            'sharedvideo',
            'settings',
            'raisehand',
            'videoquality',
            'filmstrip',
            'invite',
            'feedback',
            'stats',
            'shortcuts',
            'tileview',
            'videobackgroundblur',
            'download',
            'help',
            'mute-everyone',
            'security'
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: '',
          SHOW_POWERED_BY: false,
          DISPLAY_WELCOME_PAGE_CONTENT: false,
          DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
          APP_NAME: 'Interview Assistant',
          NATIVE_APP_NAME: 'Interview Assistant',
          PROVIDER_NAME: 'Interview Assistant',
          LANG_DETECTION: true,
          CONNECTION_INDICATOR_AUTO_HIDE_ENABLED: true,
          CONNECTION_INDICATOR_AUTO_HIDE_TIMEOUT: 5000,
          CONNECTION_INDICATOR_DISABLED: false,
          VIDEO_LAYOUT_FIT: 'both',
          FILM_STRIP_MAX_HEIGHT: 120,
          TILE_VIEW_MAX_COLUMNS: 5,
        },
        userInfo: {
          displayName: config.participantName,
          email: `${config.participantName}@interview.local`,
        }
      };

      this.api = new window.JitsiMeetExternalAPI(this.domain, options);

      // Set up event listeners
      const eventListeners = {
        readyToClose: () => {
          console.log('Jitsi meeting ready to close');
          this.cleanup();
        },
        participantJoined: (participant: any) => {
          console.log('Participant joined:', participant);
          this.participants.push(participant);
          this.emit('participantJoined', participant);
        },
        participantLeft: (participant: any) => {
          console.log('Participant left:', participant);
          this.participants = this.participants.filter(p => p.id !== participant.id);
          this.emit('participantLeft', participant);
        },
        videoConferenceJoined: (participant: any) => {
          console.log('Successfully joined Jitsi meeting:', participant);
          this.isConnected = true;
          this.emit('connected', participant);
          resolve(this.api);
        },
        videoConferenceLeft: () => {
          console.log('Left Jitsi meeting');
          this.isConnected = false;
          this.emit('disconnected');
        },
        audioMuteStatusChanged: (data: any) => {
          console.log('Audio mute status changed:', data);
          this.emit('audioMuteChanged', data);
        },
        videoMuteStatusChanged: (data: any) => {
          console.log('Video mute status changed:', data);
          this.emit('videoMuteChanged', data);
        }
      };

      this.api.addEventListeners(eventListeners);

      // Set display name
      setTimeout(() => {
        if (this.api) {
          this.api.executeCommand('displayName', config.participantName);
        }
      }, 1000);

    } catch (error) {
      console.error('Error creating Jitsi meeting:', error);
      reject(error);
    }
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  off(event: string, callback: Function): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  private emit(event: string, data?: any): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => callback(data));
    }
  }

  // Meeting controls
  toggleMute(): void {
    if (this.api) {
      this.api.executeCommand('toggleAudio');
    }
  }

  toggleVideo(): void {
    if (this.api) {
      this.api.executeCommand('toggleVideo');
    }
  }

  toggleScreenShare(): void {
    if (this.api) {
      this.api.executeCommand('toggleShareScreen');
    }
  }

  hangUp(): void {
    if (this.api) {
      this.api.executeCommand('hangup');
    }
  }

  // Getters
  getParticipants(): any[] {
    return this.participants;
  }

  isAudioMuted(): boolean {
    return this.api ? this.api.isAudioMuted() : false;
  }

  isVideoMuted(): boolean {
    return this.api ? this.api.isVideoMuted() : false;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Cleanup
  cleanup(): void {
    if (this.api) {
      this.api.dispose();
      this.api = null;
    }
    this.isConnected = false;
    this.participants = [];
    this.eventListeners = {};
  }
}

export const jitsiService = new JitsiService();