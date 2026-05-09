"use client";
import { useState, FormEvent, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/cn";

// Minimal Web Speech API types — TypeScript's lib.dom doesn't ship them yet.
type RecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: RecognitionResult[] }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export function ChatInput({
  onSend,
  busy,
  placeholder,
}: {
  onSend: (msg: string) => void;
  busy?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const ref = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  // Keep the value at the moment recognition started so we can append cleanly.
  const baseRef = useRef("");

  useEffect(() => {
    if (!busy) ref.current?.focus();
  }, [busy]);

  useEffect(() => {
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      const next = (baseRef.current + final + interim).replace(/\s+/g, " ").trimStart();
      setValue(next);
      if (final) baseRef.current = (baseRef.current + final).replace(/\s+/g, " ");
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return () => {
      try { rec.abort(); } catch {}
      recRef.current = null;
    };
  }, []);

  const toggleMic = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      baseRef.current = value ? value.trimEnd() + " " : "";
      try {
        rec.start();
        setListening(true);
      } catch {
        // start() throws if already running — ignore.
      }
    }
  }, [listening, value]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    if (listening) recRef.current?.stop();
    onSend(trimmed);
    setValue("");
    baseRef.current = "";
  };

  return (
    <form
      onSubmit={submit}
      className="flex w-full items-end gap-2 rounded-2xl border bg-[var(--color-surface)] p-2 shadow-lg"
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit(e as unknown as FormEvent);
          }
        }}
        placeholder={listening ? "Listening…" : (placeholder ?? "Describe what you want to see…")}
        rows={1}
        className="min-h-[2.5rem] max-h-48 flex-1 resize-none bg-transparent px-2 py-2 text-sm focus:outline-none"
        disabled={busy}
      />

      {supported && (
        <button
          type="button"
          onClick={toggleMic}
          disabled={busy}
          aria-label={listening ? "Stop recording" : "Start voice input"}
          title={listening ? "Stop recording" : "Voice input"}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition disabled:opacity-40",
            listening
              ? "border-rose-500/50 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
              : "border-transparent text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
          )}
        >
          {listening ? (
            <span className="relative inline-flex h-4 w-4 items-center justify-center">
              <Mic className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 h-2 w-2 animate-ping rounded-full bg-rose-500" />
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />
            </span>
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>
      )}
      {!supported && (
        <span
          title="Voice input not supported in this browser"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--color-fg-muted)] opacity-40"
        >
          <MicOff className="h-4 w-4" />
        </span>
      )}

      <button
        type="submit"
        disabled={busy || !value.trim()}
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition",
          busy ? "bg-[var(--color-surface-2)] text-[var(--color-fg-muted)]" :
                 "bg-[var(--color-accent)] text-black hover:bg-[var(--color-accent-2)] disabled:opacity-40"
        )}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </button>
    </form>
  );
}
