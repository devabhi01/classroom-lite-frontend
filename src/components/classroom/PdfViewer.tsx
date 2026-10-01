import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePdf } from '@/hooks/usePdf';
import { PdfToolbar, AnnotationTool } from './PdfToolbar';
import { PdfThumbnailsSidebar } from './PdfThumbnailsSidebar';
import { PdfContinuousView } from './PdfContinuousView';
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
    pdfDoc,
    hostCurrentPage,
    isFollowingHost,
    syncWithHost,
    shareLocalPdf,
    changePage,
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
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Thumbnails Drawer state
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [activeViewingPage, setActiveViewingPage] = useState<number | null>(null);

  useEffect(() => {
    if (pdfState?.currentPage) {
      setActiveViewingPage(pdfState.currentPage);
    }
  }, [pdfState?.currentPage]);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Annotation states
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>('pen');
  const [annotationColor, setAnnotationColor] = useState<string>('#dc2626');
  const [annotationStrokeWidth, setAnnotationStrokeWidth] = useState<number>(3);

  // Per-page annotation operation store & in-memory ref to eliminate 100+ React re-renders/sec
  const [pageAnnotations, setPageAnnotations] = useState<Record<number, PageAnnotationOp[]>>({});
  const pageAnnotationsRef = useRef<Record<number, PageAnnotationOp[]>>({});

  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const activeDrawPageRef = useRef<number>(1);

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

  // Helper to render a single stroke onto any overlay canvas
  const drawStrokeOnOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, op: PageAnnotationOp, width: number, height: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

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

      const currentList = pageAnnotationsRef.current[opPage] || [];
      const updatedList = [...currentList, op];
      pageAnnotationsRef.current[opPage] = updatedList;
      setPageAnnotations((prev) => ({
        ...prev,
        [opPage]: updatedList,
      }));
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

      const currentList = pageAnnotationsRef.current[opPage] || [];
      const updatedList = [...currentList, op];
      pageAnnotationsRef.current[opPage] = updatedList;
      setPageAnnotations((prev) => ({
        ...prev,
        [opPage]: updatedList,
      }));
    };

    const handleRemoteClearPage = (payload: any) => {
      const pageToClear = payload?.page || currentPageRef.current;
      pageAnnotationsRef.current[pageToClear] = [];
      setPageAnnotations((prev) => ({
        ...prev,
        [pageToClear]: [],
      }));
    };

    socket.on('pdf:annotate', handleRemotePdfDraw);
    socket.on('pdf:erase', handleRemotePdfErase);
    socket.on('pdf:clear-annotations', handleRemoteClearPage);

    return () => {
      socket.off('pdf:annotate', handleRemotePdfDraw);
      socket.off('pdf:erase', handleRemotePdfErase);
      socket.off('pdf:clear-annotations', handleRemoteClearPage);
    };
  }, [socket]);

  // Pointer event handlers with zero-latency local canvas drawing
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>, targetPage?: number) => {
    const canvas = e.currentTarget;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    activeDrawPageRef.current = targetPage || currentPageRef.current;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    lastPointRef.current = { x, y };
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>, targetPage?: number) => {
      if (!isDrawingRef.current || !lastPointRef.current || !pdfState) return;
      const canvas = e.currentTarget;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const currentX = (e.clientX - rect.left) / rect.width;
      const currentY = (e.clientY - rect.top) / rect.height;

      const p1 = lastPointRef.current;
      const p2 = { x: currentX, y: currentY };
      const ctx = canvas.getContext('2d');
      const pageToAnnotate = targetPage || activeDrawPageRef.current || pdfState.currentPage;

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

        // Push to in-memory ref (avoid triggering 100 React re-renders per second while dragging)
        if (!pageAnnotationsRef.current[pageToAnnotate]) {
          pageAnnotationsRef.current[pageToAnnotate] = [];
        }
        pageAnnotationsRef.current[pageToAnnotate].push(op);

        // Instantaneous local render directly to canvas (0ms lag)
        if (ctx) drawStrokeOnOverlay(ctx, op, canvas.width, canvas.height);

        if (socket && socket.connected) {
          socket.emit('pdf:annotate', {
            classroomCode,
            data: { ...op, page: pageToAnnotate },
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

        if (!pageAnnotationsRef.current[pageToAnnotate]) {
          pageAnnotationsRef.current[pageToAnnotate] = [];
        }
        pageAnnotationsRef.current[pageToAnnotate].push(op);

        // Instantaneous local erase (0ms lag)
        if (ctx) drawStrokeOnOverlay(ctx, op, canvas.width, canvas.height);

        if (socket && socket.connected) {
          socket.emit('pdf:erase', {
            classroomCode,
            data: { ...op, page: pageToAnnotate },
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
      if (e.currentTarget?.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }

    // Commit annotations to React state on stroke completion (single clean render)
    setPageAnnotations({ ...pageAnnotationsRef.current });
  }, []);

  const handleClearPageAnnotations = useCallback(() => {
    if (!pdfState) return;
    const currentPage = pdfState.currentPage;

    pageAnnotationsRef.current[currentPage] = [];
    setPageAnnotations((prev) => ({
      ...prev,
      [currentPage]: [],
    }));

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

      {/* PDF & Annotation Controls Toolbar (Always in All Pages mode) */}
      <PdfToolbar
        pdfState={pdfState ? { ...pdfState, currentPage: activeViewingPage || pdfState.currentPage } : null}
        isHost={isHost}
        zoom={zoom}
        onSharePdf={shareLocalPdf}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onClosePdf={closePdf}
        onSelectPage={changePage}
        hostCurrentPage={hostCurrentPage}
        isFollowingHost={isFollowingHost}
        onSyncWithHost={syncWithHost}
        showThumbnails={showThumbnails}
        onToggleThumbnails={() => setShowThumbnails(!showThumbnails)}
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

      {/* Main PDF Content Area with Optional Thumbnails Sidebar */}
      <div className="relative flex-1 w-full h-full flex overflow-hidden">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-background/70 backdrop-blur-xs">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <span className="text-sm font-medium text-foreground">Loading PDF presentation...</span>
          </div>
        )}

        {/* Thumbnails Sidebar */}
        {pdfState && showThumbnails && (
          <PdfThumbnailsSidebar
            pdfDoc={pdfDoc}
            totalPages={pdfState.totalPages}
            currentPage={activeViewingPage || pdfState.currentPage}
            hostCurrentPage={hostCurrentPage}
            isHost={isHost}
            onSelectPage={changePage}
            onClose={() => setShowThumbnails(false)}
          />
        )}

        {/* Workspace Display Area: ALWAYS All Pages in Continuous Scroll Mode */}
        <div className="flex-1 w-full h-full overflow-hidden flex flex-col">
          {!pdfState ? (
            <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto text-center p-8">
              <div className="p-8 rounded-xl border border-dashed border-border bg-card">
                <FileUp className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">No PDF Shared</h3>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  {isHost
                    ? 'Share lecture slides, assignments, or PDF documents directly with all participants in real time. You can draw, highlight, and present all pages!'
                    : 'Waiting for the host to share lecture materials or a PDF presentation...'}
                </p>
                {isHost && (
                  <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                    <FileUp className="mr-1.5 h-4 w-4" />
                    Select Local PDF File
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <PdfContinuousView
              pdfDoc={pdfDoc}
              totalPages={pdfState.totalPages}
              currentPage={pdfState.currentPage}
              hostCurrentPage={hostCurrentPage}
              zoom={zoom}
              isHost={isHost}
              onSelectPage={changePage}
              onPageInView={setActiveViewingPage}
              pageAnnotations={pageAnnotations}
              drawStrokeOnOverlay={drawStrokeOnOverlay}
              isAnnotating={isAnnotating}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          )}
        </div>
      </div>
    </div>
  );
};
