import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// app roles for SMRITI (patient / caregiver / doctor)
export const ROLES = {
  PATIENT: "patient",
  CAREGIVER: "caregiver",
  DOCTOR: "doctor",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.PATIENT),
  v.literal(ROLES.CAREGIVER),
  v.literal(ROLES.DOCTOR),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
      // SMRITI mock credential login fields
      username: v.optional(v.string()),
      password: v.optional(v.string()), // mock plaintext for the demo only
      phone: v.optional(v.string()),
      linkedPatient: v.optional(v.id("users")), // set by caregiver OTP linking
    }).index("email", ["email"]),

    // One-tap SOS: fired from patient's live location
    sosEvents: defineTable({
      patientId: v.id("users"),
      lat: v.number(),
      lng: v.number(),
      accuracy: v.optional(v.number()),
      mapUrl: v.string(),
      status: v.union(v.literal("calling"), v.literal("cancelled")),
      createdAt: v.number(),
    })
      .index("by_patient", ["patientId", "createdAt"])
      .index("by_patient_recent", ["patientId"]),

    // Caregiver OTP patient linking
    links: defineTable({
      patientId: v.id("users"),
      caregiverId: v.id("users"),
      status: v.union(v.literal("pending"), v.literal("active")),
      createdAt: v.number(),
    })
      .index("by_patient", ["patientId"])
      .index("by_caregiver", ["caregiverId"]),

    // Remote reminders scheduled by caregiver -> seen on patient app
    medications: defineTable({
      patientId: v.id("users"),
      name: v.string(),
      time: v.string(), // "HH:MM" 24h
      scheduledBy: v.id("users"), // caregiver
      createdAt: v.number(),
      takenAt: v.optional(v.number()),
    }).index("by_patient", ["patientId"]),

    // Remote reminders: next appointment
    appointments: defineTable({
      patientId: v.id("users"),
      date: v.string(), // "YYYY-MM-DD"
      time: v.string(), // "HH:MM"
      title: v.string(),
      scheduledBy: v.id("users"),
      createdAt: v.number(),
    }).index("by_patient", ["patientId"]),

    // Remote reminders: prescription (mock OCR result text)
    prescriptions: defineTable({
      patientId: v.id("users"),
      content: v.string(),
      source: v.union(v.literal("ocr"), v.literal("manual")),
      createdAt: v.number(),
    }).index("by_patient", ["patientId"]),

    // Clinical notes logged by caregiver -> doctor panel
    clinicalNotes: defineTable({
      patientId: v.id("users"),
      caregiverId: v.id("users"),
      mood: v.string(),
      sleep: v.string(),
      behavior: v.string(),
      createdAt: v.number(),
    }).index("by_patient", ["patientId"]),

    // AI adaptive games: per-game unlocked level, persisted (75% rule)
    gamesProgress: defineTable({
      userId: v.id("users"),
      game: v.string(), // "bamboo-sequence" | ...
      unlockedLevel: v.number(), // highest unlocked level, starts at 1
      bestScore: v.number(), // best accuracy in %
    })
      .index("by_user", ["userId"])
      .index("by_user_game", ["userId", "game"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
