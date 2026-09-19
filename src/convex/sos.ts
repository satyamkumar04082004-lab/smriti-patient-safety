import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * Record a 1-tap SOS: stores the patient's live position and the generated
 * Google Maps tracking link. Simulates delivery to the caregiver.
 */
export const fire = mutation({
  args: {
    lat: v.number(),
    lng: v.number(),
    accuracy: v.optional(v.number()),
    mapUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const id = await ctx.db.insert("sosEvents", {
      patientId: userId,
      lat: args.lat,
      lng: args.lng,
      accuracy: args.accuracy,
      mapUrl: args.mapUrl,
      status: "calling",
      createdAt: now,
    });

    // Simulated caregiver notification: in production this would fan out
    // push notifications / SMS to every active caregiver link.
    return { sosId: id, createdAt: now };
  },
});

/** Patient cancelled the mock call / stand-down. */
export const cancel = mutation({
  args: { sosId: v.id("sosEvents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const sos = await ctx.db.get(args.sosId);
    if (sos === null) {
      throw new Error("SOS not found");
    }
    if (sos.patientId !== userId) {
      throw new Error("Not your SOS event");
    }

    await ctx.db.patch(args.sosId, { status: "cancelled" });
  },
});

/** Most recent SOS for the signed-in patient (drives the calling UI). */
export const myRecent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const events = await ctx.db
      .query("sosEvents")
      .withIndex("by_patient", (q) => q.eq("patientId", userId))
      .order("desc")
      .take(1);

    return events[0] ?? null;
  },
});

/**
 * Live SOS feed for caregivers: latest event per linked patient.
 * Data isolation: only patients linked to this caregiver are returned.
 */
export const forCaregiver = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    const links = await ctx.db
      .query("links")
      .withIndex("by_caregiver", (q) => q.eq("caregiverId", userId))
      .collect();

    const active = links.filter((l) => l.status === "active");
    const out: Array<{ patientId: Id<"users">; lat: number; lng: number; accuracy?: number; mapUrl: string; status: "calling" | "cancelled"; createdAt: number; _id: Id<"sosEvents">; _creationTime: number }> = [];
    for (const link of active) {
      const events = await ctx.db
        .query("sosEvents")
        .withIndex("by_patient", (q) => q.eq("patientId", link.patientId))
        .order("desc")
        .take(1);
      if (events[0]) {
        out.push(events[0]);
      }
    }
    return out.sort((a, b) => b.createdAt - a.createdAt);
  },
});
