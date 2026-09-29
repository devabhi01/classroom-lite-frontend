import React, { useRef, useEffect } from 'react';
import { Monitor, MonitorPlay, MonitorStop, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface ScreenShareProps {
  isHost: boolean;
  isSharing: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onStartShare: () => void;
  onStopShare: () => void;
}

export const ScreenShare: React.FC<ScreenShareProps> = ({
  isHost,
  isSharing,
  localStream,
  remoteStream,
  onStartShare,
  onStopShare,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeStream = isHost ? localStream : remoteStream;

  useEffect(() => {
    if (videoRef.current) {
      if (activeStream) {
        videoRef.current.srcObject = activeStream;
        videoRef.current.play().catch((err) => {
          console.warn('Video play error:', err);
        });
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [activeStream]);

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.warn('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full flex-col items-center justify-center bg-black/95 overflow-hidden select-none"
    >
      {/* Top Overlay Bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-black/50 text-white border-white/20 text-xs">
            <Monitor className="mr-1.5 h-3.5 w-3.5" />
            Screen Share
          </Badge>
          {isSharing && (
            <Badge variant="destructive" className="animate-pulse text-[10px] px-2 py-0.5">
              LIVE
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {isSharing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullScreen}
              className="text-white hover:bg-white/20 h-8 w-8 rounded-full"
              title="Full Screen"
              aria-label="Toggle Fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}

          {isHost && isSharing && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onStopShare}
              className="h-8 text-xs font-medium"
            >
              <MonitorStop className="mr-1.5 h-3.5 w-3.5" />
              Stop Sharing
            </Button>
          )}
        </div>
      </div>

      {/* Main Video Screen */}
      {isSharing && activeStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isHost} // Mute local host stream to avoid audio feedback loop
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
          <div className="rounded-full bg-white/5 p-6 mb-4 ring-1 ring-white/10">
            <Monitor className="h-12 w-12 text-white/40" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {isHost ? 'Share Your Screen' : 'No Screen Shared'}
          </h3>
          <p className="text-xs text-white/60 mb-6">
            {isHost
              ? 'Present code editors, slides, browser tabs, or full monitors to all connected students using WebRTC peer-to-peer streaming.'
              : 'The host is not currently sharing their screen. You will see the live stream here when started.'}
          </p>

          {isHost && (
            <Button
              onClick={onStartShare}
              className="bg-primary hover:bg-primary/90 text-white shadow-md font-medium"
            >
              <MonitorPlay className="mr-2 h-4 w-4" />
              Start Screen Sharing
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
