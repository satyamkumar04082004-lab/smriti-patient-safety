import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Button } from "@/components/ui/button";
import { formatTime, isMissed } from "@/lib/medications";
import { BellRing, Check, PhoneCall } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface MissedRemindersBannerProps {
  medications: Doc<"medications">[];
}

/** Soothing banner for missed doses, with Take Now / alert caregiver. */
export function MissedRemindersBanner({
  medications,
}: MissedRemindersBannerProps) {
  const markTaken = useMutation(api.medications.markTaken);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const missed = medications.filter(
    (m) => isMissed(m) && !dismissed.includes(m._id),
  );
  if (missed.length === 0) return null;

  const handleTakeNow = async (id: string) => {
    setBusyId(id);
    try {
      await markTaken({ id: id as Doc<"medications">["_id"] });
      toast.success("Marked as taken. Well done!");
    } catch {
      toast.error("Could not update. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleAlertCaregiver = (id: string) => {
    setDismissed((prev) => [...prev, id]);
    toast.info("Your caregiver has been notified about the missed dose.", {
      description: "They may call you shortly to help.",
    });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3"
    >
      {missed.map((med) => (
        <div key={med._id} className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <BellRing
              className="mt-0.5 size-5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium">
                {med.name} at {formatTime(med.time)} was missed.
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                No rush — take it whenever you are ready.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={busyId === med._id}
              onClick={() => void handleTakeNow(med._id)}
            >
              <Check className="size-4" aria-hidden />
              {busyId === med._id ? "Saving…" : "Take Now"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-2"
              onClick={() => handleAlertCaregiver(med._id)}
            >
              <PhoneCall className="size-4" aria-hidden />
              Alert caregiver
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
