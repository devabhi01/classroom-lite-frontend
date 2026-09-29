import React from 'react';
import { Pen, Eraser, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WhiteboardTool } from '@/types/whiteboard';

interface WhiteboardToolbarProps {
  tool: WhiteboardTool;
  onToolChange: (tool: WhiteboardTool) => void;
  color: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  onClear: () => void;
  disabled?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const PRESET_COLORS = [
  '#000000', // Black
  '#2563eb', // Blue
  '#dc2626', // Red
  '#16a34a', // Green
  '#9333ea', // Purple
  '#ea580c', // Orange
];

const STROKE_WIDTHS = [
  { label: 'S', width: 2 },
  { label: 'M', width: 4 },
  { label: 'L', width: 8 },
];

export const WhiteboardToolbar: React.FC<WhiteboardToolbarProps> = ({
  tool,
  onToolChange,
  color,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  onClear,
  disabled = false,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card/90 px-4 py-2 text-xs select-none backdrop-blur-sm">
      {/* Tool Selection: Pen / Eraser */}
      <div className="flex items-center space-x-1">
        <Button
          variant={tool === 'pen' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onToolChange('pen')}
          disabled={disabled}
          className="h-8 px-2.5 text-xs font-medium"
          title="Pen Tool"
        >
          <Pen className="mr-1.5 h-3.5 w-3.5" />
          <span>Pen</span>
        </Button>
        <Button
          variant={tool === 'eraser' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onToolChange('eraser')}
          disabled={disabled}
          className="h-8 px-2.5 text-xs font-medium"
          title="Eraser Tool"
        >
          <Eraser className="mr-1.5 h-3.5 w-3.5" />
          <span>Eraser</span>
        </Button>
      </div>

      {/* Colors & Width Options (visible when Pen is selected) */}
      <div className="flex items-center space-x-3">
        {tool === 'pen' && (
          <div className="flex items-center space-x-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onColorChange(c)}
                disabled={disabled}
                className={`h-5 w-5 rounded-full border transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-primary ring-offset-1 border-transparent' : 'border-border/60 hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
                title={`Color ${c}`}
                aria-label={`Select color ${c}`}
              />
            ))}
            {/* Custom HTML color picker */}
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              disabled={disabled}
              className="h-5 w-5 cursor-pointer rounded-full border-0 p-0 bg-transparent overflow-hidden"
              title="Custom color"
              aria-label="Custom color picker"
            />
          </div>
        )}

        {/* Stroke Width Selector */}
        <div className="flex items-center space-x-1 rounded-md bg-muted p-0.5">
          {STROKE_WIDTHS.map((item) => (
            <button
              key={item.width}
              onClick={() => onStrokeWidthChange(item.width)}
              disabled={disabled}
              className={`h-6 w-6 rounded text-[11px] font-medium transition-colors ${
                strokeWidth === item.width
                  ? 'bg-background text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={`Stroke width ${item.width}px`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons: Fullscreen & Clear */}
      <div className="flex items-center space-x-1.5">
        {onToggleFullscreen && (
          <Button
            variant={isFullscreen ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onToggleFullscreen}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            title={isFullscreen ? 'Exit Full Screen' : 'View Whiteboard in Full Screen'}
            aria-label="Toggle Whiteboard Full Screen"
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5 mr-1 text-primary" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5 mr-1" />
            )}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </Button>
        )}

        {/* Clear Canvas */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={disabled}
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          title="Clear entire whiteboard"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          <span>Clear</span>
        </Button>
      </div>
    </div>
  );
};
