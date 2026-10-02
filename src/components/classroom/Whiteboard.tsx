import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { useWhiteboard } from '@/hooks/useWhiteboard';
import { WhiteboardToolbar } from './WhiteboardToolbar';
import { WhiteboardOperation } from '@/types/whiteboard';

interface WhiteboardProps {
  socket: Socket | null;
  classroomCode: string;
  isHost: boolean;
  initialOperations?: WhiteboardOperation[];
  userId?: string;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({
  socket,
  classroomCode,
  isHost,
  initialOperations,
  userId,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch((err) => {
        console.warn('Could not enter fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const {
    canvasRef,
    tool,
    setTool,
    color,
    setColor,
    strokeWidth,
    setStrokeWidth,
    clearWhiteboard,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useWhiteboard({
    socket,
    classroomCode,
    isHost,
    initialOperations,
    userId,
  });

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full flex-col overflow-hidden transition-colors ${
        isFullscreen ? 'bg-zinc-950 text-white' : 'bg-background'
      }`}
    >
      {/* Whiteboard Action Toolbar */}
      <WhiteboardToolbar
        tool={tool}
        onToolChange={setTool}
        color={color}
        onColorChange={setColor}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        onClear={isHost ? clearWhiteboard : undefined}
        isHost={isHost}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Interactive HTML5 Canvas Container */}
      <div className="relative flex-1 w-full h-full bg-white dark:bg-zinc-950 overflow-hidden cursor-crosshair">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
    </div>
  );
};
