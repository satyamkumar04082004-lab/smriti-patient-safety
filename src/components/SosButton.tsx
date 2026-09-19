import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { buildGoogleMapsLink, getCurrentPosition } from "@/lib/geo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  PhoneOff,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type SosPhase = "idle" | "locating" | "calling" | "error";

const CAREGIVER_NAME = "Anita";

/**
 * v1 flagship: 1-tap live-location SOS.
 * On fire: fetches navigator.geolocation.getCurrentPosition, generates a
 * Google Maps tracking link, stores it via Convex (simulating send to
 * caregiver), and shows a mock calling UI with a `tel:` link.
 */
export function SosButton() {
  const { user } = useAuth();
  const recentSos = useQuery(api.sos.myRecent);
  const fireSos = useMutation(api.sos.fire);
  const cancelSos = useMutation(api.sos.cancel);

  const [phase, setPhase] = useState<SosPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const sosIdRef = useRef<Id<"sosEvents"> | null>(null);

  const triggerSos = useCallback(async () => {
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
      toast.success("Live location sent to your caregiver.", {
        description: "They can open the tracking link to reach you.",
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong.",
      );
      setPhase("error");
    }
  }, [fireSos]);

  // Keep calling UI in sync with the persisted SOS status (e.g. cancelled
  // from another tab).
  useEffect(() => {
    if (
      phase === "calling" &&
      recentSos &&
      recentSos.status === "cancelled" &&
      recentSos._id === sosIdRef.current
    ) {
      setPhase("idle");
      setMapUrl(null);
      sosIdRef.current = null;
    }
  }, [phase, recentSos]);

  const handleCancel = useCallback(async () => {
    const id = sosIdRef.current;
    setPhase("idle");
    setMapUrl(null);
    if (id) {
      try {
        await cancelSos({ sosId: id });
      } catch {
        toast.error("Could not stand down. Please try again.");
      }
    }
    sosIdRef.current = null;
  }, [cancelSos]);

  const isLoading = phase === "locating";
  const isCalling = phase === "calling";
  const patientName = user?.name ?? user?.username ?? "you";

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="size-4 text-destructive" aria-hidden />
          Emergency SOS
        </CardTitle>
        <CardDescription>
          One tap shares your live location with {CAREGIVER_NAME} and starts a
          mock call.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button
          type="button"
          size="lg"
          variant="destructive"
          className="w-full gap-2"
          disabled={isLoading || isCalling}
          onClick={() => setConfirmOpen(true)}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Phone className="size-4" aria-hidden />
          )}
          {isLoading ? "Getting your location…" : "SOS — Send live location"}
        </Button>

        {phase === "error" && errorMessage && (
          <p className="flex items-start gap-2 text-sm text-destructive" role="alert">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {errorMessage}
          </p>
        )}

        <Separator />

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {isCalling
              ? "Caregiver notified."
              : "No SOS active right now."}
          </p>
          {recentSos && (
            <Badge
              variant={recentSos.status === "calling" ? "destructive" : "outline"}
            >
              {recentSos.status === "calling" ? "Active" : "Stand down"}
            </Badge>
          )}
        </div>
      </CardContent>

      {/* Confirm before firing */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send SOS with live location?</AlertDialogTitle>
            <AlertDialogDescription>
              Your live location link will be sent to {CAREGIVER_NAME} and a
              mock call screen will start.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Not now</AlertDialogCancel>
            <AlertDialogAction
              disabled={isLoading}
              onClick={(e) => {
                e.preventDefault();
                setConfirmOpen(false);
                void triggerSos();
              }}
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                "Yes, send SOS"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mock calling UI (tel: link) */}
      <Dialog open={isCalling} onOpenChange={(open) => { if (!open) void handleCancel(); }}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
              </span>
              Calling {CAREGIVER_NAME}…
            </DialogTitle>
            <DialogDescription>
              Mock call — in a real emergency this would dial your caregiver
              while they navigate to your live location.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            <p className="text-2xl font-semibold tabular-nums">+91 98••• ••210</p>
            <p className="text-sm text-muted-foreground">
              Live location sent to {CAREGIVER_NAME} for {patientName}
            </p>

            {mapUrl && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
              >
                <MapPin className="size-4" aria-hidden />
                Open live location in Google Maps
              </a>
            )}

            <div className="flex w-full items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                asChild
                variant="secondary"
                className="gap-2"
              >
                <a href="tel:+919800000210">
                  <Phone className="size-4" aria-hidden />
                  Call via phone
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => void handleCancel()}
              >
                <PhoneOff className="size-4" aria-hidden />
                Stand down
              </Button>
            </div>

            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="size-3.5" aria-hidden />
              Caregiver received your location.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
