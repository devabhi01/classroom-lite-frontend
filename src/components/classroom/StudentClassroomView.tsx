import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  Copy,
  Check,
  Clock,
  LogOut,
  Maximize2,
  Minimize2,
  Edit3,
  FileText,
  Monitor,
  FlipHorizontal,
  ChevronDown,
  ChevronUp,
  Crown,
  GraduationCap,
  X,
} from 'lucide-react';
import { Socket } from 'socket.io-client';
import { Classroom, WorkspaceTab } from '@/types/classroom';
import { Participant } from '@/types/participant';
import { PdfState } from '@/types/pdf';
import { WhiteboardOperation } from '@/types/whiteboard';
import { User } from '@/types/auth';
import { RemoteStream } from '@/hooks/useVoiceChat';
import { Whiteboard } from './Whiteboard';
import { PdfViewer } from './PdfViewer';
import { ScreenShare } from './ScreenShare';
import { InteractionModeView } from './InteractionModeView';
import { copyToClipboard } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import { Logo } from '@/components/ui/Logo';

interface StudentClassroomViewProps {
  socket: Socket | null;
  classroom: Classroom;
  classroomCode: string;
  participants: Participant[];
  activeTab: WorkspaceTab;
  initialPdf: PdfState | null;
  initialWhiteboard: WhiteboardOperation[];
  leaveClassroom: () => void;
  isSharing: boolean;
  localScreenStream: MediaStream | null;
  remoteScreenStream: MediaStream | null;
  isVoiceChatActive: boolean;
  voiceLocalStream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  voiceRemoteStreams: Map<string, RemoteStream>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  currentUser: User | null;
}

export const StudentClassroomView: React.FC<StudentClassroomViewProps> = ({
  socket,
  classroom,
  classroomCode,
  participants,
  activeTab,
  initialPdf,
  initialWhiteboard,
  leaveClassroom,
  isSharing,
  localScreenStream,
  remoteScreenStream,
  voiceLocalStream,
  audioEnabled,
  videoEnabled,
  voiceRemoteStreams,
  toggleAudio,
  toggleVideo,
  currentUser,
}) => {
  const [copied, setCopied] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [participantsDrawerOpen, setParticipantsDrawerOpen] = useState(false);
  const [isTeacherPipMinimized, setIsTeacherPipMinimized] = useState(false);
  const [localMirrored, setLocalMirrored] = useState(true);

  // Initialize and tick session duration timer
  useEffect(() => {
    const startTimestamp = classroom.createdAt ? new Date(classroom.createdAt).getTime() : Date.now();
    const computeElapsed = () => Math.max(0, Math.floor((Date.now() - startTimestamp) / 1000));
    setElapsedSeconds(computeElapsed());

    const interval = setInterval(() => {
      setElapsedSeconds(computeElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [classroom.createdAt]);

  const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const hours = Math.floor(totalSeconds / 3600);
    const pad = (n: number) => String(n).padStart(2, '0');
    if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const handleCopyCode = async () => {
    const success = await copyToClipboard(classroomCode);
    if (success) {
      setCopied(true);
      toast.success(`Code ${classroomCode} copied!`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Find host/teacher remote stream if available
  const teacherParticipant = participants.find((p) => p.role === 'HOST' || p.userId === classroom.hostId);
  const teacherRemoteStream = teacherParticipant
    ? voiceRemoteStreams.get(teacherParticipant.userId)
    : Array.from(voiceRemoteStreams.values())[0];

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground select-none">
      {/* ── 1. Clean Mobile-Responsive Top Header ── */}
      <header className="flex h-14 sm:h-16 w-full items-center justify-between border-b border-border bg-card/95 backdrop-blur-md px-3 sm:px-5 shadow-xs z-30 shrink-0 gap-2">
        {/* Left: Minimal Branding & Classroom Title */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <Logo size="sm" withLink={false} />
          <div className="min-w-0">
            <h1 className="truncate text-xs sm:text-sm font-bold text-foreground max-w-[120px] xs:max-w-[180px] sm:max-w-[260px]">
              {classroom.name}
            </h1>
            <div className="flex items-center space-x-1.5 text-[10px] sm:text-xs text-muted-foreground">
              <span className="font-mono font-semibold text-foreground">{classroomCode}</span>
              <button
                onClick={handleCopyCode}
                className="text-primary hover:opacity-80 p-0.5 rounded cursor-pointer"
                title="Copy code"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Center: Live Sync Status Badge (Showing Teacher's Current Activity) */}
        <div className="flex items-center">
          {activeTab === 'whiteboard' && (
            <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] sm:text-xs font-semibold shadow-2xs">
              <Edit3 className="h-3 sm:h-3.5 w-3 sm:w-3.5 shrink-0" />
              <span>Whiteboard</span>
            </div>
          )}
          {activeTab === 'pdf' && (
            <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] sm:text-xs font-semibold shadow-2xs">
              <FileText className="h-3 sm:h-3.5 w-3 sm:w-3.5 shrink-0" />
              <span>PDF Presentation</span>
            </div>
          )}
          {activeTab === 'screenshare' && (
            <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-500 text-[10px] sm:text-xs font-semibold shadow-2xs">
              <Monitor className="h-3 sm:h-3.5 w-3 sm:w-3.5 shrink-0 animate-pulse" />
              <span>Teacher's Screen</span>
            </div>
          )}
          {activeTab === 'interaction' && (
            <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] sm:text-xs font-semibold shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping mr-0.5" />
              <span>Live Video Call</span>
            </div>
          )}
        </div>

        {/* Right: Duration, Participants Count & Leave Button */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Duration */}
          <div className="hidden xs:flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-[11px] font-mono text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDuration(elapsedSeconds)}</span>
          </div>

          {/* Participants toggle */}
          <button
            onClick={() => setParticipantsDrawerOpen(true)}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium cursor-pointer transition-colors"
            title="Classroom participants"
          >
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold">{participants.length}</span>
          </button>

          {/* Leave Button */}
          <button
            onClick={leaveClassroom}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-semibold cursor-pointer transition-colors"
            title="Leave classroom"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* ── 2. Collaborative Workspace (Auto-Follows Teacher) ── */}
      <main className="relative flex flex-1 w-full h-full overflow-hidden bg-muted/15">
        {/* Interaction Mode (WhatsApp-style Video Call) */}
        <div className={activeTab === 'interaction' ? 'h-full w-full flex flex-col' : 'hidden'}>
          <InteractionModeView
            localStream={voiceLocalStream}
            remoteStreams={voiceRemoteStreams}
            audioEnabled={audioEnabled}
            videoEnabled={videoEnabled}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            isHost={false}
            participants={participants}
            currentUserId={currentUser?.id}
            classroomName={classroom.name}
            onLeave={leaveClassroom}
          />
        </div>

        {/* Whiteboard (Clean Student View) */}
        <div className={activeTab === 'whiteboard' ? 'h-full w-full flex flex-col' : 'hidden'}>
          <Whiteboard
            socket={socket}
            classroomCode={classroomCode}
            isHost={false}
            initialOperations={initialWhiteboard}
            userId={currentUser?.id}
          />
        </div>

        {/* PDF Presentation (Synced with Teacher) */}
        <div className={activeTab === 'pdf' ? 'h-full w-full flex flex-col' : 'hidden'}>
          <PdfViewer
            socket={socket}
            classroomCode={classroomCode}
            isHost={false}
            initialPdf={initialPdf}
          />
        </div>

        {/* Screen Share (Teacher's Stream) */}
        <div className={activeTab === 'screenshare' ? 'h-full w-full flex flex-col' : 'hidden'}>
          <ScreenShare
            isHost={false}
            isSharing={isSharing}
            localStream={localScreenStream}
            remoteStream={remoteScreenStream}
            onStartShare={async () => {}}
            onStopShare={() => {}}
          />
        </div>

        {/* ── Floating Teacher Mini-PIP Video (When in Whiteboard, PDF, or Screen Share mode) ── */}
        {activeTab !== 'interaction' && teacherRemoteStream && (
          <div
            className={`absolute z-30 transition-all duration-300 shadow-2xl rounded-xl overflow-hidden border border-border bg-card/95 backdrop-blur-md ${
              isTeacherPipMinimized
                ? 'bottom-20 right-3 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer bg-primary text-primary-foreground shadow-lg'
                : 'bottom-20 sm:bottom-24 right-3 sm:right-6 w-32 xs:w-40 sm:w-48 aspect-video'
            }`}
          >
            {isTeacherPipMinimized ? (
              <button
                onClick={() => setIsTeacherPipMinimized(false)}
                className="w-full h-full flex items-center justify-center"
                title="Expand Teacher Video"
              >
                <Video className="h-5 w-5" />
              </button>
            ) : (
              <div className="relative w-full h-full group">
                <audio
                  ref={(el) => {
                    if (el && teacherRemoteStream.stream && el.srcObject !== teacherRemoteStream.stream) {
                      el.srcObject = teacherRemoteStream.stream;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                />
                <video
                  ref={(el) => {
                    if (el && teacherRemoteStream.stream && el.srcObject !== teacherRemoteStream.stream) {
                      el.srcObject = teacherRemoteStream.stream;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Teacher Mini Badge */}
                <div className="absolute top-1 left-1 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] font-semibold text-white">
                  <Crown className="h-2.5 w-2.5 text-amber-400" />
                  <span className="truncate max-w-[80px]">{teacherRemoteStream.name}</span>
                </div>

                {/* Minimize Button */}
                <button
                  onClick={() => setIsTeacherPipMinimized(true)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Minimize PIP"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 3. Clean Floating Bottom Action Dock (Student Controls) ── */}
        {activeTab !== 'interaction' && (
          <div className="absolute bottom-3 inset-x-0 z-30 flex items-center justify-center pointer-events-none px-3">
            <div className="flex items-center gap-2 sm:gap-3 px-3.5 sm:px-5 py-2 rounded-full bg-card/95 border border-border shadow-xl backdrop-blur-xl pointer-events-auto">
              {/* Mic Toggle */}
              <button
                onClick={toggleAudio}
                className={`p-2.5 sm:p-3 rounded-full transition-all cursor-pointer shadow-sm ${
                  audioEnabled
                    ? 'bg-muted hover:bg-muted/80 text-foreground'
                    : 'bg-destructive text-destructive-foreground animate-pulse'
                }`}
                title={audioEnabled ? 'Mute Mic' : 'Unmute Mic'}
              >
                {audioEnabled ? <Mic className="h-4 w-4 sm:h-5 sm:w-5" /> : <MicOff className="h-4 w-4 sm:h-5 sm:w-5" />}
              </button>

              {/* Camera Toggle */}
              <button
                onClick={toggleVideo}
                className={`p-2.5 sm:p-3 rounded-full transition-all cursor-pointer shadow-sm ${
                  videoEnabled
                    ? 'bg-muted hover:bg-muted/80 text-foreground'
                    : 'bg-destructive text-destructive-foreground'
                }`}
                title={videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
              >
                {videoEnabled ? <Video className="h-4 w-4 sm:h-5 sm:w-5" /> : <VideoOff className="h-4 w-4 sm:h-5 sm:w-5" />}
              </button>

              {/* Flip / Mirror Camera */}
              <button
                onClick={() => setLocalMirrored((prev) => !prev)}
                className={`p-2.5 sm:p-3 rounded-full transition-all cursor-pointer shadow-sm ${
                  localMirrored
                    ? 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
                title="Mirror Camera"
              >
                <FlipHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>

              {/* Participants Drawer Button */}
              <button
                onClick={() => setParticipantsDrawerOpen(true)}
                className="p-2.5 sm:p-3 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer shadow-sm"
                title="Participants List"
              >
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </button>

              {/* Leave Classroom */}
              <button
                onClick={leaveClassroom}
                className="p-2.5 sm:p-3 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all cursor-pointer shadow-sm"
                title="Leave Classroom"
              >
                <PhoneOff className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── 4. Mobile / Desktop Slide-over Drawer for Participants ── */}
      {participantsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setParticipantsDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative z-50 w-full max-w-xs sm:max-w-sm h-full bg-card border-l border-border shadow-2xl flex flex-col p-4 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="font-bold text-sm text-foreground">Classroom Participants</h2>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-semibold">
                  {participants.length}
                </span>
              </div>
              <button
                onClick={() => setParticipantsDrawerOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Participants list */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {participants.map((p) => {
                const isHostUser = p.role === 'HOST' || p.userId === classroom.hostId;
                const isMe = p.userId === currentUser?.id;
                const remote = voiceRemoteStreams.get(p.userId);

                return (
                  <div
                    key={p.userId}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isMe
                        ? 'border-primary/40 bg-primary/5'
                        : isHostUser
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs uppercase text-foreground shrink-0">
                        {p.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-semibold text-foreground">
                            {p.name} {isMe && '(You)'}
                          </span>
                          {isHostUser && (
                            <span className="flex items-center gap-0.5 bg-amber-500/20 text-amber-500 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                              <Crown className="h-2.5 w-2.5" /> Host
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {p.role === 'STUDENT' ? 'Student' : 'Teacher'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isMe ? (
                        !audioEnabled && <MicOff className="h-3.5 w-3.5 text-destructive" />
                      ) : (
                        remote?.audioMuted && <MicOff className="h-3.5 w-3.5 text-destructive" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
