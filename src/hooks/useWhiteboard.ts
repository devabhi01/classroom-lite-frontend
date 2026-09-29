import { useState, useRef, useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { DrawData, EraseData, WhiteboardOperation, WhiteboardTool } from '@/types/whiteboard';

interface UseWhiteboardProps {
  socket: Socket | null;
  classroomCode: string;
  isHost: boolean;
  initialOperations?: WhiteboardOperation[];
}

export const useWhiteboard = ({
  socket,
  classroomCode,
  isHost: _isHost,
  initialOperations = [],
}: UseWhiteboardProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<WhiteboardTool>('pen');
  const [color, setColor] = useState<string>('#000000');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [operations, setOperations] = useState<WhiteboardOperation[]>(initialOperations);

  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Helper to replay a single operation onto canvas
  const drawOperationOnCanvas = useCallback(
    (ctx: CanvasRenderingContext2D, op: WhiteboardOperation, width: number, height: number) => {
      if (op.type === 'clear') {
        ctx.clearRect(0, 0, width, height);
        return;
      }

      ctx.save();
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Convert normalized 0..1 coordinates to canvas pixel coordinates
      // Or if raw coordinates, check if op.x1 <= 1.0 (normalized) or direct
      const isNorm = op.x1 <= 1.05 && op.x2 <= 1.05 && op.y1 <= 1.05 && op.y2 <= 1.05;
      const x1 = isNorm ? op.x1 * width : op.x1;
      const y1 = isNorm ? op.y1 * height : op.y1;
      const x2 = isNorm ? op.x2 * width : op.x2;
      const y2 = isNorm ? op.y2 * height : op.y2;

      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      if (op.type === 'draw') {
        ctx.strokeStyle = op.color;
        ctx.lineWidth = op.width;
        ctx.globalCompositeOperation = 'source-over';
      } else if (op.type === 'erase') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = op.width;
        ctx.globalCompositeOperation = 'destination-out';
      }

      ctx.stroke();
      ctx.restore();
    },
    []
  );

  // Replay all operations onto canvas
  const redrawAll = useCallback(
    (ops: WhiteboardOperation[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ops.forEach((op) => {
        drawOperationOnCanvas(ctx, op, canvas.width, canvas.height);
      });
    },
    [drawOperationOnCanvas]
  );

  // Handle resizing of canvas
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Only update if dimensions changed
    const targetWidth = Math.floor(rect.width);
    const targetHeight = Math.floor(rect.height);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      redrawAll(operations);
    }
  }, [operations, redrawAll]);

  // Sync initial operations
  useEffect(() => {
    if (initialOperations && initialOperations.length > 0) {
      setOperations(initialOperations);
      redrawAll(initialOperations);
    }
  }, [initialOperations, redrawAll]);

  // Setup canvas resize listener with ResizeObserver for instant tab display changes
  useEffect(() => {
    resizeCanvas();
    const t = setTimeout(resizeCanvas, 80);
    window.addEventListener('resize', resizeCanvas);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && canvasRef.current?.parentElement) {
      observer = new ResizeObserver(() => {
        resizeCanvas();
      });
      observer.observe(canvasRef.current.parentElement);
    }

    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', resizeCanvas);
      if (observer) observer.disconnect();
    };
  }, [resizeCanvas]);

  // Socket listeners for real-time whiteboard events
  useEffect(() => {
    if (!socket) return;

    const handleRemoteDraw = (payload: any) => {
      const data = payload?.data || payload;
      if (data?.x1 === undefined || data?.y1 === undefined) return;

      const op: WhiteboardOperation = {
        type: 'draw',
        x1: data.x1,
        y1: data.y1,
        x2: data.x2,
        y2: data.y2,
        color: data.color || '#000000',
        width: data.width || 3,
      };

      setOperations((prev) => [...prev, op]);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawOperationOnCanvas(ctx, op, canvas.width, canvas.height);
        }
      }
    };

    const handleRemoteErase = (payload: any) => {
      const data = payload?.data || payload;
      if (data?.x1 === undefined || data?.y1 === undefined) return;

      const op: WhiteboardOperation = {
        type: 'erase',
        x1: data.x1,
        y1: data.y1,
        x2: data.x2,
        y2: data.y2,
        width: data.width || 10,
      };

      setOperations((prev) => [...prev, op]);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawOperationOnCanvas(ctx, op, canvas.width, canvas.height);
        }
      }
    };

    const handleRemoteClear = () => {
      setOperations([]);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    };

    const handleRemoteState = (payload: any) => {
      const ops: WhiteboardOperation[] = Array.isArray(payload) ? payload : (payload?.operations || []);
      setOperations(ops);
      redrawAll(ops);
    };

    socket.on('whiteboard:draw', handleRemoteDraw);
    socket.on('whiteboard:erase', handleRemoteErase);
    socket.on('whiteboard:cleared', handleRemoteClear);
    socket.on('whiteboard:clear', handleRemoteClear);
    socket.on('whiteboard:state', handleRemoteState);

    // Sync latest whiteboard state on join / connect
    const syncState = () => {
      socket.emit('whiteboard:state', { classroomCode });
    };

    if (socket.connected) {
      syncState();
    } else {
      socket.on('connect', syncState);
    }

    return () => {
      socket.off('whiteboard:draw', handleRemoteDraw);
      socket.off('whiteboard:erase', handleRemoteErase);
      socket.off('whiteboard:cleared', handleRemoteClear);
      socket.off('whiteboard:clear', handleRemoteClear);
      socket.off('whiteboard:state', handleRemoteState);
      socket.off('connect', syncState);
    };
  }, [socket, classroomCode, drawOperationOnCanvas, redrawAll]);

  // Pointer event handlers
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    lastPointRef.current = { x, y };
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || !lastPointRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const currentX = (e.clientX - rect.left) / rect.width;
      const currentY = (e.clientY - rect.top) / rect.height;

      const p1 = lastPointRef.current;
      const p2 = { x: currentX, y: currentY };

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ctx = canvas.getContext('2d');

      if (tool === 'pen') {
        const drawData: DrawData = {
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          color,
          width: strokeWidth,
        };

        const op: WhiteboardOperation = { type: 'draw', ...drawData };
        setOperations((prev) => [...prev, op]);
        if (ctx) drawOperationOnCanvas(ctx, op, canvasWidth, canvasHeight);

        if (socket && socket.connected) {
          socket.emit('whiteboard:draw', {
            classroomCode,
            ...drawData,
            data: drawData,
          });
        }
      } else if (tool === 'eraser') {
        const eraseData: EraseData = {
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          width: strokeWidth * 3, // slightly wider eraser
        };

        const op: WhiteboardOperation = { type: 'erase', ...eraseData };
        setOperations((prev) => [...prev, op]);
        if (ctx) drawOperationOnCanvas(ctx, op, canvasWidth, canvasHeight);

        if (socket && socket.connected) {
          socket.emit('whiteboard:erase', {
            classroomCode,
            ...eraseData,
            data: eraseData,
          });
        }
      }

      lastPointRef.current = p2;
    },
    [tool, color, strokeWidth, socket, classroomCode, drawOperationOnCanvas]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
    try {
      if (canvasRef.current?.hasPointerCapture(e.pointerId)) {
        canvasRef.current.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
  }, []);

  const clearWhiteboard = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    setOperations([]);
    if (socket && socket.connected) {
      socket.emit('whiteboard:clear', { classroomCode });
    }
  }, [socket, classroomCode]);

  return {
    canvasRef,
    tool,
    setTool,
    color,
    setColor,
    strokeWidth,
    setStrokeWidth,
    operations,
    clearWhiteboard,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    redrawAll,
  };
};
