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
import { CalendarDays, FileText } from "lucide-react";

/** Patient-facing care plan: appointment + prescription set by caregiver. */
export function CarePlanCard() {
  const plan = useQuery(api.care.patientCarePlan);
  const appointment = plan?.appointment ?? null;
  const prescription = plan?.prescription ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="size-4" aria-hidden />
          Care Plan
        </CardTitle>
        <CardDescription>
          Set remotely by your caregiver — always up to date here.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium">Next appointment</p>
          {appointment === null ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Nothing scheduled yet.
            </p>
          ) : (
            <p className="mt-1 text-sm">
              {appointment.title} — {appointment.date} at {appointment.time}
            </p>
          )}
        </div>

        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <FileText className="size-4" aria-hidden />
            Latest prescription
          </p>
          {prescription === null ? (
            <p className="mt-1 text-sm text-muted-foreground">
              No prescription added yet.
            </p>
          ) : (
            <div className="mt-1 flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">
                {prescription.source === "ocr" ? "OCR" : "Manual"}
              </Badge>
              <p className="text-sm">{prescription.content}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
