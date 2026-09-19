/** Client-safe SMRITI role literals (mirror of the schema validator). */
export const APP_ROLES = ["patient", "caregiver", "doctor"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  patient: "Patient",
  caregiver: "Caregiver",
  doctor: "Doctor",
};
