import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  FlipHorizontal,
  RotateCw,
  Edit3,
  FileText,
  Monitor,
  Users,
  ArrowLeftRight,
  Crown,
  GraduationCap,
} from 'lucide-react';
import { Participant } from '@/types/participant';
import { RemoteStream } from '@/hooks/useVoiceChat';
import { WorkspaceTab } from '@/types/classroom';

interface InteractionModeViewProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, RemoteStream>;
  audioEnabled: boolean;
  videoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  isHost: boolean;
  participants: Participant[];
  currentUserId?: string;
  classroomName: string;
  onLeave?: () => void;
  onSwitchTab?: (tab: WorkspaceTab) => void;
  onEndClassroom?: () => void;
}

export const InteractionModeView: React.FC<InteractionModeViewProps> = ({
  localStream,
  remoteStreams,
  audioEnabled,
  videoEnabled,
  onToggleAudio,
  onToggleVideo,
  isHost,
  participants,
  currentUserId,
  classroomName,
  onLeave,
  onSwitchTab,
  onEndClassroom,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSwapped, setIsSwapped] = useState(false);
  const [localMirrored, setLocalMirrored] = useState(true);

  // Filter other participants in the room (excluding current user)
  const otherParticipants = participants.filter((p) => p.userId !== currentUserId);

  // If participants list is empty or only 1 remote stream exists in map, find peers
  const peersList = otherParticipants.length > 0
    ? otherParticipants.map((p) => {
        const streamData = remoteStreams.get(p.userId);
        return {
          userId: p.userId,
          name: p.name,
          role: p.role,
          streamData: streamData || null,
        };
      })
    : Array.from(remoteStreams.values()).map((r) => ({
        userId: r.userId,
        name: r.name,
        role: 'STUDENT',
        streamData: r,
      }));

  const totalPeers = peersList.length;
  const isOneOnOne = totalPeers === 1;
  const singlePeer = isOneOnOne ? peersList[0] : null;

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full flex-col bg-zinc-950 text-white overflow-hidden select-none"
    >
      {/* ── Top Floating Header (WhatsApp call style) ── */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center space-x-2 pointer-events-auto">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold backdrop-blur-md shadow-lg">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping mr-0.5" />
            <span>Interaction Mode</span>
          </div>
          <span className="text-xs text-zinc-300 font-medium hidden sm:inline truncate max-w-[200px]">
            {classroomName}
          </span>
        </div>

        <div className="flex items-center space-x-2 pointer-events-auto">
          {/* Quick workspace switcher for Host to easily return to Whiteboard / PDF / Screen */}
          {isHost && onSwitchTab && (
            <div className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-lg p-1 backdrop-blur-md shadow-lg">
              <button
                onClick={() => onSwitchTab('whiteboard')}
                className="px-2.5 py-1 rounded text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-1 font-medium cursor-pointer"
                title="Return to Whiteboard"
              >
                <Edit3 className="h-3.5 w-3.5 text-primary" />
                <span className="hidden md:inline">Whiteboard</span>
              </button>
              <button
                onClick={() => onSwitchTab('pdf')}
                className="px-2.5 py-1 rounded text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-1 font-medium cursor-pointer"
                title="Return to PDF Presentation"
              >
                <FileText className="h-3.5 w-3.5 text-blue-400" />
                <span className="hidden md:inline">PDF</span>
              </button>
              <button
                onClick={() => onSwitchTab('screenshare')}
                className="px-2.5 py-1 rounded text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-1 font-medium cursor-pointer"
                title="Start Screen Sharing"
              >
                <Monitor className="h-3.5 w-3.5 text-purple-400" />
                <span className="hidden md:inline">Screen</span>
              </button>
            </div>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white backdrop-blur-md transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Call'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Main Call Display Area ── */}
      <div className="relative flex-1 w-full h-full overflow-hidden p-2 sm:p-4 flex items-center justify-center">
        {totalPeers === 0 ? (
          /* Zero Remote Peers: Only current user is present */
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-2xl aspect-video rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl flex items-center justify-center">
              {videoEnabled && localStream ? (
                <video
                  ref={(el) => {
                    if (el && el.srcObject !== localStream) {
                      el.srcObject = localStream;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${localMirrored ? 'scale-x-[-1]' : ''}`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 text-zinc-400">
                  <div className="w-20 h-20 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-3xl font-bold text-zinc-200 uppercase shadow-inner">
                    You
                  </div>
                  <span className="text-sm font-medium">Your Camera is Off</span>
                </div>
              )}

              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md text-xs font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>You (In Video Call)</span>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-zinc-300 font-medium">Waiting for other participants to join the video call...</p>
              <p className="text-xs text-zinc-400 mt-1">Both you and others will appear here as soon as they enter.</p>
            </div>
          </div>
        ) : isOneOnOne && singlePeer ? (
          /* 1-on-1 WhatsApp Call Layout: Edge-to-edge Remote with Floating PIP Local */
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Main Stage Video Tile */}
            <div className="relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl flex items-center justify-center">
              {isSwapped ? (
                /* Swapped: Local self-camera on main stage */
                videoEnabled && localStream ? (
                  <video
                    ref={(el) => {
                      if (el && el.srcObject !== localStream) {
                        el.srcObject = localStream;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${localMirrored ? 'scale-x-[-1]' : ''}`}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 text-zinc-400">
                    <div className="w-24 h-24 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-3xl font-bold text-zinc-200 uppercase shadow-inner">
                      You
                    </div>
                    <span className="text-sm font-medium">Your Camera is Off</span>
                  </div>
                )
              ) : (
                /* Normal: Remote peer on main stage */
                <PeerVideoPlayer peer={singlePeer} />
              )}

              {/* Main Stage Name Tag */}
              <div className="absolute bottom-20 sm:bottom-24 left-4 z-20 flex items-center gap-2 bg-black/60 px-3.5 py-1.5 rounded-full backdrop-blur-md text-xs font-semibold text-white shadow-lg">
                <span>{isSwapped ? 'You' : singlePeer.name}</span>
                {!isSwapped && singlePeer.role === 'HOST' && (
                  <span className="flex items-center gap-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    <Crown className="h-2.5 w-2.5" /> Teacher
                  </span>
                )}
                {!isSwapped && singlePeer.streamData?.audioMuted && (
                  <span className="bg-red-500/80 p-0.5 rounded text-[10px] text-white">
                    <MicOff className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>

            {/* Floating Picture-in-Picture (PIP) Tile (Self preview or remote if swapped) */}
            <div
              onClick={() => setIsSwapped((prev) => !prev)}
              className="absolute z-30 top-16 sm:top-20 right-3 sm:right-6 w-28 xs:w-36 sm:w-48 aspect-[3/4] sm:aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-900 border-2 border-primary/70 shadow-2xl cursor-pointer group transition-all duration-300 hover:scale-105 active:scale-95"
              title="Click or tap to swap view"
            >
              {isSwapped ? (
                /* Remote in mini PIP */
                <PeerVideoPlayer peer={singlePeer} isPip />
              ) : (
                /* Local in mini PIP */
                videoEnabled && localStream ? (
                  <video
                    ref={(el) => {
                      if (el && el.srcObject !== localStream) {
                        el.srcObject = localStream;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${localMirrored ? 'scale-x-[-1]' : ''}`}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 text-zinc-300 text-xs">
                    <div className="w-10 h-10 rounded-full bg-primary/40 flex items-center justify-center font-bold text-sm">
                      You
                    </div>
                    <span className="text-[10px] mt-1 text-zinc-400">Off</span>
                  </div>
                )
              )}

              {/* Overlay swap icon */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <ArrowLeftRight className="h-6 w-6 text-white drop-shadow" />
              </div>

              {/* Mini tag */}
              <div className="absolute bottom-1.5 left-1.5 z-10 bg-black/70 px-2 py-0.5 rounded text-[10px] font-semibold text-white">
                {isSwapped ? singlePeer.name : 'You'}
              </div>
            </div>
          </div>
        ) : (
          /* Group Call WhatsApp Grid: 2 or more remote peers */
          <div
            className={`grid w-full h-full gap-2 sm:gap-4 items-center justify-center overflow-y-auto max-h-full pb-20 ${
              totalPeers === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : totalPeers <= 4
                ? 'grid-cols-2'
                : 'grid-cols-2 md:grid-cols-3'
            }`}
          >
            {/* Local Preview Tile */}
            <div className="relative w-full h-full min-h-[160px] sm:min-h-[220px] rounded-2xl overflow-hidden bg-zinc-900 border border-primary/40 flex items-center justify-center shadow-lg">
              {videoEnabled && localStream ? (
                <video
                  ref={(el) => {
                    if (el && el.srcObject !== localStream) {
                      el.srcObject = localStream;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${localMirrored ? 'scale-x-[-1]' : ''}`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-zinc-400">
                  <div className="w-14 h-14 rounded-full bg-primary/40 flex items-center justify-center text-xl font-bold text-white uppercase shadow-inner">
                    You
                  </div>
                  <span className="text-xs text-zinc-400">Camera Off</span>
                </div>
              )}
              <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-full text-xs font-semibold">
                <span className="text-white">You</span>
                {!audioEnabled && <MicOff className="h-3 w-3 text-red-400" />}
              </div>
            </div>

            {/* Remote Peers Tiles */}
            {peersList.map((peer) => (
              <div
                key={peer.userId}
                className="relative w-full h-full min-h-[160px] sm:min-h-[220px] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg group"
              >
                <PeerVideoPlayer peer={peer} />

                <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-full text-xs font-semibold">
                  <span className="text-white">{peer.name}</span>
                  {peer.role === 'HOST' && (
                    <span className="flex items-center gap-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                      <Crown className="h-2.5 w-2.5" /> Teacher
                    </span>
                  )}
                  {peer.streamData?.audioMuted && <MicOff className="h-3 w-3 text-red-400" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── WhatsApp Call Floating Bottom Control Dock ── */}
      <div className="absolute bottom-4 inset-x-0 z-40 flex items-center justify-center pointer-events-none px-4">
        <div className="flex items-center gap-2.5 sm:gap-4 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full bg-zinc-900/90 border border-zinc-800 shadow-2xl backdrop-blur-xl pointer-events-auto">
          {/* Microphone Mute / Unmute */}
          <button
            onClick={onToggleAudio}
            className={`p-3 sm:p-3.5 rounded-full transition-all duration-200 cursor-pointer shadow-md ${
              audioEnabled
                ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
            }`}
            title={audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
            aria-label="Toggle Microphone"
          >
            {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>

          {/* Camera On / Off */}
          <button
            onClick={onToggleVideo}
            className={`p-3 sm:p-3.5 rounded-full transition-all duration-200 cursor-pointer shadow-md ${
              videoEnabled
                ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
            aria-label="Toggle Camera"
          >
            {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>

          {/* Mirror / Flip Camera Toggle */}
          <button
            onClick={() => setLocalMirrored((prev) => !prev)}
            className={`p-3 sm:p-3.5 rounded-full transition-all duration-200 cursor-pointer shadow-md ${
              localMirrored
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                : 'bg-primary text-white'
            }`}
            title={localMirrored ? 'Mirror Camera is ON (Click to un-mirror)' : 'Mirror Camera is OFF'}
            aria-label="Flip Camera"
          >
            <FlipHorizontal className="h-5 w-5" />
          </button>

          {/* Host Exit Interaction Mode button */}
          {isHost && onSwitchTab && (
            <button
              onClick={() => onSwitchTab('whiteboard')}
              className="px-3.5 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              title="Return to Whiteboard"
            >
              <Edit3 className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Whiteboard</span>
            </button>
          )}

          {/* End Call / Leave Button (Bright Red Circle) */}
          <button
            onClick={isHost && onEndClassroom ? onEndClassroom : onLeave}
            className="p-3 sm:p-3.5 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white transition-all duration-200 cursor-pointer shadow-lg shadow-red-600/30"
            title={isHost ? 'End Classroom Session' : 'Leave Call'}
            aria-label="Leave or End Call"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Peer Video Subcomponent ──
const PeerVideoPlayer: React.FC<{
  peer: {
    userId: string;
    name: string;
    role?: string;
    streamData: RemoteStream | null;
  };
  isPip?: boolean;
}> = ({ peer, isPip = false }) => {
  const stream = peer.streamData?.stream;
  const [hasVideoTrack, setHasVideoTrack] = useState(() => {
    return stream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live') ?? false;
  });
  const [isFlipped, setIsFlipped] = useState(false);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!stream) {
      setHasVideoTrack(false);
      return;
    }
    const checkTracks = () => {
      const live = stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live');
      setHasVideoTrack(live);
    };

    checkTracks();
    stream.addEventListener('addtrack', checkTracks);
    stream.addEventListener('removetrack', checkTracks);

    const interval = setInterval(checkTracks, 1000);
    return () => {
      stream.removeEventListener('addtrack', checkTracks);
      stream.removeEventListener('removetrack', checkTracks);
      clearInterval(interval);
    };
  }, [stream]);

  const showVideo = hasVideoTrack && !peer.streamData?.videoMuted;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Audio stream element (plays sound) */}
      {stream && (
        <audio
          ref={(el) => {
            if (el && el.srcObject !== stream) {
              el.srcObject = stream;
              el.play().catch(() => {});
            }
          }}
          autoPlay
        />
      )}

      {/* Video stream element */}
      {stream && (
        <video
          ref={(el) => {
            if (el && el.srcObject !== stream) {
              el.srcObject = stream;
              el.play().catch(() => {});
            }
          }}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-transform duration-200 ${showVideo ? 'block' : 'hidden'}`}
          style={{
            transform: `${isFlipped ? 'scaleX(-1)' : ''} rotate(${rotation}deg)`.trim() || undefined,
          }}
        />
      )}

      {/* Camera Off Placeholder */}
      {!showVideo && (
        <div className="flex flex-col items-center justify-center gap-3 text-zinc-300">
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-3xl sm:text-4xl font-bold uppercase text-zinc-200 shadow-2xl">
            {peer.name.charAt(0)}
          </div>
          <span className="text-xs sm:text-sm font-medium text-zinc-400">Camera Off</span>
        </div>
      )}

      {/* Controls Overlay on hover (Flip & Rotate) for non-PIP */}
      {!isPip && showVideo && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsFlipped((prev) => !prev);
            }}
            className="p-1.5 bg-black/60 hover:bg-black/90 rounded-full text-white backdrop-blur-md transition-colors"
            title="Mirror remote video"
          >
            <FlipHorizontal className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRotation((r) => (r + 90) % 360);
            }}
            className="p-1.5 bg-black/60 hover:bg-black/90 rounded-full text-white backdrop-blur-md transition-colors"
            title="Rotate video 90°"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
