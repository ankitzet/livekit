import { Clock, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TimerState } from '@/hooks/use-interview-timer';

interface InterviewTimerPanelProps {
  timerState: TimerState;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  className?: string;
}

export default function InterviewTimerPanel({
  timerState,
  isRunning,
  onStart,
  onStop,
  onReset,
  className = ""
}: InterviewTimerPanelProps) {
  const { elapsedMinutes, elapsedSeconds, currentBlock, nextBlock } = timerState;
  
  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span className="font-medium">Interview Timer</span>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              onClick={isRunning ? onStop : onStart}
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
            >
              {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
            <Button
              onClick={onReset}
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="text-center mb-4">
          <div className="text-2xl font-mono font-bold text-blue-600">
            {formatTime(elapsedMinutes, elapsedSeconds)}
          </div>
          <div className="text-sm text-gray-500">Elapsed Time</div>
        </div>

        {currentBlock && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current:</span>
              <Badge variant="default" className="bg-blue-100 text-blue-800">
                {currentBlock.label} ({currentBlock.minutes} min)
              </Badge>
            </div>
            
            {nextBlock && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Next:</span>
                <Badge variant="outline" className="text-gray-600">
                  {nextBlock.label} ({nextBlock.minutes} min)
                </Badge>
              </div>
            )}
          </div>
        )}

        {!currentBlock && !isRunning && (
          <div className="text-center text-sm text-gray-500">
            Start timer to track interview progress
          </div>
        )}
      </CardContent>
    </Card>
  );
}