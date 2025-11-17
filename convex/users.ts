import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Bootstrap or get existing anonymous user
export const getOrCreateUser = mutation({
  args: {
    anonymousId: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_anonymous_id", (q) =>
        q.eq("anonymousId", args.anonymousId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      anonymousId: args.anonymousId,
      displayName: args.displayName,
      colorTheme: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // random hex
      createdAt: Date.now(),
    });

    return userId;
  },
});

// Update user display name
export const updateDisplayName = mutation({
  args: {
    userId: v.id("users"),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      displayName: args.displayName,
    });
  },
});

// Get user data
export const getUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
