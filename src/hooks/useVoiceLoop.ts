import { useState, useRef, useCallback } from "react";

export type VoiceLoopStatus = "idle" | "listening" | "processing" | "speaking";

interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface UseVoiceLoopOptions {
  onTranscript: (text: string) => Promise<string>;
  lang?: string;
  maxErrors?: number;
}

export function useVoiceLoop({ onTranscript, lang = "pt-BR", maxErrors = 3 }: UseVoiceLoopOptions) {
  const [status, setStatus] = useState<VoiceLoopStatus>("idle");
  const activeRef = useRef(false);
  const errCountRef = useRef(0);
  const recognitionRef = useRef<any>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (!("speechSynthesis" in window)) {
          resolve();
          return;
        }
        // Cancel any ongoing speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1.05;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        speechSynthesis.speak(utterance);
      });
    },
    [lang]
  );

  const listen = useCallback(() => {
    if (!activeRef.current || !isSupported) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript;
      if (!text.trim()) {
        // Empty result, keep listening
        if (activeRef.current) listen();
        return;
      }

      errCountRef.current = 0;
      setStatus("processing");

      try {
        const response = await onTranscript(text);

        if (!activeRef.current) return;

        setStatus("speaking");
        await speak(response);

        if (activeRef.current) {
          setStatus("listening");
          listen();
        }
      } catch {
        if (activeRef.current) {
          setStatus("listening");
          listen();
        }
      }
    };

    recognition.onerror = (e: any) => {
      // "no-speech" is normal silence — don't count as error
      if (e.error === "no-speech" || e.error === "aborted") {
        if (activeRef.current) {
          setStatus("listening");
          listen();
        }
        return;
      }

      errCountRef.current++;
      if (errCountRef.current >= maxErrors) {
        stop();
        return;
      }

      if (activeRef.current) {
        setStatus("listening");
        listen();
      }
    };

    recognition.onend = () => {
      // onend fires after onresult/onerror — only restart if nothing else handled it
      // The handlers above already call listen() when needed
    };

    setStatus("listening");
    recognition.start();
  }, [isSupported, lang, maxErrors, onTranscript, speak]);

  const start = useCallback(() => {
    if (activeRef.current || !isSupported) return;
    activeRef.current = true;
    errCountRef.current = 0;

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);

    listen();
  }, [isSupported, listen]);

  const stop = useCallback(() => {
    activeRef.current = false;
    errCountRef.current = 0;

    if (navigator.vibrate) navigator.vibrate([30, 30, 30]);

    try {
      recognitionRef.current?.stop();
    } catch {}

    speechSynthesis?.cancel();
    setStatus("idle");
  }, []);

  return { status, isSupported, start, stop, isActive: status !== "idle" };
}
