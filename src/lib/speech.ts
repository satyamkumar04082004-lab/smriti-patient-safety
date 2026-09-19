/** Minimal Web Speech API typings + keyword listener for Voice Guard.
 *  Kept local (no Window augmentation) to avoid collisions across TS libs. */

interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/** "Help", "Bachao", "Madad" — English + Hindi keywords, case-insensitive. */
const KEYWORD_RE = /\b(help|bachao|madad)\b/i;

export const VOICE_KEYWORDS = ["Help", "Bachao", "Madad"] as const;

export function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return (
    typeof w.SpeechRecognition === "function" ||
    typeof w.webkitSpeechRecognition === "function"
  );
}

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  if (typeof w.SpeechRecognition === "function") {
    return w.SpeechRecognition as SpeechRecognitionCtor;
  }
  if (typeof w.webkitSpeechRecognition === "function") {
    return w.webkitSpeechRecognition as SpeechRecognitionCtor;
  }
  return null;
}

export interface KeywordListenerOptions {
  onKeyword: (phrase: string) => void;
  onListeningChange: (listening: boolean) => void;
  onError: (message: string) => void;
}

/**
 * Start continuous keyword listening. Returns a cleanup function that
 * stops the recognizer. Auto-restarts after silence while active.
 */
export function startKeywordListener(
  opts: KeywordListenerOptions,
): () => void {
  const Ctor = getCtor();
  if (Ctor === null) {
    opts.onError("Voice recognition is not supported on this browser.");
    return () => {};
  }

  let active = true;
  let lastMatchAt = 0;

  const rec = new Ctor();
  rec.lang = "en-IN";
  rec.continuous = true;
  rec.interimResults = true;

  rec.onstart = () => opts.onListeningChange(true);

  rec.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0]?.transcript ?? "";
      if (KEYWORD_RE.test(transcript)) {
        const now = Date.now();
        if (now - lastMatchAt > 5000) {
          lastMatchAt = now;
          opts.onKeyword(transcript.trim());
        }
      }
    }
  };

  rec.onerror = (event) => {
    if (
      event.error === "not-allowed" ||
      event.error === "service-not-allowed"
    ) {
      active = false;
      opts.onListeningChange(false);
      opts.onError(
        "Microphone permission denied. Enable it in your browser settings.",
      );
    }
    // "no-speech" and "aborted" are benign; onend handles restarts.
  };

  rec.onend = () => {
    opts.onListeningChange(false);
    if (active) {
      try {
        rec.start();
      } catch {
        // start() race with stop(); the next onend cycle retries.
      }
    }
  };

  try {
    rec.start();
  } catch {
    opts.onError("Could not start voice recognition. Please try again.");
  }

  return () => {
    active = false;
    try {
      rec.stop();
    } catch {
      // already stopped
    }
  };
}
