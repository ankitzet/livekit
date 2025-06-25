import { AlertTriangle, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { TimerState } from '@/hooks/use-interview-timer';

interface InterviewNudgeProps {
  timerState: TimerState;
  onDismiss: () => void;
  className?: string;
}

export default function InterviewNudge({
  timerState,
  onDismiss,
  className = ""
}: InterviewNudgeProps) {
  const { shouldShowNudge, nextBlock, elapsedMinutes } = timerState;

  if (!shouldShowNudge || !nextBlock) {
    return null;
  }

  return (
    <Card className={`border-orange-200 bg-orange-50 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-sm text-orange-800">
                ⏱ Time Reminder
              </p>
              <Button
                onClick={onDismiss}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-sm text-orange-700 mb-3">
              You planned to begin <strong>{nextBlock.label}</strong> by now ({elapsedMinutes} min elapsed). 
              Do you want to continue or move on?
            </p>
            <div className="flex space-x-2">
              <Button
                onClick={onDismiss}
                size="sm"
                variant="outline"
                className="text-xs h-7 bg-white border-orange-200 text-orange-700 hover:bg-orange-100"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Got it
              </Button>
              <Button
                onClick={onDismiss}
                size="sm"
                variant="ghost"
                className="text-xs h-7 text-orange-600 hover:text-orange-800"
              >
                Later
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}