import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run cleanup every 30 seconds to remove expired fireworks
crons.interval(
  "cleanup expired fireworks",
  { seconds: 30 },
  internal.fireworks.cleanupExpiredFireworks
);

export default crons;
