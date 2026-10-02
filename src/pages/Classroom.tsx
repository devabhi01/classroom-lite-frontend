import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useClassroom } from '@/hooks/useClassroom';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { TeacherClassroomView } from '@/components/classroom/TeacherClassroomView';
import { StudentClassroomView } from '@/components/classroom/StudentClassroomView';

export const Classroom: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const classroomCode = (code || '').toUpperCase();

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
    refreshClassroom,
  } = useClassroom({
    classroomCode,
    currentUser: user,
  });

  // WebRTC Screen share manager
  const {
    isSharing,
    localStream: localScreenStream,
    remoteStream: remoteScreenStream,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC({
    socket,
    classroomCode,
    userId: user?.id || '',
    isHost,
  });

  // Voice + Video Chat manager
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
              The backend server at <code className="font-mono text-primary">http://localhost:3000</code> is currently offline. Please ensure the backend is running.
            </p>
          )}
          <div className="flex flex-col sm:flex-row justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button variant="secondary" size="sm" onClick={refreshClassroom}>
              Retry Connection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 1. Teacher/Host View: Full controls, join requests, whiteboard/pdf tools, screen share, and interaction mode
  if (isHost) {
    return (
      <TeacherClassroomView
        socket={socket}
        classroom={classroom}
        classroomCode={classroomCode}
        isHost={isHost}
        participants={participants}
        pendingRequests={pendingRequests}
        activeTab={activeTab}
        initialPdf={initialPdf}
        initialWhiteboard={initialWhiteboard}
        switchTab={switchTab}
        acceptJoinRequest={acceptJoinRequest}
        rejectJoinRequest={rejectJoinRequest}
        endClassroom={endClassroom}
        leaveClassroom={leaveClassroom}
        isSharing={isSharing}
        localScreenStream={localScreenStream}
        remoteScreenStream={remoteScreenStream}
        startScreenShare={startScreenShare}
        stopScreenShare={stopScreenShare}
        isVoiceChatActive={isVoiceChatActive}
        voiceLocalStream={voiceLocalStream}
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        voiceRemoteStreams={voiceRemoteStreams}
        startVoiceChat={startVoiceChat}
        stopVoiceChat={stopVoiceChat}
        toggleAudio={toggleAudio}
        toggleVideo={toggleVideo}
        forceMuteUser={forceMuteUser}
        currentUser={user}
      />
    );
  }

  // 2. Student View: Mobile-responsive, clean, distraction-free, auto-following the teacher
  return (
    <StudentClassroomView
      socket={socket}
      classroom={classroom}
      classroomCode={classroomCode}
      participants={participants}
      activeTab={activeTab}
      initialPdf={initialPdf}
      initialWhiteboard={initialWhiteboard}
      leaveClassroom={leaveClassroom}
      isSharing={isSharing}
      localScreenStream={localScreenStream}
      remoteScreenStream={remoteScreenStream}
      isVoiceChatActive={isVoiceChatActive}
      voiceLocalStream={voiceLocalStream}
      audioEnabled={audioEnabled}
      videoEnabled={videoEnabled}
      voiceRemoteStreams={voiceRemoteStreams}
      toggleAudio={toggleAudio}
      toggleVideo={toggleVideo}
      currentUser={user}
    />
  );
};
export default Classroom;
