# Convex Setup for Fireworks App

## Initial Setup

1. **Install Convex CLI globally (optional but recommended):**

   ```bash
   npm install -g convex
   ```

2. **Initialize Convex development environment:**

   ```bash
   npx convex dev
   ```

   This will:
   - Prompt you to log in with GitHub
   - Create a new Convex project (or select existing)
   - Generate `convex/_generated/` files with TypeScript types
   - Start watching for changes to your Convex functions
   - Provide your deployment URL

3. **Update `.env.local` with your Convex URL:**

   After running `npx convex dev`, copy the deployment URL and add it to `.env.local`:

   ```
   VITE_CONVEX_URL=https://your-deployment-name.convex.cloud
   ```

4. **Keep `npx convex dev` running in a separate terminal** while developing. It will:
   - Sync schema changes
   - Regenerate TypeScript types
   - Deploy functions automatically
   - Run database migrations

## Architecture Overview

### Schema (`convex/schema.ts`)

- **users**: Anonymous user tracking with display names and color themes
- **fireworks_active**: Currently visible fireworks (with TTL via `expiresAt`)
- **fireworks_history**: Archive of all launched fireworks for stats/replay

### Functions

#### User Management (`convex/users.ts`)

- `getOrCreateUser`: Bootstrap anonymous user on first visit
- `updateDisplayName`: Update user's display name
- `getUser`: Retrieve user data

#### Fireworks (`convex/fireworks.ts`)

- `launchFirework`: Create new firework (with rate limiting: 30/min per user)
- `getActiveFireworks`: Query all active fireworks (reactive subscription)
- `cleanupExpiredFireworks`: Remove expired fireworks (called by cron)
- `getStats`: Get active and total firework counts

### Cron Jobs (`convex/crons.ts`)

- Cleanup expired fireworks every 30 seconds

## Data Flow

1. **User Bootstrap**: On page load, generate/retrieve localStorage `anonymousId` → call `getOrCreateUser` mutation
2. **Launch Firework**: User gesture detected → call `launchFirework` mutation with position, hand count, velocity
3. **Real-time Sync**: `getActiveFireworks` query subscription pushes updates to all connected clients
4. **Animation**: Client renders fireworks based on `launchedAt` timestamp and `duration`
5. **Cleanup**: Cron job periodically removes expired fireworks from `fireworks_active` table

## Rate Limiting

- Max 30 fireworks per user per minute
- Enforced server-side in `launchFirework` mutation
- Returns error if limit exceeded

## Next Steps

Once `npx convex dev` is running and types are generated:

- Implement fireworks route UI (`src/routes/fireworks.tsx`)
- Add gesture detection component
- Build animation loop with Canvas/WebGL
- Test real-time synchronization across multiple browser tabs
