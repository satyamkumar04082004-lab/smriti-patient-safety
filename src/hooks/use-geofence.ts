import {
  HOME_COORDS,
  HOME_RADIUS_METERS,
  haversineMeters,
} from "@/lib/geo";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseGeofenceResult {
  /** Distance from Home in meters, or null when unknown yet. */
  distanceMeters: number | null;
  outside: boolean;
  error: string | null;
  /** Dismiss the boundary-crossing banner (re-arms on next crossing). */
  dismiss: () => void;
}

/**
 * Mock background geofencing: polls the device position every 60s and
 * compares Haversine distance from the mocked Home coordinates against
 * the 500m safe radius.
 */
export function useGeofence(): UseGeofenceResult {
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const wasOutsideRef = useRef(false);

  const check = useCallback(async () => {
    try {
      const coords = await new Promise<{ lat: number; lng: number }>(
        (resolve, reject) => {
          if (!("geolocation" in navigator)) {
            reject(new Error("Geolocation not supported"));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => reject(err),
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
          );
        },
      );
      setDistanceMeters(haversineMeters(HOME_COORDS, coords));
      setError(null);
    } catch {
      // Silent: geofence is a background nicety, never nag the patient.
    }
  }, []);

  useEffect(() => {
    void check();
    const timer = window.setInterval(() => void check(), 60_000);
    return () => window.clearInterval(timer);
  }, [check]);

  const outside =
    distanceMeters !== null && distanceMeters > HOME_RADIUS_METERS;

  useEffect(() => {
    // Re-arm the banner each time we leave the safe zone.
    if (outside && !wasOutsideRef.current) {
      setDismissed(false);
    }
    wasOutsideRef.current = outside;
  }, [outside]);

  const dismiss = useCallback(() => setDismissed(true), []);

  return { distanceMeters, outside, error, dismiss };
}
