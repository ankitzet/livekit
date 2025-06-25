//client/src/pages/meeting.tsx

import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useMeeting } from "@/hooks/use-meeting";
import { useTranscription } from "@/hooks/use-transcription";
import { useFollowUpSuggestions } from "@/hooks/use-follow-up-suggestions";
import { useInterviewTimer } from "@/hooks/use-interview-timer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import VideoGrid from "@/components/video-grid";
import MeetingControls from "@/components/meeting-controls";
import { ErrorBoundary } from "@/components/error-boundary";
import { useEnhancedTranscription } from "@/hooks/use-enhanced-transcription";

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
} from "lucide-react";

// Import ParticipantVideo directly from video-grid
function ParticipantVideo({
  participant,
  isLocal = false,
  userRole,
}: {
  participant: any;
  isLocal?: boolean;
  userRole?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const videoElement = videoRef.current;

    if (isLocal) {
      // Handle local participant
      const localParticipant = participant;

      const attachLocalVideo = () => {
        console.log(
          "Attempting to attach local video for:",
          localParticipant.identity,
        );
        console.log(
          "Available video publications:",
          Array.from(localParticipant.videoTrackPublications.keys()),
        );

        const videoTrack = Array.from(
          localParticipant.videoTrackPublications.values(),
        )[0]?.videoTrack;

        console.log(
          "Found video track:",
          !!videoTrack,
          "Video element:",
          !!videoElement,
        );

        if (videoTrack && videoElement) {
          try {
            if (videoElement.readyState !== undefined) {
              videoTrack.attach(videoElement);
              console.log(
                "✅ Local video attached successfully for:",
                localParticipant.identity,
              );
              setHasVideo(true);
            }
          } catch (error) {
            console.error("❌ Error attaching local video:", error);
            setHasVideo(false);
          }
        } else {
          console.log("⚠️ Missing requirements for video attachment:", {
            videoTrack: !!videoTrack,
            videoElement: !!videoElement,
          });
          setHasVideo(false);
        }
      };

      // Initial attachment attempt
      setTimeout(attachLocalVideo, 100);

      const handleTrackPublished = () => {
        console.log("Local track published, attempting to attach video");
        setTimeout(attachLocalVideo, 200);
      };

      localParticipant.on("trackPublished", handleTrackPublished);

      return () => {
        localParticipant.off("trackPublished", handleTrackPublished);
        if (videoElement && videoElement.srcObject) {
          const tracks = (videoElement.srcObject as MediaStream)?.getTracks();
          tracks?.forEach((track) => track.stop());
          videoElement.srcObject = null;
        }
      };
    } else {
      // Handle remote participant
      const remoteParticipant = participant;

      const attachRemoteVideo = () => {
        console.log(
          "Attempting to attach remote video for:",
          remoteParticipant.identity,
        );
        console.log(
          "Available remote video publications:",
          Array.from(remoteParticipant.videoTrackPublications.keys()),
        );

        const videoTrack = Array.from(
          remoteParticipant.videoTrackPublications.values(),
        )[0]?.videoTrack;

        console.log(
          "Found remote video track:",
          !!videoTrack,
          "Video element:",
          !!videoElement,
        );

        if (videoTrack && videoElement) {
          try {
            if (videoElement.readyState !== undefined) {
              videoTrack.attach(videoElement);
              console.log(
                "✅ Remote video attached successfully for:",
                remoteParticipant.identity,
              );
              setHasVideo(true);
            }
          } catch (error) {
            console.error("❌ Error attaching remote video:", error);
            setHasVideo(false);
          }
        } else {
          console.log("⚠️ Missing requirements for remote video attachment:", {
            videoTrack: !!videoTrack,
            videoElement: !!videoElement,
          });
          setHasVideo(false);
        }
      };

      // Initial attachment attempt
      setTimeout(attachRemoteVideo, 100);

      const handleTrackSubscribed = (track: any) => {
        console.log(
          "Remote track subscribed:",
          track.kind,
          "for:",
          remoteParticipant.identity,
        );
        if (track.kind === "video") {
          console.log(
            "Remote video track subscribed for:",
            remoteParticipant.identity,
          );
          setTimeout(attachRemoteVideo, 200);
        } else if (track.kind === "audio") {
          console.log(
            "Remote audio track subscribed for:",
            remoteParticipant.identity,
          );
          // Create audio element for remote participant
          const audioElement = document.createElement("audio");
          audioElement.autoplay = true;
          audioElement.style.display = "none";
          document.body.appendChild(audioElement);

          try {
            track.attach(audioElement);
            console.log(
              "✅ Remote audio attached successfully for:",
              remoteParticipant.identity,
            );
          } catch (error) {
            console.error("❌ Error attaching remote audio:", error);
          }
        }
      };

      remoteParticipant.on("trackSubscribed", handleTrackSubscribed);

      return () => {
        remoteParticipant.off("trackSubscribed", handleTrackSubscribed);
        if (videoElement && videoElement.srcObject) {
          const tracks = (videoElement.srcObject as MediaStream)?.getTracks();
          tracks?.forEach((track) => track.stop());
          videoElement.srcObject = null;
        }
      };
    }
  }, [participant, isLocal]);

  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      const handleLoadedData = () => {
        console.log("Video loaded successfully");
        setHasVideo(true);
      };

      const handleError = (error: any) => {
        console.error("Video error:", error);
        setHasVideo(false);
      };

      videoElement.addEventListener("loadeddata", handleLoadedData);
      videoElement.addEventListener("error", handleError);

      return () => {
        videoElement.removeEventListener("loadeddata", handleLoadedData);
        videoElement.removeEventListener("error", handleError);
      };
    }
  }, []);

  return (
    <div className="relative w-full h-full bg-gray-900 flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
        style={{
          display: "block",
          visibility: hasVideo ? "visible" : "hidden",
        }}
      />
      {/* Fallback when no video */}
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center text-white">
            <User className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-400">
              {isLocal ? "Your camera" : "Participant camera"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface MeetingProps {
  params: {
    roomName: string;
  };
}

// Clean version - will copy back
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
    room,
    localParticipant,
    participants,
    isConnected,
    error,
    connectToRoom,
    disconnectFromRoom,
    isMuted,
    isVideoDisabled,
    toggleMute,
    toggleVideo,
  } = useMeeting();

  const {
    transcriptions: rawTranscriptions,
    isTranscribing,
    startTranscription,
    stopTranscription,
    clearTranscriptions,
    error: transcriptionError,
  } = useEnhancedTranscription(room);

  const transcriptions = rawTranscriptions.map((t, index) => ({
    id: `${t.timestamp}-${index}`,
    speaker: t.speaker || "Mixed Audio",
    text: t.transcript,
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

  // Timer debugging disabled for production

  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const participantName = isInterviewer
      ? `interviewer-${Date.now()}`
      : `candidate-${Date.now()}`;
    connectToRoom(roomName, participantName);

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
          <Button onClick={() => window.location.reload()}>Try Again</Button>
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
              {isConnected ? "Connected" : "Connecting..."}
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
        {isInterviewer && isConnected && room && (
          <div className="h-[calc(100vh-200px)] flex gap-4">
            {/* Main Content Area - Candidate Video (70% width) */}
            <div className="flex-1 relative bg-gray-900 rounded-lg overflow-hidden">
              {/* Timer Nudge - Only visible to interviewer */}
              {timerState?.shouldShowNudge && timerState?.nextBlock && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg animate-pulse">
                  <p className="text-sm font-medium">
                    Start "{timerState.nextBlock.label}" in 5 seconds
                  </p>
                </div>
              )}

              {/* Large Candidate Video */}
              {participants.length > 0 ? (
                participants
                  .filter((p) => !p.identity.includes("interviewer"))
                  .map((participant) => (
                    <div
                      key={participant.identity}
                      className="w-full h-full relative"
                    >
                      <ParticipantVideo
                        participant={participant}
                        isLocal={false}
                        userRole="interviewer"
                      />
                      <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
                        Candidate
                      </div>

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
                                  {Math.ceil(timerState.countdownSecondsLeft)}{" "}
                                  sec
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
                    </div>
                  ))
              ) : (
                <div className="flex items-center justify-center h-full relative">
                  <div className="text-center text-white">
                    <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Waiting for candidate to join...</p>
                  </div>

                  {/* 5-Second Countdown Overlay (when no candidate) */}
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
                </div>
              )}

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

              {/* Bottom Left - Small Interviewer Video */}
              <div className="absolute bottom-4 left-4">
                <div className="w-48 h-32 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg relative">
                  {localParticipant ? (
                    <ParticipantVideo
                      participant={localParticipant}
                      isLocal={true}
                      userRole="interviewer"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-white">
                      <Video className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    You (Interviewer)
                  </div>
                </div>
              </div>

              {/* Exit Interview Button - Top Right */}
              <div className="absolute top-4 right-4">
                <Button
                  onClick={disconnectFromRoom}
                  variant="destructive"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Exit Interview
                </Button>
              </div>
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
                                    : "outline" // For "unknown" speakers
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

        {/* Fallback for when not connected */}
        {!isConnected || !room ? (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Setting up video connection...</p>
          </div>
        ) : null}

        {/* Candidate View */}
        {!isInterviewer && isConnected && room && (
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
              <VideoGrid
                room={room}
                localParticipant={localParticipant}
                participants={participants}
                userRole="candidate"
              />
            </ErrorBoundary>
          </div>
        )}

        {!isInterviewer && (!isConnected || !room) && (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Candidate View
            </h2>
            <p className="text-gray-600">
              Setting up your interview connection...
            </p>
          </div>
        )}
      </div>

      {/* Meeting Controls Bar */}
      <MeetingControls
        isMuted={isMuted}
        isVideoDisabled={isVideoDisabled}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={() => {
          /* TODO: Implement screen share */
        }}
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
