import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const MOCK_LINK_OTP = "1234";

async function requireActiveLink(
  ctx: any,
  caregiverId: Id<"users">,
  patientId: Id<"users">,
): Promise<void> {
  const links = await ctx.db
    .query("links")
    .withIndex("by_caregiver", (q: any) => q.eq("caregiverId", caregiverId))
    .collect();
  const active = links.find(
    (l: any) => l.patientId === patientId && l.status === "active",
  );
  if (!active) {
    throw new Error("Patient is not linked to you (data isolation).");
  }
}

/** Resolve a username to a patient (caregiver lookup; imperative call). */
export const findPatientByUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const patient = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.eq("username", args.username.trim().toLowerCase()),
      )
      .unique();

    if (patient === null) return null;
    return {
      id: patient._id,
      name: patient.name ?? null,
      role: patient.role ?? null,
    };
  },
});

/** Create a pending link to a patient (must be a patient-role user). */
export const requestLink = mutation({
  args: { patientId: v.id("users") },
  handler: async (ctx, args) => {
    const caregiverId = await getAuthUserId(ctx);
    if (caregiverId === null) throw new Error("Not authenticated");

    const patient = await ctx.db.get(args.patientId);
    if (patient === null) throw new Error("Patient not found");
    if (patient.role !== "patient") {
      throw new Error("That user is not registered as a patient.");
    }

    const all = await ctx.db
      .query("links")
      .withIndex("by_caregiver", (q) => q.eq("caregiverId", caregiverId))
      .collect();
    const existing = all.find((l) => l.patientId === args.patientId);
    if (existing && existing.status === "active") {
      throw new Error("Already linked to this patient.");
    }
    if (existing) {
      await ctx.db.patch(existing._id, { status: "pending" });
      return { linkId: existing._id };
    }
    const linkId = await ctx.db.insert("links", {
      patientId: args.patientId,
      caregiverId,
      status: "pending",
      createdAt: Date.now(),
    });
    return { linkId };
  },
});

/** Confirm the pending link with the mock OTP (server-validated). */
export const confirmLink = mutation({
  args: { linkId: v.id("links"), otp: v.string() },
  handler: async (ctx, args) => {
    const caregiverId = await getAuthUserId(ctx);
    if (caregiverId === null) throw new Error("Not authenticated");

    const link = await ctx.db.get(args.linkId);
    if (link === null) throw new Error("Link request not found");
    if (link.caregiverId !== caregiverId) {
      throw new Error("Not your link request.");
    }
    if (link.status === "active") return { ok: true };
    if (args.otp.trim() !== MOCK_LINK_OTP) {
      throw new Error("Incorrect OTP. Use 1234 for the demo.");
    }
    await ctx.db.patch(args.linkId, { status: "active" });
    return { ok: true };
  },
});

/** Pending + active links for the signed-in caregiver. */
export const myPatients = query({
  args: {},
  handler: async (ctx) => {
    const caregiverId = await getAuthUserId(ctx);
    if (caregiverId === null) return [];

    const links = await ctx.db
      .query("links")
      .withIndex("by_caregiver", (q) => q.eq("caregiverId", caregiverId))
      .collect();

    const out: Array<{
      linkId: Id<"links">;
      status: "pending" | "active";
      patientId: Id<"users">;
      patientName: string;
      patientUsername: string | null;
    }> = [];
    for (const link of links) {
      const patient = await ctx.db.get(link.patientId);
      if (patient) {
        out.push({
          linkId: link._id,
          status: link.status,
          patientId: link.patientId,
          patientName: patient.name ?? patient.username ?? "Patient",
          patientUsername: patient.username ?? null,
        });
      }
    }
    return out.sort((a, b) => a.patientName.localeCompare(b.patientName));
  },
});

/** Remove a link (caregiver-initiated). */
export const unlinkPatient = mutation({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    const caregiverId = await getAuthUserId(ctx);
    if (caregiverId === null) throw new Error("Not authenticated");

    const link = await ctx.db.get(args.linkId);
    if (link === null) throw new Error("Link not found");
    if (link.caregiverId !== caregiverId) {
      throw new Error("Not your link.");
    }
    await ctx.db.delete(args.linkId);
  },
});

/** Schedule / replace the next appointment for a linked patient. */
export const setAppointment = mutation({
  args: {
    patientId: v.id("users"),
    date: v.string(),
    time: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const caregiverId = await getAuthUserId(ctx);
    if (caregiverId === null) throw new Error("Not authenticated");
    await requireActiveLink(ctx, caregiverId, args.patientId);

    const existing = await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    for (const appt of existing) {
      await ctx.db.delete(appt._id);
    }
    await ctx.db.insert("appointments", {
      patientId: args.patientId,
      date: args.date,
      time: args.time,
      title: args.title.trim() || "Appointment",
      scheduledBy: caregiverId,
      createdAt: Date.now(),
    });
  },
});

/** Add a prescription (mocked OCR text) for a linked patient. */
export const addPrescription = mutation({
  args: {
    patientId: v.id("users"),
    content: v.string(),
    source: v.union(v.literal("ocr"), v.literal("manual")),
  },
  handler: async (ctx, args) => {
    const caregiverId = await getAuthUserId(ctx);
    if (caregiverId === null) throw new Error("Not authenticated");
    await requireActiveLink(ctx, caregiverId, args.patientId);

    await ctx.db.insert("prescriptions", {
      patientId: args.patientId,
      content: args.content.trim(),
      source: args.source,
      createdAt: Date.now(),
    });
  },
});

/** Log a daily clinical note (mood / sleep / behavior) for a linked patient. */
export const addClinicalNote = mutation({
  args: {
    patientId: v.id("users"),
    mood: v.string(),
    sleep: v.string(),
    behavior: v.string(),
  },
  handler: async (ctx, args) => {
    const caregiverId = await getAuthUserId(ctx);
    if (caregiverId === null) throw new Error("Not authenticated");
    await requireActiveLink(ctx, caregiverId, args.patientId);

    await ctx.db.insert("clinicalNotes", {
      patientId: args.patientId,
      caregiverId,
      mood: args.mood.trim(),
      sleep: args.sleep.trim(),
      behavior: args.behavior.trim(),
      createdAt: Date.now(),
    });
  },
});

/** Patient-side care plan: latest appointment + latest prescription. */
export const patientCarePlan = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { appointment: null, prescription: null };

    const appts = await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) => q.eq("patientId", userId))
      .collect();
    const appointment =
      appts.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;

    const rx = await ctx.db
      .query("prescriptions")
      .withIndex("by_patient", (q) => q.eq("patientId", userId))
      .collect();
    const prescription = rx.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;

    return { appointment, prescription };
  },
});

/** Doctor: patients reachable through caregiver links + their latest data. */
export const doctorRoster = query({
  args: {},
  handler: async (ctx) => {
    const doctorId = await getAuthUserId(ctx);
    if (doctorId === null) throw new Error("Not authenticated");
    const doctor = await ctx.db.get(doctorId);
    if (doctor === null || doctor.role !== "doctor") {
      throw new Error("Only doctors can access the roster.");
    }

    const links = await ctx.db.query("links").collect();
    const byPatient = new Map<string, Id<"users">>();
    for (const l of links) {
      if (l.status === "active") {
        byPatient.set(l.patientId, l.caregiverId);
      }
    }

    const out: Array<{
      patientId: Id<"users">;
      patientName: string;
      caregiverName: string;
      latestNote: {
        mood: string;
        sleep: string;
        behavior: string;
        createdAt: number;
      } | null;
      nextAppointment: {
        date: string;
        time: string;
        title: string;
      } | null;
      lastPrescription: { content: string; source: string } | null;
    }> = [];

    for (const [patientKey, caregiverId] of byPatient) {
      const patientId = patientKey as Id<"users">;
      const patient = await ctx.db.get(patientId);
      if (!patient) continue;

      const notes = await ctx.db
        .query("clinicalNotes")
        .withIndex("by_patient", (q) => q.eq("patientId", patientId))
        .collect();
      const latestNote = notes.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;

      const appts = await ctx.db
        .query("appointments")
        .withIndex("by_patient", (q) => q.eq("patientId", patientId))
        .collect();
      const latestAppt = appts.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;

      const rx = await ctx.db
        .query("prescriptions")
        .withIndex("by_patient", (q) => q.eq("patientId", patientId))
        .collect();
      const lastRx = rx.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;

      const caregiver = await ctx.db.get(caregiverId);

      out.push({
        patientId,
        patientName: patient.name ?? patient.username ?? "Patient",
        caregiverName: caregiver?.name ?? caregiver?.username ?? "Caregiver",
        latestNote: latestNote
          ? {
              mood: latestNote.mood,
              sleep: latestNote.sleep,
              behavior: latestNote.behavior,
              createdAt: latestNote.createdAt,
            }
          : null,
        nextAppointment: latestAppt
          ? {
              date: latestAppt.date,
              time: latestAppt.time,
              title: latestAppt.title,
            }
          : null,
        lastPrescription: lastRx
          ? { content: lastRx.content, source: lastRx.source }
          : null,
      });
    }
    return out.sort((a, b) => a.patientName.localeCompare(b.patientName));
  },
});
