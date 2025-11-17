## Plan: Real-Time Fireworks with Convex + TanStack Start

Build a multi-user live fireworks page: Convex handles real-time event storage & streaming; TanStack Start routes, loaders, and suspense manage structure, hydration, and error boundaries. Gesture/mutation launches create firework records; queries stream active fireworks to all clients for synchronized animation.

### Steps

1. Install Convex deps; add Convex client/provider in `src/routes/__root.tsx`.
2. Design Convex schema: `users`, `fireworks_active`, `fireworks_history` with TTL cleanup.
3. Implement Convex mutations: `launchFirework(handCount, position, style)` + rate limiting.
4. Implement Convex queries: `activeFireworks()` reactive stream; server timestamp normalization.
5. Create `src/routes/fireworks.tsx` route: loader prefetch + live subscription + canvas renderer.
6. Add gesture detection (MediaPipe hands or touch/mouse) in `FireworksCanvas` → call mutation.
7. Add anonymous user bootstrap (localStorage ID) + optional display name mutation.
8. Integrate `zod` input validation and map errors to existing `PostError`/`UserError` boundaries.
9. Add client-side animation loop with reconciliation (expire fireworks after duration).
10. Extend `loggingMiddleware.tsx` for Convex mutation/query timing instrumentation.

### Further Considerations

1. Auth path: Anonymous now; later Clerk/Auth0? Option A: keep simple; B: add provider.
2. Hand tracking: MediaPipe (better) vs. simple pointer swipe fallback—pick based on time.
3. Cleanup strategy: TTL vs. scheduled archival—choose simplicity (Convex cron) first.
4. Performance: Consider batching rapid launches; dedupe near-identical events.
5. Visual layer: Choose rendering tech (Canvas 2D first; upgrade to WebGL/Three.js if time).
6. Accessibility: Provide keyboard trigger (spacebar launches) & reduced motion toggle.
7. Observability: Simple metrics (launch count, active fireworks) surfaced in devtools.
8. SEO: Minimal; dynamic social card optional.
