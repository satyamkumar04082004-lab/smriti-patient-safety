/** Geo helpers for the 1-tap live-location SOS (v1). */

export interface Coords {
  lat: number;
  lng: number;
  accuracy?: number;
}

/** Fetch the device's current position via the browser Geolocation API. */
export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        const messages: Record<number, string> = {
          1: "Location permission denied. Enable it in your browser settings to send your live location.",
          2: "Location unavailable right now. Please try again.",
          3: "Getting your location timed out. Please try again.",
        };
        reject(new Error(messages[err.code] ?? "Failed to get your location."));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  });
}

/** Google Maps tracking link generated from live coordinates. */
export function buildGoogleMapsLink(coords: Coords): string {
  const base = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
  return coords.accuracy !== undefined
    ? `${base},17z?accuracy=${encodeURIComponent(String(coords.accuracy))}`
    : base;
}
