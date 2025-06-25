import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, Monitor, Settings, Play } from "lucide-react";

interface MeetingControlsProps {
  isMuted: boolean;
  isVideoDisabled: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onOpenSettings: () => void;
  
  // Interview tracking props
  isTimerRunning?: boolean;
  onStartTimer?: () => void;
  onStopTimer?: () => void;
  timerState?: any;
}

export default function MeetingControls({
  isMuted,
  isVideoDisabled,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onOpenSettings,
  isTimerRunning,
  onStartTimer,
  onStopTimer,
  timerState,
}: MeetingControlsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 p-4">
      <div className="flex justify-between items-center">
        {/* Left side - Interview tracking (Only for interviewers) */}
        <div className="flex items-center space-x-3">
          {isTimerRunning !== undefined && ( // Only show if timer props are provided (interviewer)
            !timerState?.currentBlock ? (
              <Button
                onClick={() => {
                  console.log('Start timer button clicked, onStartTimer:', typeof onStartTimer);
                  onStartTimer?.();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Tracking Interview Plan
              </Button>
            ) : (
              <div className="bg-white/10 text-white px-3 py-2 rounded-lg text-sm">
                <span className="text-green-400 font-medium">{timerState.currentBlock.label}</span>
                <span className="ml-2 text-gray-300">
                  {timerState.elapsedMinutes}:{timerState.elapsedSeconds.toString().padStart(2, '0')}
                </span>
              </div>
            )
          )}
        </div>

        {/* Center - Meeting controls */}
        <div className="flex justify-center items-center space-x-4">
          <Button
            onClick={onToggleMute}
            className={`w-12 h-12 rounded-full transition-colors ${
              isMuted 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            size="sm"
          >
            {isMuted ? (
              <MicOff className="text-white" size={20} />
            ) : (
              <Mic className="text-white" size={20} />
            )}
          </Button>

          <Button
            onClick={onToggleVideo}
            className={`w-12 h-12 rounded-full transition-colors ${
              isVideoDisabled 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            size="sm"
          >
            {isVideoDisabled ? (
              <VideoOff className="text-white" size={20} />
            ) : (
              <Video className="text-white" size={20} />
            )}
          </Button>

          <Button
            onClick={onToggleScreenShare}
            className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
            size="sm"
          >
            <Monitor className="text-white" size={20} />
          </Button>

          <Button
            onClick={onOpenSettings}
            className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
            size="sm"
          >
            <Settings className="text-white" size={20} />
          </Button>
        </div>

        {/* Right side - Empty for balance */}
        <div className="w-48"></div>
      </div>
    </div>
  );
}
