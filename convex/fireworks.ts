import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const EFFECT_TYPES = ["burst", "fountain", "sparkle", "cascade"] as const;
const MAX_LAUNCHES_PER_MINUTE = 30; // Rate limiting

// Launch a new firework
export const launchFirework = mutation({
  args: {
    userId: v.id("users"),
    handCount: v.number(),
    positionX: v.number(),
    positionY: v.number(),
    velocityX: v.optional(v.number()),
    velocityY: v.optional(v.number()),
    effectType: v.optional(
      v.union(
        v.literal("burst"),
        v.literal("fountain"),
        v.literal("sparkle"),
        v.literal("cascade")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Rate limiting: check recent launches from this user
    const oneMinuteAgo = Date.now() - 60000;
    const recentLaunches = await ctx.db
      .query("fireworks_active")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("launchedAt"), oneMinuteAgo))
      .collect();

    if (recentLaunches.length >= MAX_LAUNCHES_PER_MINUTE) {
      throw new Error(
        "Rate limit exceeded. Please wait before launching more fireworks."
      );
    }

    // Get user color
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const color = user.colorTheme || "#ffffff";
    const effectType =
      args.effectType ||
      EFFECT_TYPES[Math.floor(Math.random() * EFFECT_TYPES.length)];
    const launchedAt = Date.now();
    const duration = 3000; // 3 seconds
    const expiresAt = launchedAt + duration;

    // Insert active firework
    const fireworkId = await ctx.db.insert("fireworks_active", {
      userId: args.userId,
      handCount: args.handCount,
      positionX: Math.max(0, Math.min(1, args.positionX)),
      positionY: Math.max(0, Math.min(1, args.positionY)),
      velocityX: args.velocityX || 0,
      velocityY: args.velocityY || 1,
      color,
      effectType,
      launchedAt,
      duration,
      expiresAt,
    });

    // Archive to history
    await ctx.db.insert("fireworks_history", {
      userId: args.userId,
      handCount: args.handCount,
      positionX: args.positionX,
      positionY: args.positionY,
      color,
      effectType,
      launchedAt,
    });

    return fireworkId;
  },
});

// Query active fireworks (reactive)
export const getActiveFireworks = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all active fireworks that haven't expired
    const active = await ctx.db
      .query("fireworks_active")
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .collect();

    return active;
  },
});

// Cleanup expired fireworks (called by cron or manually)
export const cleanupExpiredFireworks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expired = await ctx.db
      .query("fireworks_active")
      .withIndex("by_expires")
      .filter((q) => q.lte(q.field("expiresAt"), now))
      .collect();

    for (const firework of expired) {
      await ctx.db.delete(firework._id);
    }

    return { deleted: expired.length };
  },
});

// Get firework statistics
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const activeCount = await ctx.db
      .query("fireworks_active")
      .collect()
      .then((f) => f.length);

    const totalCount = await ctx.db
      .query("fireworks_history")
      .collect()
      .then((f) => f.length);

    return {
      active: activeCount,
      total: totalCount,
    };
  },
});
