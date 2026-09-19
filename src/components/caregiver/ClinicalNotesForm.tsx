import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NotebookPen } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ClinicalNotesFormProps {
  patients: Array<{
    patientId: Id<"users">;
    patientName: string;
    status: string;
  }>;
}

/** Daily observations (mood / sleep / behavior) synced to the doctor panel. */
export function ClinicalNotesForm({ patients }: ClinicalNotesFormProps) {
  const active = patients.filter((p) => p.status === "active");
  const addNote = useMutation(api.care.addClinicalNote);

  const [patientId, setPatientId] = useState<string>(active[0]?.patientId ?? "");
  const [mood, setMood] = useState("");
  const [sleep, setSleep] = useState("");
  const [behavior, setBehavior] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!patientId || !mood.trim() || !sleep.trim() || !behavior.trim()) {
      toast.error("Fill in mood, sleep and behavior for the note.");
      return;
    }
    setBusy(true);
    try {
      await addNote({
        patientId: patientId as Id<"users">,
        mood,
        sleep,
        behavior,
      });
      toast.success("Note saved — synced to the doctor's panel.");
      setMood("");
      setSleep("");
      setBehavior("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clinical Notes</CardTitle>
        <CardDescription>
          Daily observations, visible to the treating doctor.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Link a patient first to log notes.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="notes-patient">Patient</Label>
              <select
                id="notes-patient"
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
              >
                {active.map((p) => (
                  <option key={p.patientId} value={p.patientId}>
                    {p.patientName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="note-mood">Mood</Label>
                <Input
                  id="note-mood"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  placeholder="Calm, cheerful…"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="note-sleep">Sleep</Label>
                <Input
                  id="note-sleep"
                  value={sleep}
                  onChange={(e) => setSleep(e.target.value)}
                  placeholder="7 hours, undisturbed…"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="note-behavior">Behavior</Label>
                <Input
                  id="note-behavior"
                  value={behavior}
                  onChange={(e) => setBehavior(e.target.value)}
                  placeholder="Engaged, slight agitation after lunch…"
                />
              </div>
            </div>

            <Button
              className="gap-2 self-start"
              onClick={() => void handleSubmit()}
              disabled={busy}
            >
              <NotebookPen className="size-4" />
              Save note
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
