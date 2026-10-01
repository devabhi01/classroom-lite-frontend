import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Eye, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

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

interface PdfContinuousViewProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  totalPages: number;
  currentPage: number;
  hostCurrentPage: number;
  zoom: number;
  isHost: boolean;
  onSelectPage: (page: number) => void;
  onPageInView?: (page: number) => void;
  pageAnnotations: Record<number, PageAnnotationOp[]>;
  drawStrokeOnOverlay: (
    ctx: CanvasRenderingContext2D,
    op: PageAnnotationOp,
    width: number,
    height: number
  ) => void;
  isAnnotating: boolean;
  onPointerDown?: (e: React.PointerEvent<HTMLCanvasElement>, page: number) => void;
  onPointerMove?: (e: React.PointerEvent<HTMLCanvasElement>, page: number) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLCanvasElement>) => void;
}

interface ContinuousPageCardProps {
  pageNumber: number;
  totalPages: number;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  zoom: number;
  isSelected: boolean;
  isHostPage: boolean;
  annotations: PageAnnotationOp[];
  drawStrokeOnOverlay: (
    ctx: CanvasRenderingContext2D,
    op: PageAnnotationOp,
    width: number,
    height: number
  ) => void;
  onSelect: () => void;
  isAnnotating: boolean;
  onPointerDown?: (e: React.PointerEvent<HTMLCanvasElement>, page: number) => void;
  onPointerMove?: (e: React.PointerEvent<HTMLCanvasElement>, page: number) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLCanvasElement>) => void;
}

const ContinuousPageCard: React.FC<ContinuousPageCardProps> = ({
  pageNumber,
  totalPages,
  pdfDoc,
  zoom,
  isSelected,
  isHostPage,
  annotations,
  drawStrokeOnOverlay,
  onSelect,
  isAnnotating,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Lazy render state: Page 1 and current page render immediately; others render when approaching viewport
  const [isNearViewport, setIsNearViewport] = useState<boolean>(
    pageNumber <= 2 || isSelected || isHostPage
  );
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({
    width: Math.round(860 * zoom),
    height: Math.round(600 * zoom),
  });

  // Lazy render detection: Observe distance from viewport (pre-render 800px ahead)
  useEffect(() => {
    if (isNearViewport) return;

    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNearViewport(true);
        }
      },
      { rootMargin: '800px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isNearViewport]);

  // Render PDF Page onto canvas when near viewport or when zoom changes
  useEffect(() => {
    if (!isNearViewport || !pdfDoc) return;
    let isCancelled = false;

    const render = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        // Base scale 1.35 * zoom delivers razor-sharp typography and true scale expansion
        const scale = 1.35 * zoom;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const w = Math.floor(viewport.width);
        const h = Math.floor(viewport.height);

        setPageSize({ width: w, height: h });

        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const renderTask = page.render({ canvasContext: ctx, viewport } as any);
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        // Synchronize overlay canvas dimensions
        const overlay = overlayCanvasRef.current;
        if (overlay) {
          overlay.width = w;
          overlay.height = h;
          const overlayCtx = overlay.getContext('2d');
          if (overlayCtx) {
            overlayCtx.clearRect(0, 0, w, h);
            annotations.forEach((op) => {
              drawStrokeOnOverlay(overlayCtx, op, w, h);
            });
          }
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          // Non-critical cancel error
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [isNearViewport, pdfDoc, pageNumber, zoom, annotations, drawStrokeOnOverlay]);

  // Redraw annotations on overlay whenever annotations change
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlay.width, overlay.height);
    annotations.forEach((op) => {
      drawStrokeOnOverlay(ctx, op, overlay.width, overlay.height);
    });
  }, [annotations, drawStrokeOnOverlay]);

  return (
    <div
      ref={cardRef}
      onClick={onSelect}
      className={`flex flex-col items-center mb-8 scroll-mt-4 transition-all duration-150 ${
        isSelected ? 'ring-2 ring-primary/40 rounded-xl p-2 bg-primary/5' : 'p-2'
      }`}
      style={{ width: 'fit-content' }}
    >
      {/* Page Header Bar */}
      <div
        className="flex items-center justify-between pb-1.5 px-2 text-xs"
        style={{ width: `${pageSize.width}px`, minWidth: '320px', maxWidth: '100vw' }}
      >
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-foreground">
            Page {pageNumber} of {totalPages}
          </span>
          {isSelected && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Active Focus
            </Badge>
          )}
        </div>

        {isHostPage && (
          <Badge
            variant="default"
            className="text-[10px] px-2 py-0.5 bg-emerald-600 hover:bg-emerald-600 flex items-center gap-1 font-medium"
          >
            <Eye className="h-3 w-3" />
            <span>Host Presenting</span>
          </Badge>
        )}
      </div>

      {/* Slide Container (Dynamically sized to true zoomed pixels) */}
      <div
        className="relative shadow-lg rounded-lg overflow-hidden border border-border/80 bg-white select-none inline-block"
        style={{ width: `${pageSize.width}px`, height: `${pageSize.height}px` }}
      >
        {isNearViewport && pdfDoc ? (
          <canvas
            ref={canvasRef}
            className="block select-none"
            style={{ width: `${pageSize.width}px`, height: `${pageSize.height}px` }}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center p-8 bg-card text-center border border-dashed border-border"
            style={{ width: `${pageSize.width}px`, height: `${pageSize.height}px` }}
          >
            <BookOpen className="h-8 w-8 text-primary/40 mb-2" />
            <h4 className="text-sm font-semibold text-foreground">
              Slide {pageNumber} of {totalPages}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Scroll into view to display presentation
            </p>
          </div>
        )}

        {/* Overlay Canvas for Annotations */}
        <canvas
          ref={overlayCanvasRef}
          className={`absolute inset-0 touch-none select-none z-20 ${
            isAnnotating ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
          }`}
          style={{ width: `${pageSize.width}px`, height: `${pageSize.height}px` }}
          onPointerDown={isAnnotating && onPointerDown ? (e) => onPointerDown(e, pageNumber) : undefined}
          onPointerMove={isAnnotating && onPointerMove ? (e) => onPointerMove(e, pageNumber) : undefined}
          onPointerUp={isAnnotating && onPointerUp ? onPointerUp : undefined}
          onPointerCancel={isAnnotating && onPointerUp ? onPointerUp : undefined}
        />
      </div>
    </div>
  );
};

export const PdfContinuousView: React.FC<PdfContinuousViewProps> = ({
  pdfDoc,
  totalPages,
  currentPage,
  hostCurrentPage,
  zoom,
  isHost,
  onSelectPage,
  onPageInView,
  pageAnnotations,
  drawStrokeOnOverlay,
  isAnnotating,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const isAutoScrollingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Smooth slide-to-page navigation
  const scrollToPage = useCallback((pageNum: number) => {
    const container = containerRef.current;
    const targetEl = pageRefs.current[pageNum];
    if (!container || !targetEl) return;

    isAutoScrollingRef.current = true;
    const containerRect = container.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const targetTop = container.scrollTop + (targetRect.top - containerRect.top) - 16;

    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });

    const timer = setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // When currentPage changes externally (Prev/Next buttons, thumbnail click, or host broadcast), slide into view
  useEffect(() => {
    scrollToPage(currentPage);
  }, [currentPage, scrollToPage]);

  // Passive scroll listener to update current viewing page indicator without triggering socket emits or desyncing
  const handleScroll = useCallback(() => {
    if (isAutoScrollingRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    const containerTop = container.getBoundingClientRect().top;
    let closestPage = -1;
    let minDistance = Infinity;

    for (let p = 1; p <= totalPages; p++) {
      const el = pageRefs.current[p];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const dist = Math.abs(rect.top - containerTop - 30);
      if (dist < minDistance) {
        minDistance = dist;
        closestPage = p;
      }
    }

    if (closestPage > 0 && onPageInView) {
      onPageInView(closestPage);
    }
  }, [totalPages, onPageInView]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="w-full h-full overflow-auto p-4 flex flex-col items-center scrollbar-thin select-none"
    >
      {/* Inner wrapper expands to fit zoomed width, enabling natural horizontal and vertical scrolling */}
      <div
        className="flex flex-col items-center py-2"
        style={{ minWidth: '100%', width: 'max-content' }}
      >
        {pages.map((pageNo) => (
          <div
            key={pageNo}
            ref={(el) => {
              pageRefs.current[pageNo] = el;
            }}
            data-page={pageNo}
          >
            <ContinuousPageCard
              pageNumber={pageNo}
              totalPages={totalPages}
              pdfDoc={pdfDoc}
              zoom={zoom}
              isSelected={currentPage === pageNo}
              isHostPage={hostCurrentPage === pageNo}
              annotations={pageAnnotations[pageNo] || []}
              drawStrokeOnOverlay={drawStrokeOnOverlay}
              onSelect={() => onSelectPage(pageNo)}
              isAnnotating={isAnnotating}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
