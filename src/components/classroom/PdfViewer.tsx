import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { FileUp, FileText, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePdf } from '@/hooks/usePdf';
import { PdfToolbar, AnnotationTool } from './PdfToolbar';
import { PdfState } from '@/types/pdf';
import { DrawData, EraseData } from '@/types/whiteboard';

interface PdfViewerProps {
  socket: Socket | null;
  classroomCode: string;
  isHost: boolean;
  initialPdf?: PdfState | null;
}

interface PageAnnotationOp {
  type: 'draw' | 'erase';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  width: number;
  isHighlighter?: boolean;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  socket,
  classroomCode,
  isHost,
  initialPdf,
}) => {
  const {
    pdfState,
    loading,
    zoom,
    canvasRef,
    pdfDoc,
    shareLocalPdf,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    resetZoom,
    closePdf,
  } = usePdf({
    socket,
    classroomCode,
    isHost,
    initialPdf,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Annotation states
  const [isAnnotating, setIsAnnotating] = useState<boolean>(true);
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>('pen');
  const [annotationColor, setAnnotationColor] = useState<string>('#dc2626');
  const [annotationStrokeWidth, setAnnotationStrokeWidth] = useState<number>(3);

  // Per-page annotation operation store
  const [pageAnnotations, setPageAnnotations] = useState<Record<number, PageAnnotationOp[]>>({});

  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

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

  // Helper to render a single stroke onto the overlay canvas
  const drawStrokeOnOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, op: PageAnnotationOp, width: number, height: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Normalized coordinates to canvas pixels
      const isNorm = op.x1 <= 1.05 && op.x2 <= 1.05 && op.y1 <= 1.05 && op.y2 <= 1.05;
      const x1 = isNorm ? op.x1 * width : op.x1;
      const y1 = isNorm ? op.y1 * height : op.y1;
      const x2 = isNorm ? op.x2 * width : op.x2;
      const y2 = isNorm ? op.y2 * height : op.y2;

      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      if (op.type === 'erase') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = op.width;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        if (op.isHighlighter) {
          ctx.strokeStyle = op.color || '#facc15';
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = op.width * 3.5;
        } else {
          ctx.strokeStyle = op.color || '#dc2626';
          ctx.globalAlpha = 1.0;
          ctx.lineWidth = op.width;
        }
      }

      ctx.stroke();
      ctx.restore();
    },
    []
  );

  // Replay annotations for a given page
  const redrawPageAnnotations = useCallback(
    (page: number) => {
      const overlay = overlayCanvasRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, overlay.width, overlay.height);

      const ops = pageAnnotations[page] || [];
      ops.forEach((op) => {
        drawStrokeOnOverlay(ctx, op, overlay.width, overlay.height);
      });
    },
    [pageAnnotations, drawStrokeOnOverlay]
  );

  // Sync overlay canvas dimensions with PDF canvas
  const syncOverlayDimensions = useCallback(() => {
    const pdfCanvas = canvasRef.current;
    const overlay = overlayCanvasRef.current;
    if (!pdfCanvas || !overlay) return;

    if (overlay.width !== pdfCanvas.width || overlay.height !== pdfCanvas.height) {
      overlay.width = pdfCanvas.width;
      overlay.height = pdfCanvas.height;
      if (pdfState?.currentPage) {
        redrawPageAnnotations(pdfState.currentPage);
      }
    }
  }, [canvasRef, pdfState?.currentPage, redrawPageAnnotations]);

  // Generate crisp slide canvas placeholder if no local PDF binary is loaded
  const renderSlidePlaceholder = useCallback(
    (page: number, title: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 1000;
      canvas.height = 625;

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Top colored bar
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(0, 0, canvas.width, 8);

      // Slide Title
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 26px Inter, system-ui, sans-serif';
      ctx.fillText(title || 'Classroom Presentation', 50, 60);

      // Subtitle
      ctx.fillStyle = '#64748b';
      ctx.font = '500 15px Inter, system-ui, sans-serif';
      ctx.fillText(`Slide ${page} of ${pdfState?.totalPages || 10} • Synchronized Presentation`, 50, 92);

      // Line
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(50, 115);
      ctx.lineTo(canvas.width - 50, 115);
      ctx.stroke();

      // Topics
      const topics = [
        'Architecture Overview & Distributed Core',
        'Data Synchronization & Peer Signaling',
        'Interactive Canvas & Vector Streaming',
        'Real-Time WebRTC Media Channels',
        'Session Recovery & State Persistence',
      ];
      const currentTopic = topics[(page - 1) % topics.length];

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 22px Inter, system-ui, sans-serif';
      ctx.fillText(`Topic ${page}: ${currentTopic}`, 50, 165);

      ctx.fillStyle = '#334155';
      ctx.font = '16px Inter, system-ui, sans-serif';
      ctx.fillText('• Live slide content synchronized directly with host navigation', 70, 210);
      ctx.fillText('• Collaborative whiteboard annotations active on top of this slide', 70, 250);
      ctx.fillText('• Full Screen mode available for students and teachers', 70, 290);
      ctx.fillText('• Page turns and slide updates reflect across all connected peers', 70, 330);

      // Workspace illustration container
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(50, 370, canvas.width - 100, 160, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.font = '600 14px Inter, system-ui, sans-serif';
      ctx.fillText('COLLABORATIVE SLIDE ANNOTATION ZONE', 70, 410);

      ctx.fillStyle = '#64748b';
      ctx.font = '14px Inter, system-ui, sans-serif';
      ctx.fillText('Draw, highlight text, or take notes directly over this slide in real time.', 70, 445);
      ctx.fillText('Both students and teachers can see synchronized drawings and view in Full Screen.', 70, 475);

      // Footer
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px Inter, system-ui, sans-serif';
      ctx.fillText(`TDP Classroom Lite • Slide ${page}`, 50, 585);
      ctx.fillText('Full Screen Presentation Mode Active', canvas.width - 290, 585);
    },
    [canvasRef, pdfState?.totalPages]
  );

  // Synchronize overlay whenever PDF is loaded, page changes, or zoom changes
  useEffect(() => {
    if (pdfState && !pdfDoc) {
      renderSlidePlaceholder(pdfState.currentPage, pdfState.fileName);
    }
    const timer = setTimeout(() => {
      syncOverlayDimensions();
    }, 80);
    return () => clearTimeout(timer);
  }, [pdfDoc, pdfState, zoom, syncOverlayDimensions, renderSlidePlaceholder]);

  // Redraw when page changes
  useEffect(() => {
    if (pdfState?.currentPage) {
      redrawPageAnnotations(pdfState.currentPage);
    }
  }, [pdfState?.currentPage, redrawPageAnnotations]);

  const currentPageRef = useRef<number>(pdfState?.currentPage || 1);
  useEffect(() => {
    currentPageRef.current = pdfState?.currentPage || 1;
  }, [pdfState?.currentPage]);

  // Real-time socket listeners for slide annotations
  useEffect(() => {
    if (!socket) return;

    const handleRemotePdfDraw = (payload: any) => {
      const data: DrawData & { page?: number; isHighlighter?: boolean } = payload.data || payload;
      const opPage = data.page || currentPageRef.current;

      const op: PageAnnotationOp = {
        type: 'draw',
        x1: data.x1,
        y1: data.y1,
        x2: data.x2,
        y2: data.y2,
        color: data.color,
        width: data.width,
        isHighlighter: data.isHighlighter,
      };

      setPageAnnotations((prev) => ({
        ...prev,
        [opPage]: [...(prev[opPage] || []), op],
      }));

      if (currentPageRef.current === opPage && overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext('2d');
        if (ctx) {
          drawStrokeOnOverlay(ctx, op, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
        }
      }
    };

    const handleRemotePdfErase = (payload: any) => {
      const data: EraseData & { page?: number } = payload.data || payload;
      const opPage = data.page || currentPageRef.current;

      const op: PageAnnotationOp = {
        type: 'erase',
        x1: data.x1,
        y1: data.y1,
        x2: data.x2,
        y2: data.y2,
        width: data.width,
      };

      setPageAnnotations((prev) => ({
        ...prev,
        [opPage]: [...(prev[opPage] || []), op],
      }));

      if (currentPageRef.current === opPage && overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext('2d');
        if (ctx) {
          drawStrokeOnOverlay(ctx, op, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
        }
      }
    };

    const handleRemoteClearPage = (payload: any) => {
      const pageToClear = payload?.page || currentPageRef.current;
      setPageAnnotations((prev) => ({
        ...prev,
        [pageToClear]: [],
      }));

      if (currentPageRef.current === pageToClear && overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
        }
      }
    };

    socket.on('pdf:annotate', handleRemotePdfDraw);
    socket.on('pdf:erase', handleRemotePdfErase);
    socket.on('pdf:clear-annotations', handleRemoteClearPage);

    return () => {
      socket.off('pdf:annotate', handleRemotePdfDraw);
      socket.off('pdf:erase', handleRemotePdfErase);
      socket.off('pdf:clear-annotations', handleRemoteClearPage);
    };
  }, [socket, drawStrokeOnOverlay]);

  // Pointer event handlers for drawing on top of PDF
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
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
      if (!isDrawingRef.current || !lastPointRef.current || !pdfState) return;
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const currentX = (e.clientX - rect.left) / rect.width;
      const currentY = (e.clientY - rect.top) / rect.height;

      const p1 = lastPointRef.current;
      const p2 = { x: currentX, y: currentY };
      const ctx = canvas.getContext('2d');
      const currentPage = pdfState.currentPage;

      if (annotationTool === 'pen' || annotationTool === 'highlighter') {
        const isHighlighter = annotationTool === 'highlighter';
        const color = isHighlighter ? '#facc15' : annotationColor;
        const width = isHighlighter ? annotationStrokeWidth * 3.5 : annotationStrokeWidth;

        const op: PageAnnotationOp = {
          type: 'draw',
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          color,
          width,
          isHighlighter,
        };

        setPageAnnotations((prev) => ({
          ...prev,
          [currentPage]: [...(prev[currentPage] || []), op],
        }));

        if (ctx) drawStrokeOnOverlay(ctx, op, canvas.width, canvas.height);

        if (socket && socket.connected) {
          socket.emit('pdf:annotate', {
            classroomCode,
            data: { ...op, page: currentPage },
          });
        }
      } else if (annotationTool === 'eraser') {
        const op: PageAnnotationOp = {
          type: 'erase',
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          width: annotationStrokeWidth * 4,
        };

        setPageAnnotations((prev) => ({
          ...prev,
          [currentPage]: [...(prev[currentPage] || []), op],
        }));

        if (ctx) drawStrokeOnOverlay(ctx, op, canvas.width, canvas.height);

        if (socket && socket.connected) {
          socket.emit('pdf:erase', {
            classroomCode,
            data: { ...op, page: currentPage },
          });
        }
      }

      lastPointRef.current = p2;
    },
    [pdfState, annotationTool, annotationColor, annotationStrokeWidth, drawStrokeOnOverlay, socket, classroomCode]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
    try {
      if (overlayCanvasRef.current?.hasPointerCapture(e.pointerId)) {
        overlayCanvasRef.current.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleClearPageAnnotations = useCallback(() => {
    if (!pdfState) return;
    const currentPage = pdfState.currentPage;

    setPageAnnotations((prev) => ({
      ...prev,
      [currentPage]: [],
    }));

    if (overlayCanvasRef.current) {
      const ctx = overlayCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
      }
    }

    if (socket && socket.connected) {
      socket.emit('pdf:clear-annotations', {
        classroomCode,
        page: currentPage,
      });
    }
  }, [pdfState, socket, classroomCode]);

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full flex-col overflow-hidden select-none transition-colors ${
        isFullscreen ? 'bg-zinc-950 text-white' : 'bg-muted/30 text-foreground'
      }`}
    >
      {/* Hidden file input for host */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) shareLocalPdf(file);
        }}
      />

      {/* PDF & Annotation Controls Toolbar */}
      <PdfToolbar
        pdfState={pdfState}
        isHost={isHost}
        zoom={zoom}
        onSharePdf={shareLocalPdf}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onClosePdf={closePdf}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        isAnnotating={isAnnotating}
        onToggleAnnotate={() => setIsAnnotating(!isAnnotating)}
        annotationTool={annotationTool}
        onAnnotationToolChange={setAnnotationTool}
        annotationColor={annotationColor}
        onAnnotationColorChange={setAnnotationColor}
        annotationStrokeWidth={annotationStrokeWidth}
        onAnnotationStrokeWidthChange={setAnnotationStrokeWidth}
        onClearAnnotations={handleClearPageAnnotations}
      />

      {/* Main PDF Canvas Workspace with Whiteboard Overlay */}
      <div className="relative flex-1 w-full h-full overflow-auto p-4 flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/70 backdrop-blur-xs">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <span className="text-sm font-medium text-foreground">Rendering PDF page...</span>
          </div>
        )}

        {!pdfState ? (
          <div className="flex flex-col items-center justify-center max-w-md text-center p-8 rounded-xl border border-dashed border-border bg-card">
            <FileUp className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">No PDF Shared</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {isHost
                ? 'Share lecture slides, notes, or assignments directly with all participants in real time. You can draw and annotate directly on top of slides!'
                : 'Waiting for the host to share lecture materials or a PDF presentation...'}
            </p>
            {isHost && (
              <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                <FileUp className="mr-1.5 h-4 w-4" />
                Select Local PDF File
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center max-w-full">
            {/* The PDF Slide Container with Whiteboard Overlay */}
            <div
              className={`relative group shadow-xl rounded-lg overflow-hidden border border-border/80 bg-white select-none inline-block max-w-full transition-all duration-200 ${
                isFullscreen ? 'ring-2 ring-primary/40' : ''
              }`}
            >
              {/* Underlying Rendered PDF Document Canvas (Live PDF or Synchronized Slide Presentation) */}
              <canvas ref={canvasRef} className="block max-w-full h-auto select-none" />

              {/* Collaborative Whiteboard Canvas Overlay on top of PDF */}
              <canvas
                ref={overlayCanvasRef}
                className={`absolute inset-0 h-full w-full touch-none select-none z-20 ${
                  isAnnotating ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
                }`}
                onPointerDown={isAnnotating ? handlePointerDown : undefined}
                onPointerMove={isAnnotating ? handlePointerMove : undefined}
                onPointerUp={isAnnotating ? handlePointerUp : undefined}
                onPointerCancel={isAnnotating ? handlePointerUp : undefined}
              />

              {/* Quick Fullscreen Overlay Button on slide hover (accessible to student & host) */}
              <div className="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-950/85 hover:bg-zinc-900 text-white text-xs font-medium shadow-md backdrop-blur-xs transition-colors border border-white/10"
                  title={isFullscreen ? 'Exit Full Screen' : 'View Slide in Full Screen'}
                  aria-label="Toggle Full Screen"
                >
                  {isFullscreen ? (
                    <>
                      <Minimize2 className="h-3.5 w-3.5 text-primary" />
                      <span>Exit Full Screen</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3.5 w-3.5 text-primary" />
                      <span>Full Screen</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Synchronized slide presentation status pill for peers */}
            {!pdfDoc && !loading && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-card/90 border border-border text-xs text-muted-foreground shadow-xs">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium text-foreground">
                  Synchronized Presentation: {pdfState.fileName}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  (Slide {pdfState.currentPage} / {pdfState.totalPages})
                </span>
                {!isHost && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="ml-2 text-primary hover:underline font-medium text-[11px]"
                    title="If you have this PDF file on your computer, select it to view raw pages locally"
                  >
                    Open local file
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
