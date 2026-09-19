import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SosModule } from "@/components/SosModule";
import { GeofenceBanner } from "@/components/GeofenceBanner";
import { MissedRemindersBanner } from "@/components/MissedRemindersBanner";
import { CarePlanCard } from "@/components/patient/CarePlanCard";
import { GamesHub } from "@/components/games/GamesHub";
import { CaregiverDashboard } from "@/components/caregiver/CaregiverDashboard";
import { DoctorDashboard } from "@/components/doctor/DoctorDashboard";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { useGeofence } from "@/hooks/use-geofence";
import { useEffect } from "react";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useNavigate } from "react-router";

export default function Dashboard() {
  const { user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const geofence = useGeofence();
  const medications = useQuery(api.medications.list) ?? [];
  const seedDemo = useMutation(api.medications.seedDemo);
  const role = user?.role ?? "patient";

  // Seed a demo medication schedule on first visit (missed dose included).
  useEffect(() => {
    if (isAuthenticated && role === "patient") {
      void seedDemo({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, role]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Authenticated workspace · {role}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Welcome{user?.name ? `, ${user.name}` : ""}
            </h1>
          </div>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer gap-2 self-start"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </header>

        {role === "caregiver" && <CaregiverDashboard />}

        {role === "doctor" && <DoctorDashboard />}

        {role === "patient" && (
          <>
            <MissedRemindersBanner medications={medications} />

            <GeofenceBanner
              distanceMeters={geofence.distanceMeters}
              outside={geofence.outside}
              onDismiss={geofence.dismiss}
            />

            <SosModule />

            <CarePlanCard />

            <GamesHub />
          </>
        )}

        {role !== "patient" && (
          <Card className="border-border/70 shadow-none">
            <CardHeader>
              <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <LayoutDashboard className="size-5" />
              </div>
              <CardTitle>SMRITI</CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>
    </main>
  );
}
