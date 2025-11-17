# Fireworks Route Testing Guide

## Quick Start Testing

### Prerequisites

1. Ensure Convex dev server is running:

   ```bash
   npx convex dev
   ```

2. Ensure TanStack dev server is running:

   ```bash
   npm run dev
   ```

3. Open browser to http://localhost:3000

## Test Scenarios

### 1. Basic Functionality ✅

**Test: Navigate to Fireworks Route**

- Click "Fireworks" link in navigation
- ✅ URL should be `/fireworks`
- ✅ Page should show "🎆 Fireworks" heading
- ✅ Instructions: "Click or tap anywhere on the canvas to launch fireworks!"
- ✅ Black canvas should be visible (600px height)
- ✅ Stats should show "Active: 0, Total Launched: 0" (or current counts)

**Test: Launch Single Firework**

- Click anywhere on the canvas
- ✅ Firework particles should appear at click location
- ✅ Particles should animate outward/upward based on effect type
- ✅ Particles should fade and disappear after ~3 seconds
- ✅ Stats "Active" count should increment then decrement
- ✅ Stats "Total Launched" should increment permanently

**Test: Launch Multiple Fireworks**

- Click rapidly in different canvas locations (5-10 times)
- ✅ Multiple fireworks should render simultaneously
- ✅ Each firework should have distinct animation
- ✅ Stats "Active" count should reflect number of visible fireworks
- ✅ All fireworks should expire independently after their duration

### 2. Real-Time Synchronization ✅

**Test: Multi-Tab Sync**

- Open browser tab A at `/fireworks`
- Open browser tab B at `/fireworks` (separate window or incognito)
- Launch firework in tab A
- ✅ Firework should appear in tab B within ~100ms
- Launch firework in tab B
- ✅ Firework should appear in tab A within ~100ms
- ✅ Stats should match across both tabs

**Test: Different User Colors**

- Open tab A in normal browser (User1)
- Open tab B in incognito (User2)
- Launch fireworks from both tabs
- ✅ Fireworks should have different colors (each user's theme)
- ✅ Both users see both fireworks in real-time
- ✅ Each user's fireworks maintain their assigned color

### 3. User Bootstrap & Persistence ✅

**Test: First Visit User Creation**

- Open browser DevTools → Application → Local Storage
- Clear all localStorage entries with "fireworks\_" prefix
- Refresh page, navigate to `/fireworks`
- ✅ New `fireworks_anonymous_id` should be created
- ✅ Format: `anon_{timestamp}_{random}`
- ✅ New `fireworks_display_name` should be created
- ✅ Format: `User{random}` (e.g., "User742")

**Test: Returning User Persistence**

- Launch a firework, note the color
- Refresh the page
- ✅ Same `fireworks_anonymous_id` in localStorage
- ✅ Same user color theme (fireworks same color)
- ✅ No new user created in database
- Launch another firework
- ✅ Same color as before refresh

### 4. Rate Limiting ✅

**Test: Rate Limit Enforcement**

- Open browser console
- Rapid-click canvas 35 times quickly
- ✅ First 30 fireworks should launch successfully
- ✅ After 30, console error: "Rate limit exceeded. Please wait before launching more fireworks."
- ✅ UI should not show new fireworks after limit
- Wait 60 seconds
- Click canvas again
- ✅ New firework should launch (rate limit reset)

### 5. Animation & Effects ✅

**Test: Different Effect Types**

- Launch 10+ fireworks by clicking around canvas
- ✅ Should see variety of effect types:
  - **Burst**: Radial explosion in all directions
  - **Fountain**: Upward spray
  - **Sparkle**: Small scattered movements
  - **Cascade**: Falling waterfall
- ✅ Each effect should look distinct
- ✅ Particles should have smooth physics (gravity, friction)

**Test: Canvas Fade Effect**

- Launch a firework
- Watch particles move
- ✅ Should see "trail" effect behind particles
- ✅ Trails should fade gradually (not instant clear)
- ✅ Canvas should return to full black after firework expires

**Test: Canvas Resize**

- Launch a firework
- Resize browser window
- ✅ Canvas should adjust to new width
- ✅ Existing fireworks should continue animating
- ✅ New clicks should work at correct coordinates
- ✅ No distortion or stretching

### 6. Performance ✅

**Test: Many Fireworks**

- Rapid-click canvas 20 times (stay under rate limit by spacing slightly)
- ✅ All 20 fireworks should render smoothly
- ✅ Frame rate should stay ~60fps (check Chrome DevTools Performance)
- ✅ No visible lag or stuttering
- ✅ Memory usage should be reasonable (<100MB increase)

**Test: Long Session**

- Launch fireworks periodically for 5 minutes
- ✅ No memory leaks (memory should stabilize, not grow linearly)
- ✅ Animation should remain smooth
- ✅ Stats should remain accurate

### 7. Error Handling 🔶

**Test: Network Disconnection**

- Open DevTools → Network tab
- Set throttling to "Offline"
- Try to launch firework
- ⚠️ Currently: Error only in console (no user-facing message)
- 📝 Future: Should show toast notification (Step 8)

**Test: Invalid User State**

- Manually delete `fireworks_anonymous_id` from localStorage while on page
- Try to launch firework
- ⚠️ Currently: May fail silently
- 📝 Future: Should re-bootstrap user or show error (Step 8)

## Browser Testing

### Desktop Browsers ✅

- [ ] Chrome (primary target)
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Mobile Browsers ✅

- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)
- [ ] Samsung Internet

### Expected Mobile Behavior

- Tap instead of click
- Touch gestures should launch fireworks
- Canvas should be responsive to screen width
- No zoom on tap (prevented by `touchAction: "none"`)

## Developer Testing

### Console Testing

**Check localStorage**

```javascript
// User ID
localStorage.getItem("fireworks_anonymous_id");
// Expected: "anon_1731665432123_abc123xyz"

// Display name
localStorage.getItem("fireworks_display_name");
// Expected: "User742"
```

**Manual Mutation**

```javascript
// Get Convex client (if accessible)
const convex = window.__convexClient;
// Note: May not be exposed; use Convex dashboard instead
```

### Convex Dashboard Testing

1. Open Convex dashboard: http://127.0.0.1:6790/?d=anonymous-tss-fireworks

2. **Test getActiveFireworks Query**
   - Select "fireworks" module
   - Run `getActiveFireworks` with `{}`
   - Should return array of active fireworks
   - Launch firework in UI, re-run query
   - New firework should appear in results

3. **Test getStats Query**
   - Run `getStats` with `{}`
   - Should return `{ active: N, total: M }`
   - Launch firework, re-run
   - Counts should increment

4. **Test launchFirework Mutation**
   - Get a valid user ID from `users` table
   - Run `launchFirework` with:
     ```json
     {
       "userId": "j971234abcd",
       "handCount": 1,
       "positionX": 0.5,
       "positionY": 0.5,
       "velocityX": 0.1,
       "velocityY": 1.0,
       "effectType": "burst"
     }
     ```
   - Firework should appear in all connected browser tabs
   - Verify in `fireworks_active` and `fireworks_history` tables

5. **Test Rate Limiting**
   - Run `launchFirework` mutation 31 times rapidly
   - 31st mutation should throw error: "Rate limit exceeded"

### React Query Devtools

1. Ensure React Query Devtools is visible (should be in UI)
2. Navigate to `/fireworks`
3. ✅ Should see active queries:
   - `["fireworks","getActiveFireworks",{}]`
   - `["fireworks","getStats",{}]`
4. Launch firework
5. ✅ Queries should show "fetching" briefly, then "fresh"
6. ✅ Data should update in devtools panel

## Regression Testing

### After Code Changes

- [ ] All fireworks still render
- [ ] Real-time sync still works
- [ ] User bootstrap still persists
- [ ] Rate limiting still enforced
- [ ] Stats still accurate
- [ ] Canvas resize still works
- [ ] No new TypeScript errors
- [ ] No new console errors

### After Schema Changes

- [ ] Re-run `npx convex dev` to regenerate types
- [ ] Verify type changes didn't break components
- [ ] Test backwards compatibility (if data exists)

### After Deployment

- [ ] Update `VITE_CONVEX_URL` to production URL
- [ ] Test from production domain
- [ ] Verify WebSocket connection works (check browser DevTools → Network → WS)
- [ ] Test rate limiting with production database

## Known Issues & Workarounds

### Issue: User Bootstrap Race Condition

**Symptom**: First firework launch may fail if user not fully initialized
**Workaround**: Page shows "Initializing..." until user ready
**Fix**: Already implemented with `isInitialized` state

### Issue: No Error Feedback in UI

**Symptom**: Mutations errors only logged to console
**Workaround**: Check browser console for errors
**Fix**: Coming in Step 8 (error boundaries)

### Issue: Fixed Particle Count

**Symptom**: Burst effect always creates 100 particles
**Workaround**: Acceptable for current implementation
**Enhancement**: Could vary by handCount in future (Step 6)

## Accessibility Testing 🔶

### Current State

- ⚠️ No keyboard navigation (mouse/touch only)
- ⚠️ No screen reader support
- ⚠️ No reduced motion option

### Future Enhancements (Step 6)

- [ ] Spacebar to launch firework at random position
- [ ] Arrow keys to move launch position
- [ ] Enter to confirm launch
- [ ] `prefers-reduced-motion` detection
- [ ] Simpler animation mode for reduced motion

## Success Criteria Summary

### MVP Complete ✅

- [x] Route accessible and navigation works
- [x] Canvas renders and accepts clicks
- [x] Fireworks launch and animate
- [x] Real-time sync across multiple tabs
- [x] User bootstrap persists across sessions
- [x] Rate limiting enforced
- [x] Stats display accurately
- [x] No TypeScript errors
- [x] Performance acceptable (60fps with 20 fireworks)

### Future Enhancements 📝

- [ ] Gesture detection (Step 6)
- [ ] Display name editor (Step 7)
- [ ] Error boundaries (Step 8)
- [ ] Enhanced animations (Step 9)
- [ ] Logging middleware (Step 10)

---

## Quick Smoke Test Checklist

Before considering this feature "done", verify:

1. ✅ Navigate to `/fireworks` without error
2. ✅ Click canvas, see firework appear
3. ✅ Open second tab, see fireworks sync
4. ✅ Refresh page, user ID persists
5. ✅ Rapid-click 30+ times, see rate limit
6. ✅ Stats display and update correctly
7. ✅ No console errors (except rate limit error is expected)
8. ✅ Canvas animation smooth at 60fps

If all 8 pass → **Step 5 is complete!** 🎆
