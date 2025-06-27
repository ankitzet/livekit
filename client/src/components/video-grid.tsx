import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff, User, Wifi, WifiOff } from 'lucide-react';

interface VideoGridProps {
  containerRef: React.RefObject<HTMLDivElement>;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  participants: any[];
  roomName: string;
  onRetry?: () => void;
}

export default function VideoGrid({
  containerRef,
  isConnecting,
  isConnected,
  error,
  participants,
  roomName,
  onRetry
}: VideoGridProps) {
  if (error) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-red-600 mb-4">
            <WifiOff className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Connection Error
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          {onRetry && (
            <Button onClick={onRetry}>
              Try Again
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (isConnecting) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-blue-600 mb-4">
            <Video className="w-12 h-12 mx-auto animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Connecting to Meeting
          </h3>
          <p className="text-gray-600">
            Setting up your video connection...
          </p>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="h-full relative">
      {/* Meeting Status Bar */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
        <Badge 
          variant={isConnected ? "default" : "secondary"}
          className="bg-white/90 backdrop-blur-sm"
        >
          {isConnected ? (
            <>
              <Wifi className="w-3 h-3 mr-1" />
              Connected
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 mr-1" />
              Disconnected
            </>
          )}
        </Badge>
        
        {participants.length > 0 && (
          <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
            <User className="w-3 h-3 mr-1" />
            {participants.length + 1} participants
          </Badge>
        )}
      </div>

      {/* Room Name */}
      <div className="absolute top-4 right-4 z-10">
        <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
          Room: {roomName}
        </Badge>
      </div>

      {/* Jitsi Meet Container */}
      <div 
        ref={containerRef} 
        className="w-full h-full rounded-lg overflow-hidden bg-gray-900"
        style={{ minHeight: '400px' }}
      />
      
      {!isConnected && !isConnecting && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg">
          <div className="text-center text-white">
            <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Ready to join meeting</p>
            <p className="text-sm text-gray-400 mt-2">
              Click connect to start your video call
            </p>
          </div>
        </div>
      )}
    </div>
  );
}