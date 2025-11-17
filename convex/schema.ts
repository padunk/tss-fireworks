import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User table for tracking anonymous and authenticated users
  users: defineTable({
    anonymousId: v.optional(v.string()), // localStorage-based ID for anonymous users
    displayName: v.optional(v.string()),
    colorTheme: v.optional(v.string()), // hex color for user's fireworks
    createdAt: v.number(), // timestamp
  }).index("by_anonymous_id", ["anonymousId"]),

  // Active fireworks currently being displayed (with TTL)
  fireworks_active: defineTable({
    userId: v.id("users"),
    handCount: v.number(), // 1 or 2 hands detected
    positionX: v.number(), // normalized 0-1
    positionY: v.number(), // normalized 0-1
    velocityX: v.optional(v.number()),
    velocityY: v.optional(v.number()),
    color: v.string(), // hex color
    effectType: v.union(
      v.literal("burst"),
      v.literal("fountain"),
      v.literal("sparkle"),
      v.literal("cascade")
    ),
    launchedAt: v.number(), // server timestamp for sync
    duration: v.number(), // milliseconds (e.g., 3000)
    expiresAt: v.number(), // launchedAt + duration
  })
    .index("by_expires", ["expiresAt"])
    .index("by_user", ["userId"]),

  // Historical archive of all fireworks (optional, for stats/replay)
  fireworks_history: defineTable({
    userId: v.id("users"),
    handCount: v.number(),
    positionX: v.number(),
    positionY: v.number(),
    color: v.string(),
    effectType: v.union(
      v.literal("burst"),
      v.literal("fountain"),
      v.literal("sparkle"),
      v.literal("cascade")
    ),
    launchedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_launched_at", ["launchedAt"]),
});
