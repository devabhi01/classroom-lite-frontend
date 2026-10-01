import React, { useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Eye, X, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface PdfThumbnailsSidebarProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  totalPages: number;
  currentPage: number;
  hostCurrentPage: number;
  isHost: boolean;
  onSelectPage: (page: number) => void;
  onClose: () => void;
}

interface ThumbnailCardProps {
  pageNumber: number;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  isSelected: boolean;
  isHostPage: boolean;
  onSelect: () => void;
}

const ThumbnailCard: React.FC<ThumbnailCardProps> = ({
  pageNumber,
  pdfDoc,
  isSelected,
  isHostPage,
  onSelect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let isCancelled = false;

    const renderThumb = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        // Render at a low scale for high performance thumbnail
        const viewport = page.getViewport({ scale: 0.22 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderTask = page.render({ canvasContext: ctx, viewport } as any);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          // Ignore
        }
      }
    };

    renderThumb();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, pageNumber]);

  return (
    <div
      onClick={onSelect}
      className={`group relative flex flex-col items-center p-2 rounded-lg cursor-pointer transition-all border text-left ${
        isSelected
          ? 'border-primary bg-primary/10 shadow-xs ring-2 ring-primary/40'
          : 'border-border/70 bg-card hover:border-primary/40 hover:bg-muted/40'
      }`}
    >
      {/* Top Indicators */}
      <div className="w-full flex items-center justify-between mb-1.5 px-0.5">
        <span
          className={`text-[11px] font-mono font-semibold ${
            isSelected ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          Page {pageNumber}
        </span>

        {isHostPage && (
          <Badge
            variant="default"
            className="text-[9px] px-1 py-0 h-4 bg-emerald-600 hover:bg-emerald-600 flex items-center gap-0.5 font-normal"
            title="Host is presenting this slide"
          >
            <Eye className="h-2.5 w-2.5" />
            <span>Host</span>
          </Badge>
        )}
      </div>

      {/* Slide Preview Canvas or Placeholder */}
      <div className="w-full aspect-[4/3] rounded overflow-hidden bg-white border border-border/60 flex items-center justify-center relative shadow-2xs">
        {pdfDoc ? (
          <canvas ref={canvasRef} className="max-w-full max-h-full block object-contain" />
        ) : (
          <div className="flex flex-col items-center justify-center p-2 text-center text-muted-foreground">
            <BookOpen className="h-4 w-4 mb-1 text-primary/60" />
            <span className="text-[10px] font-mono">Slide {pageNumber}</span>
          </div>
        )}

        {/* Hover Highlight Overlay */}
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>
    </div>
  );
};

export const PdfThumbnailsSidebar: React.FC<PdfThumbnailsSidebarProps> = ({
  pdfDoc,
  totalPages,
  currentPage,
  hostCurrentPage,
  isHost,
  onSelectPage,
  onClose,
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <aside className="w-56 shrink-0 h-full border-r border-border bg-card/95 backdrop-blur-xs flex flex-col select-none z-20">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            All Pages ({totalPages})
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          title="Close thumbnails"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Pages Scroll List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
        {pages.map((pageNo) => (
          <ThumbnailCard
            key={pageNo}
            pageNumber={pageNo}
            pdfDoc={pdfDoc}
            isSelected={currentPage === pageNo}
            isHostPage={hostCurrentPage === pageNo}
            onSelect={() => onSelectPage(pageNo)}
          />
        ))}
      </div>
    </aside>
  );
};
