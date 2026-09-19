import { startKeywordListener, isSpeechSupported } from "@/lib/speech";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseVoiceGuardResult {
  enabled: boolean;
  listening: boolean;
  supported: boolean;
  lastPhrase: string | null;
  error: string | null;
  setEnabled: (value: boolean) => void;
  clearError: () => void;
}

const STORAGE_KEY = "smriti:voice-guard-enabled";

/**
 * Voice Guard: when enabled, listens for "Help", "Bachao" or "Madad"
 * and invokes onKeyword (which fires the shared SOS flow).
 */
export function useVoiceGuard(onKeyword: (phrase: string) => void): UseVoiceGuardResult {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [listening, setListening] = useState(false);
  const [lastPhrase, setLastPhrase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supported = isSpeechSupported();

  // Keep the latest callback without re-subscribing the recognizer.
  const keywordRef = useRef(onKeyword);
  useEffect(() => {
    keywordRef.current = onKeyword;
  }, [onKeyword]);

  useEffect(() => {
    if (!enabled || !supported) {
      setListening(false);
      return;
    }
    const stop = startKeywordListener({
      onKeyword: (phrase) => {
        setLastPhrase(phrase);
        keywordRef.current(phrase);
      },
      onListeningChange: setListening,
      onError: setError,
    });
    return stop;
  }, [enabled, supported]);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    setError(null);
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
    } catch {
      // localStorage unavailable; in-session state still works.
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    enabled,
    listening,
    supported,
    lastPhrase,
    error,
    setEnabled,
    clearError,
  };
}
