import React, { useState } from 'react';
import { PanelLeftOpen } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { Classroom, WorkspaceTab } from '@/types/classroom';
import { Participant, JoinRequest } from '@/types/participant';
import { PdfState } from '@/types/pdf';
import { WhiteboardOperation } from '@/types/whiteboard';
import { User } from '@/types/auth';
import { RemoteStream } from '@/hooks/useVoiceChat';
import { ClassroomHeader } from './ClassroomHeader';
import { ParticipantPanel } from './ParticipantPanel';
import { JoinRequests } from './JoinRequests';
import { ClassroomControls } from './ClassroomControls';
import { Whiteboard } from './Whiteboard';
import { PdfViewer } from './PdfViewer';
import { ScreenShare } from './ScreenShare';
import { InteractionModeView } from './InteractionModeView';

interface TeacherClassroomViewProps {
  socket: Socket | null;
  classroom: Classroom;
  classroomCode: string;
  isHost: boolean;
  participants: Participant[];
  pendingRequests: JoinRequest[];
  activeTab: WorkspaceTab;
  initialPdf: PdfState | null;
  initialWhiteboard: WhiteboardOperation[];
  switchTab: (tab: WorkspaceTab) => void;
  acceptJoinRequest: (id: string) => Promise<void>;
  rejectJoinRequest: (id: string) => Promise<void>;
  endClassroom: () => Promise<void>;
  leaveClassroom: () => void;
  isSharing: boolean;
  localScreenStream: MediaStream | null;
  remoteScreenStream: MediaStream | null;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  isVoiceChatActive: boolean;
  voiceLocalStream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  voiceRemoteStreams: Map<string, RemoteStream>;
  startVoiceChat: (withVideo?: boolean) => Promise<void>;
  stopVoiceChat: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  forceMuteUser: (userId: string) => void;
  currentUser: User | null;
}

export const TeacherClassroomView: React.FC<TeacherClassroomViewProps> = ({
  socket,
  classroom,
  classroomCode,
  isHost,
  participants,
  pendingRequests,
  activeTab,
  initialPdf,
  initialWhiteboard,
  switchTab,
  acceptJoinRequest,
  rejectJoinRequest,
  endClassroom,
  leaveClassroom,
  isSharing,
  localScreenStream,
  remoteScreenStream,
  startScreenShare,
  stopScreenShare,
  isVoiceChatActive,
  voiceLocalStream,
  audioEnabled,
  videoEnabled,
  voiceRemoteStreams,
  startVoiceChat,
  stopVoiceChat,
  toggleAudio,
  toggleVideo,
  forceMuteUser,
  currentUser,
}) => {
  const [mobileParticipantsOpen, setMobileParticipantsOpen] = useState(false);
  const [isParticipantPanelOpen, setIsParticipantPanelOpen] = useState(true);

  const toggleParticipants = () => {
    if (window.innerWidth < 768) {
      setMobileParticipantsOpen(!mobileParticipantsOpen);
    } else {
      setIsParticipantPanelOpen(!isParticipantPanelOpen);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      {/* 1. Host Classroom Header (Hidden during full-screen interaction video call) */}
      {activeTab !== 'interaction' && (
        <ClassroomHeader
          classroomName={classroom.name}
          classroomCode={classroom.code}
          participantCount={participants.length}
          isHost={true}
          createdAt={classroom.createdAt}
          isEnded={classroom.status === 'ENDED'}
          onLeave={leaveClassroom}
          onEndClassroom={endClassroom}
          onToggleParticipants={toggleParticipants}
          isParticipantOpen={isParticipantPanelOpen}
          isMobileParticipantOpen={mobileParticipantsOpen}
          pendingRequestsCount={pendingRequests.length}
          activeTab={activeTab}
        />
      )}

      {/* 2. Main Middle Section: Host Sidebar + Collaborative Workspace */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Desktop Sidebar: Participants & Join Requests (Hidden in full-screen interaction mode) */}
        {activeTab !== 'interaction' && (isParticipantPanelOpen ? (
          <div className="hidden md:flex w-72 lg:w-80 shrink-0 flex-col transition-all duration-200 border-r border-border bg-card">
            {/* Host Join Requests */}
            {pendingRequests.length > 0 && (
              <JoinRequests
                requests={pendingRequests}
                onAccept={acceptJoinRequest}
                onReject={rejectJoinRequest}
              />
            )}

            <ParticipantPanel
              participants={participants}
              currentUserId={currentUser?.id}
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
        ))}

        {/* Mobile Sidebar Overlay / Drawer */}
        {mobileParticipantsOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setMobileParticipantsOpen(false)}
            />
            <div className="relative z-50 w-72 max-w-[85vw] h-full bg-card shadow-2xl flex flex-col">
              {pendingRequests.length > 0 && (
                <JoinRequests
                  requests={pendingRequests}
                  onAccept={acceptJoinRequest}
                  onReject={rejectJoinRequest}
                />
              )}
              <ParticipantPanel
                participants={participants}
                currentUserId={currentUser?.id}
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

        {/* Workspace Canvas (Supports Whiteboard, PDF, Screen Share, and Interaction Mode) */}
        <main className="relative flex flex-1 flex-col overflow-hidden bg-muted/20">
          {/* Interaction Mode (WhatsApp-style Video Call) */}
          <div className={activeTab === 'interaction' ? 'h-full w-full flex flex-col' : 'hidden'}>
            <InteractionModeView
              localStream={voiceLocalStream}
              remoteStreams={voiceRemoteStreams}
              audioEnabled={audioEnabled}
              videoEnabled={videoEnabled}
              onToggleAudio={toggleAudio}
              onToggleVideo={toggleVideo}
              isHost={true}
              participants={participants}
              currentUserId={currentUser?.id}
              classroomName={classroom.name}
              onLeave={leaveClassroom}
              onSwitchTab={switchTab}
              onEndClassroom={endClassroom}
            />
          </div>

          {/* Whiteboard */}
          <div className={activeTab === 'whiteboard' ? 'h-full w-full flex flex-col' : 'hidden'}>
            <Whiteboard
              socket={socket}
              classroomCode={classroomCode}
              isHost={true}
              initialOperations={initialWhiteboard}
              userId={currentUser?.id}
            />
          </div>

          {/* PDF Viewer */}
          <div className={activeTab === 'pdf' ? 'h-full w-full flex flex-col' : 'hidden'}>
            <PdfViewer
              socket={socket}
              classroomCode={classroomCode}
              isHost={true}
              initialPdf={initialPdf}
            />
          </div>

          {/* Screen Share */}
          <div className={activeTab === 'screenshare' ? 'h-full w-full flex flex-col' : 'hidden'}>
            <ScreenShare
              isHost={true}
              isSharing={isSharing}
              localStream={localScreenStream}
              remoteStream={remoteScreenStream}
              onStartShare={startScreenShare}
              onStopShare={stopScreenShare}
            />
          </div>
        </main>
      </div>

      {/* 3. Teacher Controls Footer (Hidden during full-screen interaction video call) */}
      {activeTab !== 'interaction' && (
        <ClassroomControls
          activeTab={activeTab}
          onTabChange={switchTab}
          isHost={true}
          isScreenSharing={isSharing}
          onStartScreenShare={startScreenShare}
          onStopScreenShare={stopScreenShare}
          audioEnabled={audioEnabled}
          videoEnabled={videoEnabled}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
        />
      )}
    </div>
  );
};
