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
import { CalendarPlus, Pill } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface RemindersFormProps {
  patients: Array<{
    patientId: Id<"users">;
    patientName: string;
    status: string;
  }>;
}

/** Schedule next appointment + add prescription for a linked patient. */
export function RemindersForm({ patients }: RemindersFormProps) {
  const active = patients.filter((p) => p.status === "active");
  const setAppointment = useMutation(api.care.setAppointment);
  const addPrescription = useMutation(api.care.addPrescription);

  const [patientId, setPatientId] = useState<string>(active[0]?.patientId ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("Follow-up visit");
  const [rx, setRx] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAppointment = async () => {
    if (!patientId || !date || !time) {
      toast.error("Pick a patient, date and time first.");
      return;
    }
    setBusy(true);
    try {
      await setAppointment({
        patientId: patientId as Id<"users">,
        date,
        time,
        title,
      });
      toast.success("Appointment saved — visible on the patient's app.");
      setDate("");
      setTime("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const handlePrescription = async () => {
    if (!patientId || !rx.trim()) {
      toast.error("Pick a patient and enter the prescription text.");
      return;
    }
    setBusy(true);
    try {
      await addPrescription({
        patientId: patientId as Id<"users">,
        content: rx,
        source: "ocr",
      });
      toast.success("Prescription saved — visible on the patient's app.");
      setRx("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Remote Reminders</CardTitle>
        <CardDescription>
          Instantly reflect on the linked patient's dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Link a patient first to schedule reminders.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reminder-patient">Patient</Label>
              <select
                id="reminder-patient"
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
              <div className="flex flex-col gap-2 sm:col-span-3">
                <Label htmlFor="appt-title">Title</Label>
                <Input
                  id="appt-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Follow-up visit"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="appt-date">Date</Label>
                <Input
                  id="appt-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="appt-time">Time</Label>
                <Input
                  id="appt-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full gap-2"
                  onClick={() => void handleAppointment()}
                  disabled={busy}
                >
                  <CalendarPlus className="size-4" />
                  Save appointment
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="rx-text">Prescription (OCR or typed)</Label>
              <textarea
                id="rx-text"
                className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm"
                value={rx}
                onChange={(e) => setRx(e.target.value)}
                placeholder="e.g. Donepezil 10 mg — 1 tablet at night"
              />
              <Button
                variant="outline"
                className="gap-2 self-start"
                onClick={() => void handlePrescription()}
                disabled={busy}
              >
                <Pill className="size-4" />
                Save prescription
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
