# Steps 1-4 Implementation Summary

## ✅ Completed Tasks

### 1. Convex Installation & Configuration

- ✅ Installed `convex` npm package
- ✅ Created `.env.local` with `VITE_CONVEX_URL` placeholder
- ✅ Initialized local Convex deployment (URL: `http://127.0.0.1:3210`)
- ✅ Generated TypeScript types in `convex/_generated/`

### 2. Schema Design (`convex/schema.ts`)

Defined three tables with proper indexes:

**users**

- Fields: `anonymousId`, `displayName`, `colorTheme`, `createdAt`
- Index: `by_anonymous_id` for quick user lookup
- Purpose: Track both anonymous and authenticated users

**fireworks_active**

- Fields: `userId`, `handCount`, `positionX/Y`, `velocityX/Y`, `color`, `effectType`, `launchedAt`, `duration`, `expiresAt`
- Indexes: `by_expires` (for cleanup), `by_user` (for rate limiting)
- Purpose: Real-time active fireworks with TTL expiration

**fireworks_history**

- Fields: `userId`, `handCount`, `positionX/Y`, `color`, `effectType`, `launchedAt`
- Indexes: `by_user`, `by_launched_at`
- Purpose: Archive for statistics and potential replay features

### 3. Mutations & Queries

**User Functions** (`convex/users.ts`):

- `getOrCreateUser`: Bootstrap anonymous users with random color themes
- `updateDisplayName`: Update user display name
- `getUser`: Fetch user data

**Firework Functions** (`convex/fireworks.ts`):

- `launchFirework`: Create firework with rate limiting (30/min per user)
  - Validates user exists
  - Assigns user's color theme
  - Randomly selects effect type if not specified
  - Archives to history table
- `getActiveFireworks`: Reactive query for all non-expired fireworks
- `cleanupExpiredFireworks`: Internal mutation for cron cleanup
- `getStats`: Get active/total firework counts

### 4. Provider Integration & Cron Setup

**Root Route** (`src/routes/__root.tsx`):

- ✅ Imported `ConvexProvider` and `ConvexReactClient`
- ✅ Created Convex client instance with `VITE_CONVEX_URL`
- ✅ Wrapped app children in `ConvexProvider`
- ✅ Added `/fireworks` link to navigation

**Cron Jobs** (`convex/crons.ts`):

- ✅ Scheduled cleanup every 30 seconds to remove expired fireworks
- ✅ Uses internal mutation for secure server-side execution

## Architecture Highlights

### Real-Time Data Flow

1. Client connects via WebSocket through `ConvexProvider`
2. `useQuery(api.fireworks.getActiveFireworks)` creates reactive subscription
3. Any mutation triggers automatic re-query for all subscribers
4. Client animations sync based on server `launchedAt` timestamp

### Rate Limiting Strategy

- Server-side enforcement: max 30 launches per user per 60 seconds
- Queries recent launches from last minute using indexed `by_user` query
- Returns error if limit exceeded (client can display toast/warning)

### Cleanup Strategy

- Fireworks have `expiresAt` field (launchedAt + duration)
- Cron job runs every 30 seconds
- Uses indexed query on `by_expires` for efficient cleanup
- Client filters expired fireworks client-side for immediate removal

## Files Created/Modified

### Created

- `/convex/schema.ts` - Database schema with 3 tables
- `/convex/users.ts` - User management functions (3 exports)
- `/convex/fireworks.ts` - Firework launch/query functions (4 exports)
- `/convex/crons.ts` - Scheduled cleanup job
- `/convex/tsconfig.json` - Convex TypeScript config
- `/.env.local` - Environment variables (needs manual URL update for cloud)
- `/CONVEX_SETUP.md` - Setup documentation

### Modified

- `/src/routes/__root.tsx` - Integrated ConvexProvider, added Fireworks nav link
- `/package.json` - Added `convex` dependency

## Next Steps (Steps 5-10)

**Step 5**: Create `/src/routes/fireworks.tsx` with:

- Loader for SSR prefetch of active fireworks
- `useQuery` for live subscription
- Canvas/WebGL renderer component
- User bootstrap logic (localStorage anonymousId)

**Step 6**: Implement gesture detection:

- Option A: MediaPipe Hands for actual hand tracking
- Option B: Touch/mouse swipe with velocity calculation
- Trigger `useMutation(api.fireworks.launchFirework)` on gesture

**Steps 7-8**: Add validation & user management:

- `zod` schemas for mutation inputs
- LocalStorage user ID persistence
- Display name input component
- Error boundary integration

**Step 9**: Animation loop:

- `requestAnimationFrame` for smooth rendering
- Particle systems for each effect type
- Reconciliation: diff query results vs rendered fireworks
- Remove fireworks after duration expires

**Step 10**: Logging instrumentation:

- Extend `loggingMiddleware.tsx` pattern
- Time mutation round-trips
- Optional: Query performance metrics in devtools

## How to Test Current Setup

1. **Start Convex dev server**:

   ```bash
   npx convex dev
   ```

2. **Start TanStack dev server** (separate terminal):

   ```bash
   npm run dev
   ```

3. **Verify in browser**:
   - App should load without ConvexProvider errors
   - Check browser console for WebSocket connection
   - Navigate to Convex dashboard: http://127.0.0.1:6790/?d=anonymous-tss-fireworks

4. **Test mutations** (via dashboard or browser console):

   ```js
   // In browser console (after provider loaded):
   // Create a user
   const userId = await convex.mutation(api.users.getOrCreateUser, {
     anonymousId: "test-123",
     displayName: "Test User",
   });

   // Launch a firework
   await convex.mutation(api.fireworks.launchFirework, {
     userId,
     handCount: 1,
     positionX: 0.5,
     positionY: 0.8,
   });

   // Query active fireworks
   const fireworks = await convex.query(api.fireworks.getActiveFireworks);
   console.log(fireworks);
   ```

## Leverage Points: Convex + TanStack Start

**What makes this stack powerful:**

1. **Type Safety End-to-End**
   - Convex generates TypeScript types from schema
   - TanStack Router provides route-level type safety
   - Full autocomplete from database → UI

2. **Real-Time by Default**
   - No WebSocket boilerplate
   - Automatic subscription management
   - Consistent multi-client state

3. **Server-Side Rendering**
   - TanStack loaders can prefetch Convex queries
   - Fast initial page load with hydrated data
   - SEO-friendly (if needed)

4. **Developer Experience**
   - Hot reload for both backend (Convex) and frontend (Vite)
   - Schema validation prevents runtime errors
   - Integrated dashboard for debugging

5. **Scalability**
   - Convex handles connection pooling, caching, query optimization
   - TanStack's file-based routing scales with features
   - Easy to split code by route/domain

**For this fireworks app specifically:**

- **Real-time sync**: All users see fireworks instantly via reactive queries
- **Rate limiting**: Server-enforced prevents spam/abuse
- **No polling**: WebSocket subscriptions are efficient
- **Automatic cleanup**: Cron jobs handle TTL without client intervention
- **Type-safe mutations**: Can't launch invalid firework data
- **Optimistic updates**: Could add for instant feedback (future enhancement)

Ready to proceed to Step 5 (fireworks route) when you give the signal! 🎆
