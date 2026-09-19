import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkPatientCard } from "@/components/LinkPatientCard";
import { RemindersForm } from "@/components/caregiver/RemindersForm";
import { ClinicalNotesForm } from "@/components/caregiver/ClinicalNotesForm";
import { Siren } from "lucide-react";

export function CaregiverDashboard() {
  const myPatients = useQuery(api.care.myPatients) ?? [];
  const sosFeed = useQuery(api.sos.forCaregiver) ?? [];

  return (
    <div className="flex flex-col gap-8">
      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Siren className="size-5" />
          </div>
          <CardTitle>Caregiver Console</CardTitle>
          <CardDescription>
            Link patients, schedule their care, and respond to live SOS alerts.
          </CardDescription>
        </CardHeader>
      </Card>

      {sosFeed.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Siren className="size-4" aria-hidden />
              Live SOS alerts
            </CardTitle>
            <CardDescription>
              These patients need help right now.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {sosFeed.map((sos) => (
              <div
                key={sos._id}
                className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">SOS — live location</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(sos.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={sos.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary underline underline-offset-4"
                  >
                    Open in Google Maps
                  </a>
                  <Badge variant="destructive">
                    {sos.status === "calling" ? "Calling" : "Stand down"}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <LinkPatientCard />
      <RemindersForm patients={myPatients} />
      <ClinicalNotesForm patients={myPatients} />
    </div>
  );
}
