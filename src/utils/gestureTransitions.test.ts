import { GestureStateManager } from "../utils/gestureTransitions";
import type { DetectedHand } from "../hooks/useGestureDetection";

/**
 * Test script to demonstrate GestureStateManager behavior
 * Run this in browser console or as a test
 */

export function testGestureStateManager() {
  console.log("🧪 Testing Gesture State Manager\n");

  let transitionCount = 0;

  // Create manager with callback
  const manager = new GestureStateManager({
    debounceMs: 500,
    transitionPattern: {
      from: "Closed_Fist",
      to: "Open_Palm",
    },
    onTransition: (transition) => {
      transitionCount++;
      console.log(
        `✨ Transition ${transitionCount}: ${transition.handedness} hand`,
        `from ${transition.fromGesture} to ${transition.toGesture}`,
        `at position (${transition.position.x.toFixed(2)}, ${transition.position.y.toFixed(2)})`
      );
    },
  });

  // Simulate detection sequence
  console.log("1️⃣ User closes right fist");
  const rightFist: DetectedHand = {
    handedness: "Right",
    gesture: "Closed_Fist",
    confidence: 0.95,
    landmarks: [],
    centerPosition: { x: 0.6, y: 0.4 },
  };
  manager.update([rightFist]);

  console.log("   Right hand state:", manager.getHandState("Right"));
  console.log("");

  console.log("2️⃣ User opens right palm (should trigger transition!)");
  const rightPalm: DetectedHand = {
    handedness: "Right",
    gesture: "Open_Palm",
    confidence: 0.92,
    landmarks: [],
    centerPosition: { x: 0.65, y: 0.42 },
  };
  const transitions = manager.update([rightPalm]);
  console.log(`   Transitions detected: ${transitions.length}`);
  console.log("   Right hand state:", manager.getHandState("Right"));
  console.log("");

  console.log("3️⃣ User keeps palm open (no transition)");
  manager.update([rightPalm]);
  console.log("   No new transitions (gesture unchanged)");
  console.log("");

  console.log("4️⃣ User closes fist again");
  manager.update([rightFist]);
  console.log("   Right hand state:", manager.getHandState("Right"));
  console.log("");

  console.log(
    "5️⃣ User tries to trigger again immediately (should be debounced)"
  );
  const transitions2 = manager.update([rightPalm]);
  console.log(`   Transitions detected: ${transitions2.length} (debounced!)`);
  console.log("");

  console.log("6️⃣ Wait 500ms and try again...");
  setTimeout(() => {
    console.log("   Time passed, closing fist");
    manager.update([rightFist]);

    setTimeout(() => {
      console.log("   Opening palm again");
      const transitions3 = manager.update([rightPalm]);
      console.log(
        `   Transitions detected: ${transitions3.length} (should work now!)`
      );
      console.log("");

      console.log("7️⃣ Test with both hands");
      const leftFist: DetectedHand = {
        handedness: "Left",
        gesture: "Closed_Fist",
        confidence: 0.88,
        landmarks: [],
        centerPosition: { x: 0.3, y: 0.5 },
      };

      manager.update([rightFist, leftFist]);
      console.log("   Both hands closed:");
      console.log("   All states:", manager.getAllHandStates());
      console.log("");

      const leftPalm: DetectedHand = {
        handedness: "Left",
        gesture: "Open_Palm",
        confidence: 0.91,
        landmarks: [],
        centerPosition: { x: 0.32, y: 0.52 },
      };

      console.log("   Opening both palms");
      const bothTransitions = manager.update([rightPalm, leftPalm]);
      console.log(
        `   Transitions: ${bothTransitions.length} (both hands should trigger!)`
      );
      console.log("");

      console.log("✅ Test complete!");
      console.log(`   Total transitions triggered: ${transitionCount}`);
    }, 100);
  }, 600);
}

// Uncomment to run test:
// testGestureStateManager();
