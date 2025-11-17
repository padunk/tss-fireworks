/**
 * Gesture State Manager Example
 *
 * This example demonstrates how to use the gesture detection system
 * to detect "Closed_Fist" → "Open_Palm" transitions for launching fireworks.
 */

import { useGestureDetection, useGestureStateManager } from "../hooks";
import type { GestureTransition } from "../utils/gestureTransitions";

export function GestureExample() {
  // 1. Set up gesture state manager with callback
  const { processHands, getAllHandStates, isHandInGesture } =
    useGestureStateManager({
      debounceMs: 500, // Wait 500ms between transitions
      transitionPattern: {
        from: "Closed_Fist",
        to: "Open_Palm",
      },
      onFistToPalm: (transition: GestureTransition) => {
        console.log(`🎆 Firework launched from ${transition.handedness} hand!`);
        console.log(
          `Position: x=${transition.position.x}, y=${transition.position.y}`
        );

        // Here you would call your launchFirework mutation:
        // launchFirework({
        //   userId,
        //   handCount: 1,
        //   positionX: transition.position.x,
        //   positionY: transition.position.y,
        // });
      },
    });

  // 2. Set up gesture detection with the state manager
  const { detectedHands, isInitialized, error, hasPermission } =
    useGestureDetection({
      enabled: true,
      numHands: 2,
      onGestureDetected: (hands) => {
        // Process detected hands through state manager
        const transitions = processHands(hands);

        // Transitions are also handled by the callback above,
        // but you can handle them here too if needed
        if (transitions.length > 0) {
          console.log("Transitions detected:", transitions);
        }
      },
    });

  // Get current hand states for UI display
  const handStates = getAllHandStates();

  return (
    <div>
      <h2>Gesture Detection Status</h2>
      <p>Initialized: {isInitialized ? "✅" : "⏳"}</p>
      <p>Camera Permission: {hasPermission ? "✅" : "❌"}</p>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <h3>Detected Hands</h3>
      {detectedHands.map((hand, idx) => (
        <div key={idx}>
          <strong>{hand.handedness} Hand:</strong> {hand.gesture} (
          {(hand.confidence * 100).toFixed(1)}%)
        </div>
      ))}

      <h3>Hand States</h3>
      {handStates.map((state, idx) => (
        <div key={idx}>
          <strong>{state.handedness}:</strong> {state.currentGesture}
          {state.previousGesture && ` (was: ${state.previousGesture})`}
        </div>
      ))}

      <h3>Ready to Launch</h3>
      <p>
        Left hand ready: {isHandInGesture("Left", "Closed_Fist") ? "✊" : "👋"}
      </p>
      <p>
        Right hand ready:{" "}
        {isHandInGesture("Right", "Closed_Fist") ? "✊" : "👋"}
      </p>
    </div>
  );
}

/**
 * How it works:
 *
 * 1. useGestureStateManager creates a state manager that:
 *    - Tracks each hand (Left/Right) separately
 *    - Remembers the last gesture for each hand
 *    - Detects when "Closed_Fist" → "Open_Palm" transition occurs
 *    - Debounces transitions (500ms by default)
 *    - Stores the position where the fist was closed (for launch origin)
 *
 * 2. useGestureDetection:
 *    - Initializes MediaPipe GestureRecognizer
 *    - Accesses webcam
 *    - Detects hands and gestures in real-time
 *    - Calls onGestureDetected callback with detected hands
 *
 * 3. processHands:
 *    - Takes detected hands from gesture detection
 *    - Updates state for each hand
 *    - Returns any transitions that occurred
 *    - Triggers onFistToPalm callback when transition detected
 *
 * 4. When a user:
 *    - Closes their fist: State manager records "Closed_Fist" and position
 *    - Opens their palm: State manager detects transition and triggers callback
 *    - The callback receives the position where the fist was closed
 *    - You can then launch a firework at that position!
 */
