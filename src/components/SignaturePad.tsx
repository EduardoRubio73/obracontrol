import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eraser, Save, PenTool } from "lucide-react";

interface SignaturePadProps {
  initialImage?: string | null;
  onSave: (dataUrl: string) => void;
  saving?: boolean;
}

const SignaturePad = ({ initialImage, onSave, saving }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  const getCtx = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return null;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    return ctx;
  }, []);

  // Load initial image
  useEffect(() => {
    if (!initialImage || !canvasRef.current) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = canvasRef.current!;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      setHasStrokes(true);
    };
    img.src = initialImage;
  }, [initialImage]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    const m = e as React.MouseEvent;
    return { x: (m.clientX - rect.left) * scaleX, y: (m.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
    setHasStrokes(true);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!drawing) return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => setDrawing(false);

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    setHasStrokes(false);
  };

  const save = () => {
    const c = canvasRef.current;
    if (!c) return;
    onSave(c.toDataURL("image/png"));
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <PenTool className="h-4 w-4" /> Assinatura Digital
      </Label>
      <p className="text-xs text-muted-foreground">
        Desenhe sua assinatura com o dedo ou mouse. Ela aparecerá nos documentos impressos e PDFs.
      </p>
      <div className="rounded-xl border-2 border-dashed border-muted-foreground/30 bg-white overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full cursor-crosshair"
          style={{ aspectRatio: "3/1" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear} className="gap-1">
          <Eraser className="h-3.5 w-3.5" /> Limpar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={!hasStrokes || saving}
          className="gap-1"
        >
          <Save className="h-3.5 w-3.5" /> {saving ? "Salvando..." : "Salvar Assinatura"}
        </Button>
      </div>
    </div>
  );
};

export default SignaturePad;