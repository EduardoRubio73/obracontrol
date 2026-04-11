import { useState, useRef } from "react";
import { Paperclip, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadPreviewProps {
  name: string;
  accept?: string;
}

export function FileUploadPreview({ name, accept = "image/*,.pdf" }: FileUploadPreviewProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (f && f.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
  };

  const clear = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 gap-2 text-base border-dashed"
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="h-5 w-5 text-primary" />
        {file ? "Alterar arquivo" : "📎 Anexar comprovante / NF"}
      </Button>

      {file && (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="h-16 w-16 rounded-lg object-cover border"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-destructive/10 border">
              <FileText className="h-8 w-8 text-destructive" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={clear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
