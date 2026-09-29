import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useClassroom } from '@/hooks/useClassroom';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { ClassroomHeader } from '@/components/classroom/ClassroomHeader';
import { ParticipantPanel } from '@/components/classroom/ParticipantPanel';
import { JoinRequests } from '@/components/classroom/JoinRequests';
import { ClassroomControls } from '@/components/classroom/ClassroomControls';
import { Whiteboard } from '@/components/classroom/Whiteboard';
import { PdfViewer } from '@/components/classroom/PdfViewer';
import { ScreenShare } from '@/components/classroom/ScreenShare';


export const Classroom: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const classroomCode = (code || '').toUpperCase();

  const [mobileParticipantsOpen, setMobileParticipantsOpen] = useState(false);
  const [isParticipantPanelOpen, setIsParticipantPanelOpen] = useState(true);

  // Classroom socket and state manager
  const {
    socket,
    classroom,
    isHost,
    participants,
    pendingRequests,
    activeTab,
    initialPdf,
    initialWhiteboard,
    loading,
    error,
    switchTab,
    acceptJoinRequest,
    rejectJoinRequest,
    endClassroom,
    leaveClassroom,
    enableDemoMode,
    refreshClassroom,
  } = useClassroom({
    classroomCode,
    currentUser: user,
  });

  // WebRTC Screen share manager
  const {
    isSharing,
    localStream,
    remoteStream,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC({
    socket,
    classroomCode,
    userId: user?.id || '',
    isHost,
  });

  // Voice + Video Chat
  const {
    isActive: isVoiceChatActive,
    localStream: voiceLocalStream,
    audioEnabled,
    videoEnabled,
    remoteStreams: voiceRemoteStreams,
    startVoiceChat,
    stopVoiceChat,
    toggleAudio,
    toggleVideo,
    forceMuteUser,
  } = useVoiceChat({
    socket,
    classroomCode,
    userId: user?.id || '',
    userName: user?.name || 'Participant',
    participants,
  });

  const toggleParticipants = () => {
    // If desktop, toggle sidebar; if mobile, toggle drawer
    if (window.innerWidth < 768) {
      setMobileParticipantsOpen(!mobileParticipantsOpen);
    } else {
      setIsParticipantPanelOpen(!isParticipantPanelOpen);
    }
  };

  // Auto-start video/audio on join
  const hasAutoStartedRef = React.useRef(false);
  React.useEffect(() => {
    if (!socket || !classroom || loading || error || hasAutoStartedRef.current) return;

    const tryStart = () => {
      if (!hasAutoStartedRef.current) {
        hasAutoStartedRef.current = true;
        startVoiceChat(true);
      }
    };

    if (socket.connected) {
      tryStart();
    } else {
      socket.on('connect', tryStart);
      return () => {
        socket.off('connect', tryStart);
      };
    }
  }, [classroom, loading, error, socket, startVoiceChat]);

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="text-center">
          <h2 className="text-lg font-semibold">Connecting to Classroom...</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Setting up real-time socket and collaborative workspace
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !classroom) {
    const isServerOffline = error?.toLowerCase().includes('connect') || error?.toLowerCase().includes('server');

    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className="rounded-xl border border-destructive/20 bg-card p-8 max-w-md shadow-md space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="text-xl font-bold text-foreground">Classroom Connection Issue</h2>
          <p className="text-sm text-muted-foreground">
            {error || 'Unable to join classroom. The room may have ended or does not exist.'}
          </p>
          {isServerOffline && (
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded border border-border">
              The NestJS backend server at <code className="font-mono text-primary">http://localhost:3000</code> is currently offline. You can start the backend, or continue directly in Standalone Demo Mode.
            </p>
          )}
          <div className="flex flex-col sm:flex-row justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button variant="secondary" size="sm" onClick={refreshClassroom}>
              Retry Connection
            </Button>
            <Button size="sm" onClick={enableDemoMode} className="bg-primary">
              Continue in Demo Mode
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      {/* 1. Classroom Header */}
      <ClassroomHeader
        classroomName={classroom.name}
        classroomCode={classroom.code}
        participantCount={participants.length}
        isHost={isHost}
        onLeave={leaveClassroom}
        onEndClassroom={isHost ? endClassroom : undefined}
        onToggleParticipants={toggleParticipants}
        isParticipantOpen={isParticipantPanelOpen}
        isMobileParticipantOpen={mobileParticipantsOpen}
      />

      {/* 2. Main Middle Section: Sidebar + Workspace */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Desktop Sidebar: Participants (Minimizable) */}
        {isParticipantPanelOpen ? (
          <div className="hidden md:flex w-72 lg:w-80 shrink-0 flex-col transition-all duration-200">
            {/* Host Join Requests (Only Host sees pending requests) */}
            {isHost && pendingRequests.length > 0 && (
              <JoinRequests
                requests={pendingRequests}
                onAccept={acceptJoinRequest}
                onReject={rejectJoinRequest}
              />
            )}

            <ParticipantPanel
              participants={participants}
              currentUserId={user?.id}
              onToggleMinimize={() => setIsParticipantPanelOpen(false)}
              isVoiceChatActive={isVoiceChatActive}
              localStream={voiceLocalStream}
              audioEnabled={audioEnabled}
              videoEnabled={videoEnabled}
              remoteStreams={voiceRemoteStreams}
              onStartVoiceChat={startVoiceChat}
              onStopVoiceChat={stopVoiceChat}
              onToggleAudio={toggleAudio}
              onToggleVideo={toggleVideo}
              onForceMute={forceMuteUser}
            />
          </div>
        ) : (
          /* Minimized Strip for Desktop */
          <button
            onClick={() => setIsParticipantPanelOpen(true)}
            className="hidden md:flex flex-col items-center justify-start w-9 bg-card border-r border-border hover:bg-muted text-muted-foreground hover:text-foreground py-3 transition-colors z-20 cursor-pointer"
            title="Expand participants panel"
            aria-label="Expand participants panel"
          >
            <PanelLeftOpen className="h-4 w-4 mb-3 text-primary" />
            <span className="text-[11px] font-semibold [writing-mode:vertical-lr] tracking-wider uppercase text-muted-foreground select-none">
              Participants ({participants.length})
            </span>
          </button>
        )}

        {/* Mobile Sidebar Overlay / Drawer */}
        {mobileParticipantsOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setMobileParticipantsOpen(false)}
            />
            {/* Drawer */}
            <div className="relative z-50 w-72 max-w-[85vw] h-full bg-card shadow-2xl flex flex-col">
              {isHost && pendingRequests.length > 0 && (
                <JoinRequests
                  requests={pendingRequests}
                  onAccept={acceptJoinRequest}
                  onReject={rejectJoinRequest}
                />
              )}
              <ParticipantPanel
                participants={participants}
                currentUserId={user?.id}
                onCloseMobile={() => setMobileParticipantsOpen(false)}
                isVoiceChatActive={isVoiceChatActive}
                localStream={voiceLocalStream}
                audioEnabled={audioEnabled}
                videoEnabled={videoEnabled}
                remoteStreams={voiceRemoteStreams}
                onStartVoiceChat={startVoiceChat}
                onStopVoiceChat={stopVoiceChat}
                onToggleAudio={toggleAudio}
                onToggleVideo={toggleVideo}
                onForceMute={forceMuteUser}
              />
            </div>
          </div>
        )}

        {/* Workspace: PDF, Whiteboard, or Screen Share (Kept mounted for real-time background sync) */}
        <main className="relative flex flex-1 flex-col overflow-hidden bg-muted/20">
          <div className={activeTab === 'whiteboard' ? 'h-full w-full flex flex-col' : 'hidden'}>
            <Whiteboard
              socket={socket}
              classroomCode={classroomCode}
              isHost={isHost}
              initialOperations={initialWhiteboard}
            />
          </div>

          <div className={activeTab === 'pdf' ? 'h-full w-full flex flex-col' : 'hidden'}>
            <PdfViewer
              socket={socket}
              classroomCode={classroomCode}
              isHost={isHost}
              initialPdf={initialPdf}
            />
          </div>

          <div className={activeTab === 'screenshare' ? 'h-full w-full flex flex-col' : 'hidden'}>
            <ScreenShare
              isHost={isHost}
              isSharing={isSharing}
              localStream={localStream}
              remoteStream={remoteStream}
              onStartShare={startScreenShare}
              onStopShare={stopScreenShare}
            />
          </div>
        </main>
      </div>


      {/* 3. Classroom Controls Footer */}
      <ClassroomControls
        activeTab={activeTab}
        onTabChange={switchTab}
        isHost={isHost}
        isScreenSharing={isSharing}
        onStartScreenShare={startScreenShare}
        onStopScreenShare={stopScreenShare}
      />
    </div>
  );
};
