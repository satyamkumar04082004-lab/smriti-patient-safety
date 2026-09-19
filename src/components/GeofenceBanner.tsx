import { Button } from "@/components/ui/button";
import { HOME_RADIUS_METERS } from "@/lib/geo";
import { HeartHandshake, X } from "lucide-react";

interface GeofenceBannerProps {
  distanceMeters: number | null;
  outside: boolean;
  onDismiss: () => void;
}

/** Soothing banner shown when the patient crosses the 500m home boundary. */
export function GeofenceBanner({
  distanceMeters,
  outside,
  onDismiss,
}: GeofenceBannerProps) {
  if (!outside) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start justify-between gap-4 rounded-lg border bg-card px-4 py-3"
    >
      <div className="flex items-start gap-3">
        <HeartHandshake
          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div>
          <p className="text-sm font-medium">
            Caregiver has been notified of boundary crossing.
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            You are about{" "}
            {distanceMeters !== null
              ? `${Math.round(distanceMeters / 50) * 50} m`
              : "some distance"}{" "}
            from home — beyond the safe {HOME_RADIUS_METERS} m radius. Help is
            on the way; there is no need to worry.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        aria-label="Dismiss boundary notice"
        onClick={onDismiss}
      >
        <X className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
