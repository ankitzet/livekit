import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Video, Play, Settings2, Users, Briefcase, Calendar, Mic, Sparkles, Clock, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [, setLocation] = useLocation();
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcriptionProvider, setTranscriptionProvider] = useState<'deepgram' | 'elevenlabs'>('deepgram');
  const [joinRoomName, setJoinRoomName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [interviewPlan, setInterviewPlan] = useState('');
  const { toast } = useToast();

  const handleStartMeeting = async () => {
    try {
      setIsConnecting(true);
      
      // Store job description in sessionStorage if provided
      if (jobDescription.trim()) {
        sessionStorage.setItem('jobDescription', jobDescription.trim());
      }
      
      // Store interview plan in sessionStorage if provided
      if (interviewPlan.trim()) {
        sessionStorage.setItem('interviewPlan', interviewPlan.trim());
      }
      
      // Generate a random room name for demo purposes
      const roomName = `room-${Math.random().toString(36).substring(2, 8)}`;
      
      // Navigate to meeting room as interviewer
      setLocation(`/meeting/${roomName}?role=interviewer`);
    } catch (error) {
      console.error('Error starting meeting:', error);
      toast({
        title: "Connection Error",
        description: "Unable to start the meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleJoinMeeting = async () => {
    if (!joinRoomName.trim()) {
      toast({
        title: "Room name required",
        description: "Please enter a room name to join",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsConnecting(true);
      
      // Store job description in sessionStorage if provided
      if (jobDescription.trim()) {
        sessionStorage.setItem('jobDescription', jobDescription.trim());
      }
      
      // Store interview plan in sessionStorage if provided
      if (interviewPlan.trim()) {
        sessionStorage.setItem('interviewPlan', interviewPlan.trim());
      }
      
      // Navigate to the meeting room as candidate
      setLocation(`/meeting/${joinRoomName.trim()}?role=candidate`);
    } catch (error) {
      console.error('Error joining meeting:', error);
      toast({
        title: "Connection Error",
        description: "Unable to join the meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" />
      <div className="absolute top-40 right-10 w-32 h-32 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-300" />
      <div className="absolute -bottom-8 left-1/2 w-40 h-40 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-700" />
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <Video className="text-white" size={32} />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Sparkles className="text-white" size={12} />
                </div>
              </div>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-cyan-900 bg-clip-text text-transparent mb-4">
              Interviewer Assistant
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Smart, time-managed interviews with real-time transcription and AI-powered suggestions
            </p>
            
            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm text-indigo-700 border border-indigo-200">
                <MessageSquare className="w-3 h-3 mr-1" />
                Live Transcription
              </Badge>
              <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm text-cyan-700 border border-cyan-200">
                <Clock className="w-3 h-3 mr-1" />
                Time Management
              </Badge>
              <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm text-purple-700 border border-purple-200">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Suggestions
              </Badge>
            </div>
          </div>

          {isConnecting ? (
            <Card className="max-w-md mx-auto backdrop-blur-sm bg-white/90 border-0 shadow-2xl">
              <CardContent className="p-8 text-center">
                <div className="flex items-center justify-center space-x-3 text-indigo-600 py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  <span className="text-lg font-medium">Connecting to room...</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8 items-start">
              {/* Left Column - Info Cards */}
              <div className="space-y-6">
                <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center text-lg">
                      <Video className="w-5 h-5 mr-2 text-indigo-600" />
                      How it works
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Step 1 */}
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-indigo-600">1</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-800 mb-1">Plan your interview</h4>
                        <p className="text-sm text-gray-600">
                          Define your job role and structure the interview timeline with section-wise durations.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-cyan-600">2</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-800 mb-1">Start the call & invite candidate</h4>
                        <p className="text-sm text-gray-600">
                          Launch your session and share a single smart link — no downloads needed.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-purple-600">3</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-800 mb-1">Let AI assist you</h4>
                        <p className="text-sm text-gray-600">
                          Get live transcription, section time alerts, and smart follow-up suggestions powered by your job description.
                        </p>
                      </div>
                    </div>
                  </CardContent>

                </Card>

                <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center text-lg">
                      <Mic className="w-5 h-5 mr-2 text-cyan-600" />
                      Transcription Engine
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Real-time speech-to-text</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Setup Form */}
              <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-2xl">
                <CardHeader className="flex flex-col space-y-1.5 p-6 bg-[#e2e8fe]">
                  <CardTitle className="text-2xl font-bold text-gray-900">Setup Your First Interview</CardTitle>
                  <p className="text-gray-600">Configure your interview session</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Job Description */}
                  <div>
                    <label htmlFor="jobDescription" className="text-sm font-semibold flex items-center text-gray-900 mt-[21px] mb-[21px]">
                      <Briefcase className="w-4 h-4 mr-2 text-indigo-600" />
                      Job Description for the Role
                    </label>
                    <Textarea
                      id="jobDescription"
                      placeholder="e.g., This is an operations role at Rapido focused on scaling supply in Tier 2 cities. The candidate will work on driver acquisition, onboarding optimization, and market expansion strategies..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="min-h-[100px] resize-none border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      This helps AI generate more relevant follow-up questions during the interview
                    </p>
                  </div>

                  {/* Interview Plan */}
                  <div>
                    <label htmlFor="interviewPlan" className="block text-sm font-semibold mb-3 flex items-center text-gray-900">
                      <Calendar className="w-4 h-4 mr-2 text-cyan-600" />
                      Interview Structure
                    </label>
                    <Textarea
                      id="interviewPlan"
                      placeholder={`Intro - 5\nPast Projects - 15\nCase Study - 15\nCoding - 20\nWrap-up - 5`}
                      value={interviewPlan}
                      onChange={(e) => setInterviewPlan(e.target.value)}
                      className="min-h-[120px] resize-none font-mono text-sm border-gray-200 focus:border-cyan-500 focus:ring-cyan-500"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Enter each section with time in minutes. You'll get smart nudges when time blocks run over.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-4 pt-4">
                    <Button 
                      onClick={handleStartMeeting}
                      className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-semibold py-4 px-6 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                      size="lg"
                    >
                      <Video className="mr-3" size={20} />
                      Start Interview
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-500 font-medium">or join existing</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Input
                        placeholder="Enter room name to join..."
                        value={joinRoomName}
                        onChange={(e) => setJoinRoomName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleJoinMeeting()}
                        className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <Button 
                        onClick={handleJoinMeeting}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                        size="lg"
                        disabled={!joinRoomName.trim()}
                      >
                        <Users className="mr-3" size={20} />
                        Join as Candidate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
