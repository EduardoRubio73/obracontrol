import { useState, useCallback, useEffect } from "react";
import { Minus, Plus, RotateCcw, Type, ChevronDown, ChevronUp } from "lucide-react";

interface FloatingZoomTextToolbarProps {
  onZoomChange?: (zoom: number) => void;
  onTextToolActivate?: () => void;
}

export function FloatingZoomTextToolbar({ onZoomChange, onTextToolActivate }: FloatingZoomTextToolbarProps) {
  const [zoom, setZoom] = useState(100);
  const [collapsed, setCollapsed] = useState(true);

  const updateZoom = useCallback((newZoom: number) => {
    const clamped = Math.min(200, Math.max(50, newZoom));
    setZoom(clamped);
    onZoomChange?.(clamped);

    // Apply zoom to the main scrollable content
    const main = document.querySelector("main") || document.querySelector("[class*='max-w-']");
    if (main) {
      (main as HTMLElement).style.transformOrigin = "top center";
      (main as HTMLElement).style.transform = `scale(${clamped / 100})`;
    }
  }, [onZoomChange]);

  // Reset on unmount
  useEffect(() => {
    return () => {
      const main = document.querySelector("main") || document.querySelector("[class*='max-w-']");
      if (main) {
        (main as HTMLElement).style.transform = "";
      }
    };
  }, []);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="inline-flex items-center justify-center bg-card border rounded-full h-10 w-10 shadow-lg hover:bg-accent transition-colors"
        title="Zoom"
      >
        <Type className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-xl border bg-card p-1 shadow-lg animate-in fade-in zoom-in-95 duration-200">
      <button
        onClick={() => updateZoom(zoom - 10)}
        className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => updateZoom(100)}
        className="flex items-center gap-0.5 px-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {zoom}%
        <RotateCcw className="h-3 w-3" />
      </button>
      <button
        onClick={() => updateZoom(zoom + 10)}
        className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <div className="w-px h-5 bg-border mx-0.5" />
      <button
        onClick={() => setCollapsed(true)}
        className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors"
        title="Ocultar"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
