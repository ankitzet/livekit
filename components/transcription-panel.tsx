//client/src/components/transcription-panel.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Pause, Play, Trash2, User } from "lucide-react";
import { useEffect, useRef } from "react";

export interface TranscriptionEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
  isFinal: boolean;
  confidence: number;
  source?: "local" | "remote" | "mixed";
}

interface TranscriptionPanelProps {
  transcriptions: TranscriptionEntry[];
  isTranscribing: boolean;
  onStartTranscription: () => void;
  onStopTranscription: () => void;
  onClearTranscriptions: () => void;
  provider: "deepgram" | "elevenlabs";
}

export default function TranscriptionPanel({
  transcriptions,
  isTranscribing,
  onStartTranscription,
  onStopTranscription,
  onClearTranscriptions,
  provider,
}: TranscriptionPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Force scroll to bottom with multiple methods
  const scrollToBottom = () => {
    if (scrollRef.current) {
      // Method 1: Set scrollTop
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;

      // Method 2: Use scrollIntoView as backup
      setTimeout(() => {
        if (scrollRef.current) {
          const lastChild = scrollRef.current.lastElementChild;
          if (lastChild) {
            lastChild.scrollIntoView({ behavior: "smooth", block: "end" });
          }
        }
      }, 50);
    }
  };

  // Auto-scroll when transcriptions change
  useEffect(() => {
    console.log(
      "🔄 Transcriptions changed, scrolling to bottom...",
      transcriptions.length,
    );
    scrollToBottom();
  }, [transcriptions]);

  // Also scroll when isTranscribing changes
  useEffect(() => {
    if (isTranscribing) {
      scrollToBottom();
    }
  }, [isTranscribing]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const finalTranscriptions = transcriptions.filter((t) => t.isFinal);
  const currentTranscription = transcriptions.find((t) => !t.isFinal);

  return (
    <Card className="bg-white text-gray-900 flex flex-col h-full">
      <CardHeader className="px-4 py-3 border-b border-gray-200 flex flex-row items-center justify-between space-y-0 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <h3 className="font-semibold">Live Transcription</h3>
          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium capitalize">
            {provider}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={
              isTranscribing ? onStopTranscription : onStartTranscription
            }
            variant="outline"
            size="sm"
          >
            {isTranscribing ? (
              <>
                <Pause className="mr-1" size={14} />
                Stop
              </>
            ) : (
              <>
                <Play className="mr-1" size={14} />
                Start
              </>
            )}
          </Button>

          <Button
            onClick={onClearTranscriptions}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </CardHeader>

      <CardContent
        ref={scrollRef}
        className="p-4 flex-1 overflow-y-auto overflow-x-hidden"
        style={{
          maxHeight: "calc(100vh - 200px)", // Limit height to viewport minus some margin
          minHeight: "300px", // Minimum height
        }}
      >
        <div className="space-y-3">
          {finalTranscriptions.length === 0 && !currentTranscription && (
            <div className="text-center py-8 text-gray-500">
              <User size={32} className="mx-auto mb-2" />
              <p className="text-sm">
                {isTranscribing
                  ? "Start speaking to see live transcription"
                  : "Click 'Start' to begin transcription"}
              </p>
            </div>
          )}

          {finalTranscriptions.map((entry) => (
            <div key={entry.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    entry.speaker === "Interviewer"
                      ? "bg-blue-500"
                      : "bg-green-500"
                  }`}
                >
                  <span className="text-white text-xs font-medium">
                    {entry.speaker === "Interviewer" ? "I" : "C"}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-sm">{entry.speaker}</span>
                  <span className="text-xs text-gray-500">
                    {formatTime(entry.timestamp)}
                  </span>
                  {entry.confidence && (
                    <span className="text-xs text-gray-400">
                      {Math.round(entry.confidence * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800 break-words">
                  {entry.text}
                </p>
              </div>
            </div>
          ))}

          {/* Live transcription indicator */}
          {currentTranscription && (
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentTranscription.speaker === "Interviewer"
                      ? "bg-blue-500"
                      : "bg-green-500"
                  }`}
                >
                  <span className="text-white text-xs font-medium">
                    {currentTranscription.speaker === "Interviewer" ? "I" : "C"}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-sm">
                    {currentTranscription.speaker}
                  </span>
                  <span className="text-xs text-gray-500">Now</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-livekit rounded-full animate-pulse"></div>
                    <div
                      className="w-1 h-1 bg-livekit rounded-full animate-pulse"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-1 h-1 bg-livekit rounded-full animate-pulse"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 italic break-words">
                  {currentTranscription.text}
                </p>
              </div>
            </div>
          )}

          {/* Invisible div to ensure we can scroll to the very bottom */}
          <div className="h-1" />
        </div>
      </CardContent>
    </Card>
  );
}
