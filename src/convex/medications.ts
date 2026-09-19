import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** All medications for the signed-in patient, sorted by time of day. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    const meds = await ctx.db
      .query("medications")
      .withIndex("by_patient", (q) => q.eq("patientId", userId))
      .collect();

    return meds.sort((a, b) => a.time.localeCompare(b.time));
  },
});

/**
 * Seed a small demo schedule the first time a patient opens the app:
 * one dose 2h in the past (missed) and one 3h ahead, so the missed
 * reminders banner has something real to show.
 */
export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("medications")
      .withIndex("by_patient", (q) => q.eq("patientId", userId))
      .collect();
    if (existing.length > 0) {
      return { seeded: 0 };
    }

    const pad = (n: number) => String(n).padStart(2, "0");
    const toTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const now = Date.now();

    const missed = new Date(now - 2 * 60 * 60 * 1000);
    const upcoming = new Date(now + 3 * 60 * 60 * 1000);

    await ctx.db.insert("medications", {
      patientId: userId,
      name: "Donepezil 10 mg",
      time: toTime(missed),
      scheduledBy: userId, // demo seed; caregiver-scheduled in Task 3
      createdAt: now,
    });
    await ctx.db.insert("medications", {
      patientId: userId,
      name: "Memantine 5 mg",
      time: toTime(upcoming),
      scheduledBy: userId,
      createdAt: now,
    });

    return { seeded: 2 };
  },
});

/** Patient marks a dose as taken ("Take Now" / "Mark as Done"). */
export const markTaken = mutation({
  args: { id: v.id("medications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const med = await ctx.db.get(args.id);
    if (med === null) {
      throw new Error("Medication not found");
    }
    if (med.patientId !== userId) {
      throw new Error("Not your medication");
    }

    await ctx.db.patch(args.id, { takenAt: Date.now() });
  },
});
