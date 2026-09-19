import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { buildGoogleMapsLink, getCurrentPosition } from "@/lib/geo";
import { useCallback, useRef, useState } from "react";

export type SosPhase = "idle" | "locating" | "calling" | "error";

export interface UseSosResult {
  phase: SosPhase;
  errorMessage: string | null;
  mapUrl: string | null;
  /** The one and only SOS entry point — used by button tap AND voice. */
  triggerSos: () => Promise<void>;
  standDown: () => Promise<void>;
  clearError: () => void;
}

/**
 * Shared SOS engine. Both the 1-tap button and the Voice Guard call
 * triggerSos(), so voice-activated SOS fires the exact same flow:
 * geolocation -> Google Maps link -> persist (send to caregiver) -> mock call.
 */
export function useSos(): UseSosResult {
  const fireSos = useMutation(api.sos.fire);
  const cancelSos = useMutation(api.sos.cancel);

  const [phase, setPhase] = useState<SosPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const sosIdRef = useRef<Id<"sosEvents"> | null>(null);

  const triggerSos = useCallback(async () => {
    if (sosIdRef.current !== null) return; // already active
    setPhase("locating");
    setErrorMessage(null);
    try {
      const coords = await getCurrentPosition();
      const url = buildGoogleMapsLink(coords);
      setMapUrl(url);
      const result = await fireSos({
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy,
        mapUrl: url,
      });
      sosIdRef.current = result?.sosId ?? null;
      setPhase("calling");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong.",
      );
      setPhase("error");
    }
  }, [fireSos]);

  const standDown = useCallback(async () => {
    const id = sosIdRef.current;
    sosIdRef.current = null;
    setPhase("idle");
    setMapUrl(null);
    if (id) {
      try {
        await cancelSos({ sosId: id });
      } catch {
        // Non-fatal; the UI has already stood down.
      }
    }
  }, [cancelSos]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    setPhase("idle");
  }, []);

  return { phase, errorMessage, mapUrl, triggerSos, standDown, clearError };
}
