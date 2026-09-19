import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * AI adaptive games progression.
 * Rule: Level 1 unlocked initially; scoring > 75% accuracy on the highest
 * unlocked level unlocks the next. Progress persists in Convex.
 */
export const myProgress = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    return ctx.db
      .query("gamesProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

/** Record a finished level attempt; unlocks the next level above 75%. */
export const recordAttempt = mutation({
  args: {
    game: v.string(),
    level: v.number(),
    accuracy: v.number(), // 0..100
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("gamesProgress")
      .withIndex("by_user_game", (q) =>
        q.eq("userId", userId).eq("game", args.game),
      )
      .unique();

    const unlockedLevel = existing?.unlockedLevel ?? 1;
    const bestScore = Math.max(existing?.bestScore ?? 0, args.accuracy);
    let newUnlocked = unlockedLevel;

    const passed = args.accuracy > 75;
    if (passed && args.level === unlockedLevel && args.level < 5) {
      newUnlocked = args.level + 1;
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        unlockedLevel: Math.max(existing.unlockedLevel, newUnlocked),
        bestScore,
      });
    } else {
      await ctx.db.insert("gamesProgress", {
        userId,
        game: args.game,
        unlockedLevel: newUnlocked,
        bestScore,
      });
    }

    return { accuracy: args.accuracy, unlockedLevel: newUnlocked, passed };
  },
});
