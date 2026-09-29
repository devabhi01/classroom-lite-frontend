import React, { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload,
  X,
  FileText,
  PenTool,
  Highlighter,
  Eraser,
  Trash2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PdfState } from '@/types/pdf';

export type AnnotationTool = 'pen' | 'highlighter' | 'eraser';

interface PdfToolbarProps {
  pdfState: PdfState | null;
  isHost: boolean;
  zoom: number;
  onSharePdf: (file: File) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onClosePdf: () => void;
  // Fullscreen presentation props
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  // Whiteboard / Annotation on top of PDF props
  isAnnotating?: boolean;
  onToggleAnnotate?: () => void;
  annotationTool?: AnnotationTool;
  onAnnotationToolChange?: (tool: AnnotationTool) => void;
  annotationColor?: string;
  onAnnotationColorChange?: (color: string) => void;
  annotationStrokeWidth?: number;
  onAnnotationStrokeWidthChange?: (width: number) => void;
  onClearAnnotations?: () => void;
}

const PRESET_PEN_COLORS = ['#dc2626', '#2563eb', '#16a34a', '#000000', '#facc15'];

export const PdfToolbar: React.FC<PdfToolbarProps> = ({
  pdfState,
  isHost,
  zoom,
  onSharePdf,
  onPrevPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onClosePdf,
  isFullscreen = false,
  onToggleFullscreen,
  isAnnotating = false,
  onToggleAnnotate,
  annotationTool = 'pen',
  onAnnotationToolChange,
  annotationColor = '#dc2626',
  onAnnotationColorChange,
  annotationStrokeWidth = 3,
  onAnnotationStrokeWidthChange,
  onClearAnnotations,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      onSharePdf(file);
    }
  };

  return (
    <div className="flex flex-col border-b border-border bg-card/95 select-none backdrop-blur-sm">
      {/* Primary Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Left: Document Info or Share Button */}
        <div className="flex items-center space-x-2 min-w-0">
          {isHost && !pdfState && (
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 px-3 text-xs font-medium"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              <span>Select & Share PDF</span>
            </Button>
          )}

          {pdfState && (
            <div className="flex items-center space-x-2 min-w-0">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium text-foreground truncate max-w-[130px] sm:max-w-[200px]">
                {pdfState.fileName}
              </span>
              {!isHost && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Host View
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Center: Page Controls */}
        {pdfState && (
          <div className="flex items-center space-x-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={onPrevPage}
              disabled={!isHost || pdfState.currentPage <= 1}
              className="h-7 w-7"
              title="Previous page"
              aria-label="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center px-2 py-0.5 rounded bg-muted text-xs font-mono font-medium">
              <span>{pdfState.currentPage}</span>
              <span className="mx-1 text-muted-foreground">/</span>
              <span>{pdfState.totalPages}</span>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={onNextPage}
              disabled={!isHost || pdfState.currentPage >= pdfState.totalPages}
              className="h-7 w-7"
              title="Next page"
              aria-label="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Right: Whiteboard Overlay Toggle & Zoom Controls */}
        {pdfState && (
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Draw / Annotate on PDF Toggle */}
            {onToggleAnnotate && (
              <Button
                variant={isAnnotating ? 'default' : 'outline'}
                size="sm"
                onClick={onToggleAnnotate}
                className="h-7 px-2.5 text-xs font-medium"
                title="Toggle drawing and annotations on top of PDF"
              >
                <PenTool className="h-3.5 w-3.5 mr-1" />
                <span>{isAnnotating ? 'Draw Mode ON' : 'Draw on PDF'}</span>
              </Button>
            )}

            {/* Zoom controls */}
            <div className="flex items-center space-x-1 rounded-md bg-muted p-0.5">
              <button
                onClick={onZoomOut}
                className="h-6 w-6 rounded hover:bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground"
                title="Zoom out"
                aria-label="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="px-1 text-[11px] font-mono font-medium">{Math.round(zoom * 100)}%</span>
              <button
                onClick={onZoomIn}
                className="h-6 w-6 rounded hover:bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground"
                title="Zoom in"
                aria-label="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onResetZoom}
                className="h-6 w-6 rounded hover:bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground"
                title="Reset zoom"
                aria-label="Reset Zoom"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>

            {/* Fullscreen Mode Toggle */}
            {onToggleFullscreen && (
              <Button
                variant={isFullscreen ? 'secondary' : 'ghost'}
                size="sm"
                onClick={onToggleFullscreen}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Presentation'}
                aria-label="Toggle Fullscreen Presentation"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5 mr-1 text-primary" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5 mr-1" />
                )}
                <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
              </Button>
            )}

            {/* Host: Close PDF */}
            {isHost && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClosePdf}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                title="Close PDF presentation"
                aria-label="Close PDF"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                <span>Close</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Secondary Sub-toolbar: Active when Draw on PDF is ON */}
      {pdfState && isAnnotating && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 bg-primary/5 border-t border-primary/10 text-xs">
          <div className="flex items-center space-x-1">
            <span className="text-[11px] font-medium text-muted-foreground mr-1">Tools:</span>
            <Button
              variant={annotationTool === 'pen' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onAnnotationToolChange?.('pen')}
              className="h-6 px-2 text-[11px]"
            >
              <PenTool className="h-3 w-3 mr-1" />
              Pen
            </Button>

            <Button
              variant={annotationTool === 'highlighter' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onAnnotationToolChange?.('highlighter')}
              className="h-6 px-2 text-[11px]"
            >
              <Highlighter className="h-3 w-3 mr-1" />
              Highlighter
            </Button>

            <Button
              variant={annotationTool === 'eraser' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onAnnotationToolChange?.('eraser')}
              className="h-6 px-2 text-[11px]"
            >
              <Eraser className="h-3 w-3 mr-1" />
              Eraser
            </Button>
          </div>

          {/* Palette & Stroke Width */}
          <div className="flex items-center space-x-3">
            {annotationTool !== 'eraser' && (
              <div className="flex items-center space-x-1.5">
                {PRESET_PEN_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => onAnnotationColorChange?.(c)}
                    className={`h-4 w-4 rounded-full border transition-transform ${
                      annotationColor === c
                        ? 'scale-125 ring-2 ring-primary ring-offset-1 border-transparent'
                        : 'border-border/60 hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                    title={`Color ${c}`}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            )}

            {/* Stroke Width Selector */}
            <div className="flex items-center space-x-1 rounded bg-muted p-0.5">
              {[
                { label: 'S', width: 2 },
                { label: 'M', width: 4 },
                { label: 'L', width: 8 },
              ].map((sw) => (
                <button
                  key={sw.width}
                  onClick={() => onAnnotationStrokeWidthChange?.(sw.width)}
                  className={`h-5 w-5 rounded text-[10px] font-medium transition-colors ${
                    annotationStrokeWidth === sw.width
                      ? 'bg-background text-foreground shadow-xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={`Stroke width ${sw.width}px`}
                >
                  {sw.label}
                </button>
              ))}
            </div>

            {/* Clear Page Annotations */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAnnotations}
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive"
              title="Clear annotations on this page"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear Annotations
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
