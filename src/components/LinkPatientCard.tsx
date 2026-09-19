import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";

interface FoundPatient {
  id: string;
  name: string | null;
  role: string | null;
}

/** Caregiver "Add Patient": username -> simulated OTP -> link (data isolation). */
export function LinkPatientCard() {
  const myPatients = useQuery(api.care.myPatients);
  const findPatient = useMutation(api.care.findPatientByUsername);
  const requestLink = useMutation(api.care.requestLink);
  const confirmLink = useMutation(api.care.confirmLink);
  const unlinkPatient = useMutation(api.care.unlinkPatient);

  const [username, setUsername] = useState("");
  const [found, setFound] = useState<FoundPatient | null>(null);
  const [linkId, setLinkId] = useState<Id<"links"> | null>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLookup = async () => {
    if (!username.trim()) {
      toast.error("Enter the patient's username first.");
      return;
    }
    setBusy(true);
    try {
      const result = await findPatient({ username: username.trim() });
      if (result === null) {
        toast.error("No patient found with that username.");
        return;
      }
      if (result.role !== "patient") {
        toast.error("That user is not registered as a patient.");
        return;
      }
      setFound(result);
      const link = await requestLink({ patientId: result.id as Id<"users"> });
      setLinkId(link.linkId);
      toast.info(`OTP sent to ${result.name ?? "patient"}'s app.`, {
        description: "Demo OTP is 1234",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!linkId) return;
    setBusy(true);
    try {
      await confirmLink({ linkId, otp });
      toast.success("Patient linked! Their data will now sync to you.");
      setFound(null);
      setLinkId(null);
      setOtp("");
      setUsername("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async (id: Id<"links">) => {
    setBusy(true);
    try {
      await unlinkPatient({ linkId: id });
      toast.info("Patient unlinked.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unlink failed.");
    } finally {
      setBusy(false);
    }
  };

  const patients = myPatients ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Patient</CardTitle>
        <CardDescription>
          Link by username, confirm with the OTP they see in their app
          (demo&nbsp;1234). Data isolation is enforced per link.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="patient-username">Patient username</Label>
          <div className="flex gap-2">
            <Input
              id="patient-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. sita_patient"
            />
            <Button onClick={() => void handleLookup()} disabled={busy}>
              Send OTP
            </Button>
          </div>
        </div>

        {linkId && (
          <div className="flex flex-col gap-2">
            <Label>Enter OTP sent to patient</Label>
            <div className="flex items-center gap-3">
              <InputOTP maxLength={4} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <Button onClick={() => void handleConfirm()} disabled={busy || otp.length !== 4}>
                Confirm
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Linked patients</p>
          {patients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No patients linked yet.
            </p>
          ) : (
            patients.map((p) => (
              <div
                key={p.linkId}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{p.patientName}</p>
                  <p className="text-xs text-muted-foreground">
                    @{p.patientUsername ?? "—"}
                  </p>
                </div>
                {p.status === "active" ? (
                  <Badge>Active</Badge>
                ) : (
                  <Badge variant="outline">Pending OTP</Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void handleUnlink(p.linkId)}
                >
                  Unlink
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
