import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, FileText, NotebookPen, Stethoscope } from "lucide-react";

export function DoctorDashboard() {
  const roster = useQuery(api.care.doctorRoster);

  if (roster === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">Loading patients…</p>
      </div>
    );
  }

  if (roster.length === 0) {
    return (
      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="size-5" aria-hidden />
            Patient Reports
          </CardTitle>
          <CardDescription>
            Patients appear here once a caregiver links them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No data recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Stethoscope className="size-5" />
          </div>
          <CardTitle>Patient Reports</CardTitle>
          <CardDescription>
            Caregiver observations, upcoming appointments, and latest OCR
            prescriptions.
          </CardDescription>
        </CardHeader>
      </Card>

      {roster.map((p) => (
        <Card key={p.patientId}>
          <CardHeader>
            <CardTitle className="text-lg">{p.patientName}</CardTitle>
            <CardDescription>
              Caregiver: {p.caregiverName}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <NotebookPen className="size-4" aria-hidden />
                Latest clinical note
              </p>
              {p.latestNote === null ? (
                <p className="text-sm text-muted-foreground">
                  No data recorded yet.
                </p>
              ) : (
                <div className="rounded-md border px-3 py-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Mood:</span>{" "}
                    {p.latestNote.mood}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Sleep:</span>{" "}
                    {p.latestNote.sleep}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Behavior:</span>{" "}
                    {p.latestNote.behavior}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(p.latestNote.createdAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="size-4" aria-hidden />
                Next appointment
              </p>
              {p.nextAppointment === null ? (
                <p className="text-sm text-muted-foreground">
                  No data recorded yet.
                </p>
              ) : (
                <p className="text-sm">
                  {p.nextAppointment.title} — {p.nextAppointment.date} at{" "}
                  {p.nextAppointment.time}
                </p>
              )}
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <FileText className="size-4" aria-hidden />
                Last OCR prescription
              </p>
              {p.lastPrescription === null ? (
                <p className="text-sm text-muted-foreground">
                  No data recorded yet.
                </p>
              ) : (
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">
                    {p.lastPrescription.source === "ocr" ? "OCR" : "Manual"}
                  </Badge>
                  <p className="text-sm">{p.lastPrescription.content}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
