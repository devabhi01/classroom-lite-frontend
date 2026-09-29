import React, { useRef, useEffect, useState } from 'react';
import { Users, Crown, GraduationCap, X, PanelLeftClose, Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Participant } from '@/types/participant';
import { RemoteStream } from '@/hooks/useVoiceChat';

// ── Single remote video tile ────────────────────────────────────────────────
const RemoteTile: React.FC<{
  remote: RemoteStream;
  onMaximize?: () => void;
  canMaximize: boolean;
}> = ({ remote, onMaximize, canMaximize }) => {
  const [hasLiveVideo, setHasLiveVideo] = useState<boolean>(() => {
    return remote.stream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live') ?? false;
  });

  useEffect(() => {
    if (!remote.stream) return;
    const updateTracks = () => {
      const live = remote.stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live');
      setHasLiveVideo(live);
    };

    updateTracks();
    remote.stream.addEventListener('addtrack', updateTracks);
    remote.stream.addEventListener('removetrack', updateTracks);

    // Periodic check in case track live status transitions
    const interval = setInterval(updateTracks, 1000);

    return () => {
      remote.stream.removeEventListener('addtrack', updateTracks);
      remote.stream.removeEventListener('removetrack', updateTracks);
      clearInterval(interval);
    };
  }, [remote.stream]);

  const showVideo = hasLiveVideo && !remote.videoMuted;

  return (
    <div className="group relative rounded-lg overflow-hidden bg-zinc-900 border border-border/60 aspect-video flex items-center justify-center mt-2">
      {/* Hidden audio element always active to ensure remote sound plays */}
      <audio
        ref={(el) => {
          if (el && remote.stream && el.srcObject !== remote.stream) {
            el.srcObject = remote.stream;
            el.play().catch(() => {});
          }
        }}
        autoPlay
      />

      {/* Video element always mounted and attached via callback ref */}
      <video
        ref={(el) => {
          if (el && remote.stream && el.srcObject !== remote.stream) {
            el.srcObject = remote.stream;
            el.play().catch(() => {});
          }
        }}
        autoPlay
        playsInline
        className={`w-full h-full object-cover ${showVideo ? 'block' : 'hidden'}`}
      />

      {/* Camera Off placeholder */}
      {!showVideo && (
        <div className="flex flex-col items-center justify-center gap-1 text-zinc-300">
          <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-lg font-bold uppercase shadow-inner">
            {remote.name.charAt(0)}
          </div>
          <span className="text-[10px] text-zinc-400">Camera Off</span>
        </div>
      )}

      {/* Host Maximize Button */}
      {canMaximize && (
        <button
          onClick={onMaximize}
          className="absolute top-1 right-1 p-1.5 bg-black/70 hover:bg-black/90 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow"
          title="Maximize video"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Status icons overlay */}
      <div className="absolute bottom-1 right-1 flex items-center gap-1 z-10 pointer-events-none">
        {remote.audioMuted && (
          <span className="bg-destructive/90 rounded p-0.5 shadow">
            <MicOff className="h-2.5 w-2.5 text-white" />
          </span>
        )}
      </div>
    </div>
  );
};

// ── Local video preview ──────────────────────────────────────────────────────
const LocalPreview: React.FC<{
  stream: MediaStream | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
  name?: string;
  onMaximize?: () => void;
  canMaximize: boolean;
}> = ({
  stream,
  videoEnabled,
  audioEnabled,
  name = 'You',
  onMaximize,
  canMaximize,
}) => {
  const showVideo = videoEnabled && !!stream;

  return (
    <div className="group relative rounded-lg overflow-hidden bg-zinc-900 border border-primary/50 aspect-video flex items-center justify-center mt-2">
      <video
        ref={(el) => {
          if (el && stream && el.srcObject !== stream) {
            el.srcObject = stream;
            el.play().catch(() => {});
          }
        }}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover scale-x-[-1] ${showVideo ? 'block' : 'hidden'}`}
      />

      {!showVideo && (
        <div className="flex flex-col items-center justify-center gap-1 text-zinc-300">
          <div className="w-10 h-10 rounded-full bg-primary/70 flex items-center justify-center text-lg font-bold uppercase shadow-inner">
            {name.charAt(0)}
          </div>
          <span className="text-[10px] text-zinc-400">Camera Off</span>
        </div>
      )}

      {canMaximize && showVideo && (
        <button
          onClick={onMaximize}
          className="absolute top-1 right-1 p-1.5 bg-black/70 hover:bg-black/90 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow"
          title="Maximize video"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="absolute bottom-1 right-1 flex items-center gap-1 z-10 pointer-events-none">
        {!audioEnabled && (
          <span className="bg-destructive/90 rounded p-0.5 shadow">
            <MicOff className="h-2.5 w-2.5 text-white" />
          </span>
        )}
      </div>
    </div>
  );
};

interface ParticipantPanelProps {
  participants: Participant[];
  currentUserId?: string;
  onCloseMobile?: () => void;
  onToggleMinimize?: () => void;

  // Voice Chat Props
  isVoiceChatActive?: boolean;
  localStream?: MediaStream | null;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  remoteStreams?: Map<string, RemoteStream>;
  onStartVoiceChat?: (withVideo?: boolean) => void;
  onStopVoiceChat?: () => void;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  onForceMute?: (targetUserId: string) => void;
}

export const ParticipantPanel: React.FC<ParticipantPanelProps> = ({
  participants,
  currentUserId,
  onCloseMobile,
  onToggleMinimize,
  isVoiceChatActive = false,
  localStream = null,
  audioEnabled = false,
  videoEnabled = false,
  remoteStreams = new Map(),
  onStartVoiceChat,
  onStopVoiceChat,
  onToggleAudio,
  onToggleVideo,
  onForceMute,
}) => {
  const [maximizedUser, setMaximizedUser] = useState<{
    stream: MediaStream | null;
    name: string;
    isLocal: boolean;
  } | null>(null);

  const hostCount = participants.filter((p) => p.role === 'HOST').length;
  const studentCount = participants.filter((p) => p.role === 'STUDENT').length;
  const currentUser = participants.find((p) => p.userId === currentUserId);
  const isCurrentUserHost = currentUser?.role === 'HOST';

  return (
    <div className="flex h-full w-full flex-col bg-card border-r border-border select-none relative">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-border p-4 shrink-0">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">Participants</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {participants.length}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className="hidden md:inline-flex items-center justify-center text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors"
              title="Minimize participant panel"
              aria-label="Minimize participant panel"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden text-muted-foreground hover:text-foreground p-1 rounded"
              aria-label="Close participant panel"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Participant List (with integrated media) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {participants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-xs text-muted-foreground">
            <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p>No participants in room</p>
          </div>
        ) : (
          participants.map((p) => {
            const isMe = p.userId === currentUserId;
            const isHost = p.role === 'HOST';

            // Find remote stream state if they are in the voice chat
            const remoteState = remoteStreams.get(p.userId);
            const inCall = isMe ? isVoiceChatActive : !!remoteState;
            const isMuted = isMe ? !audioEnabled : (remoteState?.audioMuted ?? false);
            const isVideoOff = isMe ? !videoEnabled : (remoteState?.videoMuted ?? false);

            return (
              <div
                key={p.userId}
                className={`flex flex-col p-3 rounded-xl border transition-colors ${
                  isMe ? 'bg-primary/5 border-primary/25' : 'bg-background border-border hover:bg-muted/30'
                }`}
              >
                {/* Top: Avatar, Name, Role */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <Avatar name={p.name} src={p.avatar} size="sm" />
                    <div className="min-w-0 flex flex-col">
                      <span className="text-sm font-medium text-foreground truncate">
                        {p.name} {isMe && <span className="text-xs text-primary font-normal">(You)</span>}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        {isHost ? (
                          <>
                            <Crown className="h-3 w-3 text-amber-500 inline" />
                            <span>Host</span>
                          </>
                        ) : (
                          <>
                            <GraduationCap className="h-3 w-3 text-blue-500 inline" />
                            <span>Student</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {inCall && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        {isMuted ? (
                          <MicOff className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <Mic className="h-3.5 w-3.5 text-green-500" />
                        )}
                        {isVideoOff ? (
                          <VideoOff className="h-3.5 w-3.5" />
                        ) : (
                          <Video className="h-3.5 w-3.5 text-blue-500" />
                        )}
                      </div>
                    )}
                    <Badge
                      variant={isHost ? 'default' : 'secondary'}
                      className="text-[10px] uppercase font-mono px-1.5 py-0"
                    >
                      {p.role}
                    </Badge>
                  </div>
                </div>

                {/* Middle: Video Screen */}
                {inCall && (
                  <div className="mt-1">
                    {isMe ? (
                      <LocalPreview
                        stream={localStream}
                        videoEnabled={videoEnabled}
                        audioEnabled={audioEnabled}
                        name={p.name}
                        canMaximize={isCurrentUserHost}
                        onMaximize={() =>
                          setMaximizedUser({
                            stream: localStream,
                            name: p.name + ' (You)',
                            isLocal: true,
                          })
                        }
                      />
                    ) : remoteState ? (
                      <RemoteTile
                        remote={remoteState}
                        canMaximize={isCurrentUserHost}
                        onMaximize={() =>
                          setMaximizedUser({
                            stream: remoteState.stream,
                            name: p.name,
                            isLocal: false,
                          })
                        }
                      />
                    ) : null}
                  </div>
                )}

                {/* Bottom: Options for self */}
                {isMe && inCall && (
                  <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-border/50">
                    <button
                      onClick={onToggleAudio}
                      className={`flex flex-1 items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        audioEnabled
                          ? 'bg-muted hover:bg-muted/80 text-foreground'
                          : 'bg-destructive/10 hover:bg-destructive/20 text-destructive'
                      }`}
                    >
                      {audioEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                      {audioEnabled ? 'Mute' : 'Unmute'}
                    </button>

                    <button
                      onClick={onToggleVideo}
                      className={`flex flex-1 items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        videoEnabled
                          ? 'bg-muted hover:bg-muted/80 text-foreground'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                      }`}
                    >
                      {videoEnabled ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                      {videoEnabled ? 'Stop' : 'Start'}
                    </button>

                    <button
                      onClick={onStopVoiceChat}
                      className="flex items-center justify-center p-1.5 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                      title="Leave audio/video"
                    >
                      <PhoneOff className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Bottom: Host controls for other participants */}
                {!isMe && inCall && isCurrentUserHost && (
                  <div className="flex items-center justify-end mt-2 pt-2 border-t border-border/50">
                    <button
                      onClick={() => onForceMute?.(p.userId)}
                      disabled={isMuted}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        isMuted
                          ? 'bg-muted text-muted-foreground/60 cursor-not-allowed'
                          : 'bg-destructive/10 hover:bg-destructive/20 text-destructive'
                      }`}
                      title={isMuted ? 'Participant is already muted' : 'Mute participant microphone'}
                    >
                      <MicOff className="h-3.5 w-3.5" />
                      {isMuted ? 'Muted' : 'Mute Participant'}
                    </button>
                  </div>
                )}

                {/* Rejoin if disconnected manually (only for self) */}
                {isMe && !inCall && (
                  <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-border/50">
                    <button
                      onClick={() => onStartVoiceChat?.(false)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-muted hover:bg-muted/80 text-foreground text-xs font-medium transition-colors"
                    >
                      <Mic className="h-3.5 w-3.5" />
                      Join Audio
                    </button>
                    <button
                      onClick={() => onStartVoiceChat?.(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors"
                    >
                      <Video className="h-3.5 w-3.5" />
                      Join Video
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Panel Footer Summary */}
      <div className="border-t border-border p-3 shrink-0 text-[11px] text-muted-foreground flex justify-between">
        <span>Hosts: {hostCount}</span>
        <span>Students: {studentCount}</span>
      </div>

      {/* Maximized Video Modal */}
      {maximizedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 lg:p-8 backdrop-blur-sm">
          <div className="relative w-full max-w-6xl aspect-video bg-black rounded-xl overflow-hidden border border-white/20 shadow-2xl flex items-center justify-center">
            {maximizedUser.stream ? (
              <video
                autoPlay
                playsInline
                muted={maximizedUser.isLocal}
                className={`w-full h-full object-contain ${maximizedUser.isLocal ? 'scale-x-[-1]' : ''}`}
                ref={(node) => {
                  if (node && maximizedUser.stream && node.srcObject !== maximizedUser.stream) {
                    node.srcObject = maximizedUser.stream;
                    node.play().catch(() => {});
                  }
                }}
              />
            ) : (
              <div className="text-zinc-500">Stream unavailable</div>
            )}

            {/* Modal Controls */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setMaximizedUser(null)}
                className="p-2 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur transition-colors"
                title="Close fullscreen"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="absolute bottom-4 left-4 z-10 bg-black/60 px-4 py-2 rounded-lg text-white font-medium backdrop-blur border border-white/10 shadow-lg">
              {maximizedUser.name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
