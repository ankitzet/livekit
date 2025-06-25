// client/src/components/video-grid.tsx

import { Room, LocalParticipant, RemoteParticipant, Track, RoomEvent, ParticipantEvent } from "livekit-client";
import { User, Mic, MicOff, Video as VideoIcon, VideoOff } from "lucide-react";
import { useEffect, useRef } from "react";

interface VideoGridProps {
  room: Room;
  localParticipant: LocalParticipant | null;
  participants: RemoteParticipant[];
}

function ParticipantVideo({ participant, isLocal = false, userRole }: { 
  participant: LocalParticipant | RemoteParticipant, 
  isLocal?: boolean,
  userRole?: string 
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Determine correct display name based on role
  const getDisplayName = () => {
    if (isLocal) {
      return userRole === 'interviewer' ? 'You (Interviewer)' : 'You (Candidate)';
    } else {
      // For remote participants, determine their role from their identity
      const participantRole = participant.identity.includes('interviewer') ? 'Interviewer' : 'Candidate';
      const shortId = participant.identity.split('-').pop()?.substring(0, 6) || '';
      return `${participantRole}-${shortId}`;
    }
  };

  const displayName = getDisplayName();

  useEffect(() => {
    if (!videoRef.current) return;

    const videoElement = videoRef.current;

    if (isLocal) {
      // Handle local participant
      const localParticipant = participant as LocalParticipant;

      const attachLocalVideo = () => {
        // Get video track from publications
        const videoTrack = Array.from(localParticipant.videoTrackPublications.values())[0]?.videoTrack;

        if (videoTrack && videoElement) {
          try {
            // Ensure element is ready before attaching
            if (videoElement.readyState !== undefined) {
              videoTrack.attach(videoElement);
              console.log('Local video attached for:', localParticipant.identity);
            }
          } catch (error) {
            console.error('Error attaching local video:', error);
          }
        }
      };

      // Try immediate attachment
      attachLocalVideo();

      // Listen for track published events
      const handleTrackPublished = () => {
        setTimeout(attachLocalVideo, 100);
      };

      localParticipant.on(ParticipantEvent.LocalTrackPublished, handleTrackPublished);

      return () => {
        localParticipant.off(ParticipantEvent.LocalTrackPublished, handleTrackPublished);
      };
    } else {
      // Handle remote participant
      const remoteParticipant = participant as RemoteParticipant;

      const attachRemoteVideo = () => {
        const videoTrack = Array.from(remoteParticipant.videoTrackPublications.values())[0]?.videoTrack;
        if (videoTrack && videoElement) {
          try {
            // Ensure element is ready before attaching
            if (videoElement.readyState !== undefined) {
              videoTrack.attach(videoElement);
              console.log('Remote video attached for:', remoteParticipant.identity);
            }
          } catch (error) {
            console.error('Error attaching remote video:', error);
          }
        }
      };

      const handleTrackSubscribed = (track: Track) => {
        if (track.kind === Track.Kind.Video) {
          try {
            track.attach(videoElement);
            console.log('Remote video track subscribed for:', remoteParticipant.identity);
          } catch (error) {
            console.error('Error attaching subscribed track:', error);
          }
        }
      };

      const handleTrackUnsubscribed = (track: Track) => {
        if (track.kind === Track.Kind.Video) {
          try {
            track.detach(videoElement);
            console.log('Remote video track unsubscribed for:', remoteParticipant.identity);
          } catch (error) {
            console.error('Error detaching unsubscribed track:', error);
          }
        }
      };

      // Attach existing tracks
      attachRemoteVideo();

      // Listen for new tracks
      remoteParticipant.on(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);
      remoteParticipant.on(ParticipantEvent.TrackUnsubscribed, handleTrackUnsubscribed);

      return () => {
        remoteParticipant.off(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);
        remoteParticipant.off(ParticipantEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      };
    }
  }, [participant, isLocal]);

  const hasVideo = participant.videoTrackPublications.size > 0;

  return (
    <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
      />

      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center text-gray-300">
            <User size={48} className="mx-auto mb-2" />
            <div className="text-sm font-medium">{displayName}</div>
            <div className="text-xs text-gray-400 mt-1">Camera Off</div>
          </div>
        </div>
      )}

      {/* Participant Info Overlay */}
      <div className="absolute bottom-3 left-3 flex items-center space-x-2">
        <div className="bg-black bg-opacity-70 rounded px-2 py-1 flex items-center space-x-1">
          {participant.isMicrophoneEnabled ? (
            <Mic size={12} className="text-green-400" />
          ) : (
            <MicOff size={12} className="text-red-400" />
          )}
          <span className="text-xs text-white font-medium">
            {displayName}
          </span>
        </div>
      </div>

      {/* Speaking Indicator */}
      {participant.isSpeaking && (
        <div className="absolute top-3 left-3">
          <div className="bg-green-500 px-2 py-1 rounded-full flex items-center space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-white">Speaking</span>
          </div>
        </div>
      )}

      {/* Video Controls for Local Participant */}
      {isLocal && (
        <div className="absolute bottom-3 right-3 flex space-x-2">
          <button className="w-8 h-8 bg-black bg-opacity-50 rounded-full flex items-center justify-center hover:bg-opacity-70 transition-colors">
            {participant.isCameraEnabled ? (
              <VideoIcon size={14} className="text-white" />
            ) : (
              <VideoOff size={14} className="text-red-400" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Audio-enabled participant component
function AudioEnabledParticipant({ participant, isLocal, userRole }: {
  participant: LocalParticipant | RemoteParticipant;
  isLocal: boolean;
  userRole?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!participant) return;

    const handleTrackSubscribed = (track: Track) => {
      console.log(`🎵 Track subscribed: ${track.kind} from ${participant.identity}`);

      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
        console.log(`✅ Video attached for ${participant.identity}`);
      } else if (track.kind === Track.Kind.Audio && !isLocal && audioRef.current) {
        track.attach(audioRef.current);
        audioRef.current.volume = 1.0;
        audioRef.current.muted = false;
        console.log(`✅ Audio attached for ${participant.identity} - Volume: ${audioRef.current.volume}`);

        // Force audio play to overcome autoplay restrictions
        audioRef.current.play().catch(e => console.log('Audio autoplay prevented:', e));
      }
    };

    const handleTrackUnsubscribed = (track: Track) => {
      console.log(`❌ Track unsubscribed: ${track.kind} from ${participant.identity}`);

      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.detach(videoRef.current);
      } else if (track.kind === Track.Kind.Audio && audioRef.current) {
        track.detach(audioRef.current);
      }
    };

    // Attach existing tracks immediately
    participant.audioTrackPublications.forEach((pub) => {
      if (pub.track) handleTrackSubscribed(pub.track);
    });

    participant.videoTrackPublications.forEach((pub) => {
      if (pub.track) handleTrackSubscribed(pub.track);
    });

    // Listen for future track changes
    participant.on(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);
    participant.on(ParticipantEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);
      participant.off(ParticipantEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    };
  }, [participant, isLocal]);

  const getDisplayName = () => {
    if (isLocal) {
      return userRole === 'interviewer' ? 'You (Interviewer)' : 'You (Candidate)';
    } else {
      const participantRole = participant.identity.includes('interviewer') ? 'Interviewer' : 'Candidate';
      const shortId = participant.identity.split('-').pop()?.substring(0, 6) || '';
      return `${participantRole}-${shortId}`;
    }
  };

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted={isLocal}
      />

      {/* CRITICAL: Audio element for remote participants */}
      {!isLocal && (
        <audio
          ref={audioRef}
          autoPlay
          playsInline
          style={{ display: 'none' }}
        />
      )}

      <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
        {getDisplayName()}
      </div>
    </div>
  );
}

export default function VideoGrid({ room, localParticipant, participants, userRole }: VideoGridProps & { userRole?: string }) {
  console.log('VideoGrid - Local participant:', localParticipant?.identity);
  console.log('VideoGrid - Remote participants:', participants.map(p => p.identity));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
      {/* Local participant */}
      {localParticipant && (
        <AudioEnabledParticipant 
          participant={localParticipant} 
          isLocal={true} 
          userRole={userRole}
        />
      )}

      {/* Remote participants with audio support */}
      {participants.map((participant) => (
        <AudioEnabledParticipant
          key={participant.identity}
          participant={participant}
          isLocal={false}
          userRole={userRole}
        />
      ))}

      {/* Placeholder when no remote participants */}
      {participants.length === 0 && localParticipant && (
        <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center border-2 border-dashed border-gray-300">
          <div className="text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Waiting for {userRole === 'interviewer' ? 'candidate' : 'interviewer'}...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Export AudioEnabledParticipant for use in meeting layout
export { AudioEnabledParticipant };
