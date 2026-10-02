import { useState, useRef, useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { DrawData, EraseData, WhiteboardOperation, WhiteboardTool } from '@/types/whiteboard';

interface UseWhiteboardProps {
  socket: Socket | null;
  classroomCode: string;
  isHost: boolean;
  initialOperations?: WhiteboardOperation[];
  userId?: string;
}

export const useWhiteboard = ({
  socket,
  classroomCode,
  isHost: _isHost,
  initialOperations = [],
  userId,
}: UseWhiteboardProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<WhiteboardTool>('pen');
  const [color, setColor] = useState<string>('#000000');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [operations, setOperations] = useState<WhiteboardOperation[]>(initialOperations);

  // In-memory ref to hold operations without triggering 60-120 React re-renders per second during dragging
  const operationsRef = useRef<WhiteboardOperation[]>(initialOperations);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Helper to replay a single operation onto canvas
  const drawOperationOnCanvas = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      op: WhiteboardOperation,
      width: number,
      height: number
    ) => {
      if (op.type === 'clear') {
        ctx.clearRect(0, 0, width, height);
        return;
      }

      ctx.save();
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Convert normalized 0..1 coordinates to canvas pixel coordinates
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
    const targetWidth = Math.floor(rect.width) || parent.clientWidth;
    const targetHeight = Math.floor(rect.height) || parent.clientHeight;

    if (targetWidth > 0 && targetHeight > 0) {
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        redrawAll(operationsRef.current);
      }
    }
  }, [redrawAll]);

  // Sync initial operations
  useEffect(() => {
    if (initialOperations && initialOperations.length > 0) {
      operationsRef.current = initialOperations;
      setOperations(initialOperations);
      redrawAll(initialOperations);
    }
  }, [initialOperations, redrawAll]);

  // Setup canvas resize listener with ResizeObserver and staggered timers for immediate layout paint
  useEffect(() => {
    resizeCanvas();
    const t1 = setTimeout(resizeCanvas, 50);
    const t2 = setTimeout(resizeCanvas, 150);
    const t3 = setTimeout(resizeCanvas, 350);
    const t4 = setTimeout(resizeCanvas, 750);
    window.addEventListener('resize', resizeCanvas);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && canvasRef.current?.parentElement) {
      observer = new ResizeObserver(() => {
        resizeCanvas();
      });
      observer.observe(canvasRef.current.parentElement);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
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

      // Filter out our own stroke echo from server to eliminate delay and duplicate drawing
      const payloadUserId = payload?.userId || data?.userId;
      if (userId && payloadUserId && payloadUserId === userId) {
        return;
      }

      const op: WhiteboardOperation = {
        type: 'draw',
        x1: data.x1,
        y1: data.y1,
        x2: data.x2,
        y2: data.y2,
        color: data.color || '#000000',
        width: data.width || 3,
      };

      operationsRef.current.push(op);
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

      // Filter out our own erase echo
      const payloadUserId = payload?.userId || data?.userId;
      if (userId && payloadUserId && payloadUserId === userId) {
        return;
      }

      const op: WhiteboardOperation = {
        type: 'erase',
        x1: data.x1,
        y1: data.y1,
        x2: data.x2,
        y2: data.y2,
        width: data.width || 10,
      };

      operationsRef.current.push(op);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawOperationOnCanvas(ctx, op, canvas.width, canvas.height);
        }
      }
    };

    const handleRemoteClear = () => {
      operationsRef.current = [];
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
      operationsRef.current = ops;
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
  }, [socket, classroomCode, userId, drawOperationOnCanvas, redrawAll]);

  // Pointer event handlers with instantaneous zero-latency local drawing
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
      isDrawingRef.current = true;

      let rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height || canvas.width === 0 || canvas.height === 0) {
        resizeCanvas();
        rect = canvas.getBoundingClientRect();
      }

      const rw = rect.width || canvas.width || 800;
      const rh = rect.height || canvas.height || 600;
      const currentX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rw));
      const currentY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rh));

      lastPointRef.current = { x: currentX, y: currentY };

      // Draw instantaneous start dot so single clicks / taps register immediately
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.beginPath();
        const pxX = currentX * (canvas.width || rw);
        const pxY = currentY * (canvas.height || rh);
        const radius = Math.max(1, (strokeWidth * (tool === 'eraser' ? 3.5 : 1)) / 2);

        if (tool === 'pen') {
          ctx.fillStyle = color;
          ctx.globalCompositeOperation = 'source-over';
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.globalCompositeOperation = 'destination-out';
        }

        ctx.arc(pxX, pxY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    },
    [color, strokeWidth, tool, resizeCanvas]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || !lastPointRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      let rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height || canvas.width === 0 || canvas.height === 0) {
        resizeCanvas();
        rect = canvas.getBoundingClientRect();
      }

      const rw = rect.width || canvas.width || 800;
      const rh = rect.height || canvas.height || 600;
      const currentX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rw));
      const currentY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rh));

      const p1 = lastPointRef.current;
      const p2 = { x: currentX, y: currentY };

      // Ignore zero-distance movement
      const dx = (p2.x - p1.x) * rw;
      const dy = (p2.y - p1.y) * rh;
      if (dx * dx + dy * dy < 0.25) return;

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
        // Store in ref to avoid choking React with 100+ re-renders per second
        operationsRef.current.push(op);

        // Instantaneous local render (0ms lag)
        if (ctx) {
          ctx.save();
          ctx.beginPath();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.moveTo(p1.x * canvasWidth, p1.y * canvasHeight);
          ctx.lineTo(p2.x * canvasWidth, p2.y * canvasHeight);
          ctx.strokeStyle = color;
          ctx.lineWidth = strokeWidth;
          ctx.globalCompositeOperation = 'source-over';
          ctx.stroke();
          ctx.restore();
        }

        if (socket && socket.connected) {
          socket.emit('whiteboard:draw', {
            classroomCode,
            userId,
            ...drawData,
            data: { ...drawData, userId },
          });
        }
      } else if (tool === 'eraser') {
        const eraseWidth = strokeWidth * 3.5;
        const eraseData: EraseData = {
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          width: eraseWidth,
        };

        const op: WhiteboardOperation = { type: 'erase', ...eraseData };
        operationsRef.current.push(op);

        // Instantaneous local erase (0ms lag)
        if (ctx) {
          ctx.save();
          ctx.beginPath();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.moveTo(p1.x * canvasWidth, p1.y * canvasHeight);
          ctx.lineTo(p2.x * canvasWidth, p2.y * canvasHeight);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = eraseWidth;
          ctx.globalCompositeOperation = 'destination-out';
          ctx.stroke();
          ctx.restore();
        }

        if (socket && socket.connected) {
          socket.emit('whiteboard:erase', {
            classroomCode,
            userId,
            ...eraseData,
            data: { ...eraseData, userId },
          });
        }
      }

      lastPointRef.current = p2;
    },
    [tool, color, strokeWidth, socket, classroomCode, userId]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      try {
        if (canvasRef.current?.hasPointerCapture(e.pointerId)) {
          canvasRef.current.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }

      // Synchronize operations array to React state on stroke completion (single clean re-render)
      setOperations([...operationsRef.current]);
    },
    []
  );

  const clearWhiteboard = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    operationsRef.current = [];
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
