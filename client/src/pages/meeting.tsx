//client/src/pages/meeting.tsx

import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useJitsiMeeting } from "@/hooks/use-jitsi-meeting";
import { useTranscription } from "@/hooks/use-transcription";
import { useFollowUpSuggestions } from "@/hooks/use-follow-up-suggestions";
import { useInterviewTimer } from "@/hooks/use-interview-timer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import JitsiMeetingContainer from "@/components/jitsi-meeting-container";
import MeetingControls from "@/components/meeting-controls";
import { ErrorBoundary } from "@/components/error-boundary";

import {
  Video,
  Mic,
  Clock,
  Lightbulb,
  Copy,
  Play,
  Square,
  User,
  Share2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";

interface MeetingProps {
  params: {
    roomName: string;
  };
}

export default function Meeting({ params }: MeetingProps) {
  const { roomName } = params;
  const urlParams = new URLSearchParams(window.location.search);
  const isInterviewer = urlParams.get("role") === "interviewer";

  const [customInstruction, setCustomInstruction] = useState("");
  const [interviewPlan, setInterviewPlan] = useState(() => {
    // First try to get from sessionStorage (from home page)
    const sessionPlan = sessionStorage.getItem("interviewPlan");
    if (sessionPlan) {
      try {
        // Parse the text format: "Intro - 5\nTechnical - 20\nQ&A - 10"
        const parsed = sessionPlan
          .split("\n")
          .map((line) => {
            const match = line.trim().match(/^(.+?)\s*-\s*(\d+)$/);
            if (match) {
              return {
                label: match[1].trim(),
                minutes: parseInt(match[2], 10),
              };
            }
            return null;
          })
          .filter(Boolean);

        if (parsed.length > 0) {
          return parsed;
        }
      } catch (error) {
        console.log("Error parsing interview plan from sessionStorage:", error);
      }
    }

    // Fallback to localStorage with room-specific key
    const saved = localStorage.getItem(`interviewPlan-${roomName}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [
          { label: "Introduction", minutes: 5 },
          { label: "Technical Questions", minutes: 20 },
          { label: "Q&A", minutes: 10 },
          { label: "Wrap-up", minutes: 5 },
        ];
      }
    }

    // Default plan if nothing found
    return [
      { label: "Introduction", minutes: 5 },
      { label: "Technical Questions", minutes: 20 },
      { label: "Q&A", minutes: 10 },
      { label: "Wrap-up", minutes: 5 },
    ];
  });

  const {
    containerRef,
    isConnected,
    isConnecting,
    error,
    participants,
    isMuted,
    isVideoDisabled,
    connectToRoom,
    disconnectFromRoom,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
  } = useJitsiMeeting();

  const {
    transcriptions: rawTranscriptions,
    isTranscribing,
    startTranscription,
    stopTranscription,
    clearTranscriptions,
    error: transcriptionError,
  } = useTranscription("deepgram", null, isInterviewer);

  const transcriptions = rawTranscriptions.map((t, index) => ({
    id: `${t.timestamp}-${index}`,
    speaker: t.speaker || "Mixed Audio",
    text: t.text,
    timestamp: t.timestamp,
    isFinal: t.isFinal,
    confidence: t.confidence,
  }));

  const { suggestions, isLoading, generateSuggestions } =
    useFollowUpSuggestions();

  const timerHook = useInterviewTimer(interviewPlan);
  const {
    timerState,
    isRunning: isTimerRunning,
    start: startTimer,
    stop: stopTimer,
    reset: resetTimer,
  } = timerHook;

  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const participantName = isInterviewer
      ? `Interviewer-${Date.now()}`
      : `Candidate-${Date.now()}`;
    
    const userRole = isInterviewer ? 'interviewer' : 'candidate';
    connectToRoom(roomName, participantName, userRole);

    return () => {
      disconnectFromRoom();
    };
  }, [roomName, isInterviewer, connectToRoom, disconnectFromRoom]);

  const shareLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const candidateUrl = `${baseUrl}?role=candidate`;
    const interviewerUrl = `${baseUrl}?role=interviewer`;

    if (isInterviewer) {
      navigator.clipboard.writeText(candidateUrl);
    } else {
      navigator.clipboard.writeText(interviewerUrl);
    }
  };

  const handleRetryConnection = () => {
    const participantName = isInterviewer
      ? `Interviewer-${Date.now()}`
      : `Candidate-${Date.now()}`;
    
    const userRole = isInterviewer ? 'interviewer' : 'candidate';
    connectToRoom(roomName, participantName, userRole);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-red-600 mb-4">
            <Video className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Connection Error
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleRetryConnection}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="flex justify-between items-center px-6 py-3">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {roomName}
            </h1>
            <Badge
              variant={isConnected ? "default" : "secondary"}
              className="text-xs"
            >
              {isConnected ? "Connected" : isConnecting ? "Connecting..." : "Disconnected"}
            </Badge>
            {participants.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {participants.length + 1} participants
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={shareLink}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              <Share2 className="w-3 h-3 mr-1" />
              Copy Candidate Link
            </Button>
            {isInterviewer && (
              <Button
                onClick={() => {
                  disconnectFromRoom();
                  window.location.href = "/";
                }}
                size="sm"
                variant="destructive"
                className="text-xs"
              >
                End Interview
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 pt-20">
        {/* New Meeting Layout for Interviewer */}
        {isInterviewer && (
          <div className="h-[calc(100vh-200px)] flex gap-4">
            {/* Main Content Area - Video Meeting (70% width) */}
            <div className="flex-1 relative">
              {/* Timer Nudge - Only visible to interviewer */}
              {timerState?.shouldShowNudge && timerState?.nextBlock && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg animate-pulse">
                  <p className="text-sm font-medium">
                    Start "{timerState.nextBlock.label}" in 5 seconds
                  </p>
                </div>
              )}

              {/* 5-Second Countdown Overlay */}
              {timerState?.countdownSecondsLeft &&
                timerState.countdownSecondsLeft > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                    <div className="bg-black/70 backdrop-blur-sm text-white px-6 py-4 rounded-xl shadow-2xl border border-white/20">
                      <div className="text-center">
                        <div className="text-lg font-semibold mb-1">
                          Reminder - Time for next part starts in
                        </div>
                        <div className="text-3xl font-bold text-yellow-400">
                          {Math.ceil(timerState.countdownSecondsLeft)} sec
                        </div>
                        {timerState.nextBlock && (
                          <div className="text-sm text-gray-300 mt-1">
                            Next: {timerState.nextBlock.label}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* Jitsi Meeting Container */}
              <JitsiMeetingContainer
                containerRef={containerRef}
                isConnecting={isConnecting}
                isConnected={isConnected}
                error={error}
                participants={participants}
                roomName={roomName}
                onRetry={handleRetryConnection}
              />

              {/* Interview Plan Panel - Bottom right corner */}
              {timerState?.currentBlock && (
                <div className="absolute bottom-4 right-4 w-56 z-20">
                  <div className="bg-white/95 backdrop-blur rounded-lg p-3 shadow-lg">
                    {/* Timer Display */}
                    <div className="text-center mb-3">
                      <div className="text-lg font-mono text-black">
                        {timerState.elapsedMinutes}:
                        {timerState.elapsedSeconds.toString().padStart(2, "0")}
                      </div>
                    </div>

                    {/* Interview Plan Progress */}
                    <div className="space-y-1">
                      {interviewPlan.map((block, index) => (
                        <div
                          key={index}
                          className={`flex justify-between text-xs p-1 rounded ${
                            timerState.currentBlockIndex === index
                              ? "bg-green-100 text-green-800 font-medium"
                              : index < timerState.currentBlockIndex
                                ? "bg-gray-100 text-gray-600 line-through"
                                : "text-black"
                          }`}
                        >
                          <span>{block.label}</span>
                          <span>{block.minutes}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar (30% width) */}
            <div className="w-[30%] flex flex-col space-y-4">
              {/* Follow-Up Suggestions (Top 50%) */}
              <Card className="flex-1 rounded-xl bg-white/90 backdrop-blur shadow-lg border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-lg">
                    <Lightbulb className="w-4 h-4 mr-2 text-amber-600" />
                    Follow-Up Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 flex-1 overflow-hidden">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Custom Instructions
                    </label>
                    <Textarea
                      placeholder="e.g., Ask more technical questions..."
                      value={customInstruction}
                      onChange={(e) => setCustomInstruction(e.target.value)}
                      className="min-h-[50px] text-xs"
                    />
                  </div>

                  <Button
                    onClick={() => {
                      const safeTranscriptions = Array.isArray(transcriptions)
                        ? transcriptions
                        : [];
                      generateSuggestions(
                        safeTranscriptions,
                        customInstruction,
                      );
                    }}
                    disabled={isLoading}
                    className="w-full bg-amber-600 hover:bg-amber-700 h-8 text-xs"
                  >
                    <Lightbulb className="w-3 h-3 mr-2" />
                    {isLoading ? "Generating..." : "Get Questions"}
                  </Button>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {!suggestions ||
                    !Array.isArray(suggestions) ||
                    suggestions.length === 0 ? (
                      <div className="text-center py-4">
                        <Lightbulb className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-xs">
                          Generate follow-up questions
                        </p>
                      </div>
                    ) : (
                      suggestions.slice(0, 3).map((suggestion, index) => (
                        <div
                          key={index}
                          className="bg-amber-50 border border-amber-200 rounded p-2"
                        >
                          <p className="text-xs text-gray-800 font-medium mb-1">
                            {suggestion.question}
                          </p>
                          <Button
                            onClick={() =>
                              navigator.clipboard.writeText(suggestion.question)
                            }
                            size="sm"
                            variant="ghost"
                            className="h-5 px-1 text-xs"
                          >
                            <Copy className="w-2 h-2 mr-1" />
                            Copy
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Live Transcription (Bottom 50%) */}
              <Card className="flex-1 rounded-xl bg-white/90 backdrop-blur shadow-lg border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center">
                      <Mic className="w-4 h-4 mr-2 text-green-600" />
                      Live Transcription
                    </div>
                    <Button
                      onClick={
                        isTranscribing ? stopTranscription : startTranscription
                      }
                      variant={isTranscribing ? "destructive" : "default"}
                      size="sm"
                      className="h-6 px-2 text-xs"
                    >
                      {isTranscribing ? (
                        <>
                          <Square className="w-3 h-3 mr-1" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Mic className="w-3 h-3 mr-1" />
                          Start
                        </>
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <div className="h-full overflow-y-auto space-y-2">
                    {!transcriptions || transcriptions.length === 0 ? (
                      <div className="text-center py-6">
                        <Mic className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-xs">
                          No transcriptions yet
                        </p>
                        <p className="text-xs text-gray-400">
                          Start transcription to see live speech-to-text
                        </p>
                      </div>
                    ) : (
                      (transcriptions || []).slice(-10).map((transcription) => (
                        <div
                          key={transcription.id}
                          className="border-l-2 border-gray-200 pl-2 py-1"
                        >
                          <div className="flex items-center space-x-1 mb-1">
                            <Badge
                              variant={
                                transcription.speaker === "Interviewer"
                                  ? "default"
                                  : transcription.speaker === "Candidate"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="text-xs px-1 py-0"
                            >
                              {transcription.speaker}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(
                                transcription.timestamp,
                              ).toLocaleTimeString()}
                            </span>
                            <span className="text-xs text-gray-400">
                              {Math.round(transcription.confidence * 100)}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-700">
                            {transcription.text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Candidate View */}
        {!isInterviewer && (
          <div className="h-[calc(100vh-200px)]">
            <ErrorBoundary
              fallback={
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="text-red-800">
                    Video component failed to load. Please refresh the page.
                  </p>
                </div>
              }
            >
              <JitsiMeetingContainer
                containerRef={containerRef}
                isConnecting={isConnecting}
                isConnected={isConnected}
                error={error}
                participants={participants}
                roomName={roomName}
                onRetry={handleRetryConnection}
              />
            </ErrorBoundary>
          </div>
        )}
      </div>

      {/* Meeting Controls Bar */}
      <MeetingControls
        isMuted={isMuted}
        isVideoDisabled={isVideoDisabled}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onOpenSettings={() => {
          /* TODO: Implement settings */
        }}
        // Only pass timer props for interviewers
        {...(isInterviewer && {
          isTimerRunning,
          onStartTimer: () => {
            console.log(
              "Start timer called from meeting controls, startTimer type:",
              typeof startTimer,
            );
            if (typeof startTimer === "function") {
              startTimer();
            } else {
              console.error("startTimer is not a function:", startTimer);
            }
          },
          onStopTimer: () => {
            // Auto-continue tracking throughout interview
          },
          timerState,
        })}
      />
    </div>
  );
}