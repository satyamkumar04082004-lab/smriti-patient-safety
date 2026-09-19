import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { roleValidator } from "./schema";

/**
 * Assign the SMRITI role (patient/caregiver/doctor) and optional mock
 * credentials to the currently signed-in user. Used right after the demo
 * login (password or simulated OTP) establishes a session.
 */
export const ensureProfile = mutation({
  args: {
    role: roleValidator,
    username: v.optional(v.string()),
    phone: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const patch: {
      role: typeof args.role;
      username?: string;
      phone?: string;
      name?: string;
    } = { role: args.role };
    if (args.username !== undefined) patch.username = args.username;
    if (args.phone !== undefined) patch.phone = args.phone;
    if (args.name !== undefined) patch.name = args.name;

    await ctx.db.patch(userId, patch);
  },
});
