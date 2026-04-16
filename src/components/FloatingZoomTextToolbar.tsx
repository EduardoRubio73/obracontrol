import { useState, useCallback } from "react";
import { Minus, Plus, RotateCcw, Type } from "lucide-react";

interface FloatingZoomTextToolbarProps {
  onZoomChange?: (zoom: number) => void;
  onTextToolActivate?: () => void;
}

export function FloatingZoomTextToolbar({ onZoomChange, onTextToolActivate }: FloatingZoomTextToolbarProps) {
  const [zoom, setZoom] = useState(100);

  const updateZoom = useCallback((newZoom: number) => {
    const clamped = Math.min(200, Math.max(25, newZoom));
    setZoom(clamped);
    onZoomChange?.(clamped);
  }, [onZoomChange]);

  return (
    <div className="flex flex-col items-end gap-1.5">
      {/* Zoom controls bar */}
      <div className="flex items-center gap-0.5 rounded-lg border bg-card p-0.5 shadow-lg">
        <button
          onClick={() => updateZoom(zoom - 10)}
          className="inline-flex items-center justify-center rounded-md h-7 w-7 hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => updateZoom(100)}
          className="flex items-center gap-0.5 px-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {zoom}%
          <RotateCcw className="h-3 w-3" />
        </button>
        <button
          onClick={() => updateZoom(zoom + 10)}
          className="inline-flex items-center justify-center rounded-md h-7 w-7 hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Floating text tool button */}
      <button
        onClick={onTextToolActivate}
        draggable
        className="inline-flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 h-9 w-9 rounded-full shadow-lg cursor-grab active:cursor-grabbing transition-colors"
      >
        <Type className="h-4 w-4" />
      </button>
    </div>
  );
}
