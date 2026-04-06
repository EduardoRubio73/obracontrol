const BAR_COUNT = 5;

interface VoiceWaveformProps {
  status: "listening" | "speaking" | "processing";
  className?: string;
}

export function VoiceWaveform({ status, className = "" }: VoiceWaveformProps) {
  const isActive = status === "listening" || status === "speaking";
  const baseColor =
    status === "listening"
      ? "bg-destructive"
      : status === "speaking"
      ? "bg-primary"
      : "bg-muted-foreground/40";

  return (
    <div className={`flex items-center justify-center gap-[3px] h-6 ${className}`}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          className={`inline-block w-[3px] rounded-full ${baseColor} transition-all`}
          style={{
            height: isActive ? undefined : "6px",
            animation: isActive
              ? `voiceBar 0.8s ease-in-out ${i * 0.12}s infinite alternate`
              : "none",
          }}
        />
      ))}
      <style>{`
        @keyframes voiceBar {
          0% { height: 4px; }
          100% { height: 22px; }
        }
      `}</style>
    </div>
  );
}
