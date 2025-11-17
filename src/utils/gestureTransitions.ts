import type { DetectedHand } from "../hooks/useGestureDetection";

export interface HandState {
  handedness: "Left" | "Right";
  currentGesture: string;
  previousGesture: string;
  position: { x: number; y: number };
  lastTransitionTime: number;
  confidence: number;
}

export interface GestureTransition {
  handedness: "Left" | "Right";
  fromGesture: string;
  toGesture: string;
  position: { x: number; y: number };
  timestamp: number;
}

export interface GestureStateManagerOptions {
  debounceMs?: number;
  transitionPattern?: { from: string; to: string };
  onTransition?: (transition: GestureTransition) => void;
}

export class GestureStateManager {
  private handStates: Map<string, HandState> = new Map();
  private debounceMs: number;
  private transitionPattern: { from: string; to: string };
  private onTransition?: (transition: GestureTransition) => void;

  constructor(options: GestureStateManagerOptions = {}) {
    this.debounceMs = options.debounceMs ?? 500; // 500ms debounce by default
    this.transitionPattern = options.transitionPattern ?? {
      from: "Closed_Fist",
      to: "Open_Palm",
    };
    this.onTransition = options.onTransition;
  }

  /**
   * Update hand states with newly detected hands
   */
  update(detectedHands: DetectedHand[]): GestureTransition[] {
    const transitions: GestureTransition[] = [];
    const currentHandKeys = new Set<string>();
    const now = Date.now();

    // Process each detected hand
    for (const hand of detectedHands) {
      const handKey = hand.handedness;
      currentHandKeys.add(handKey);

      const existingState = this.handStates.get(handKey);
      const newGesture = hand.gesture;
      const newPosition = hand.centerPosition;

      if (!existingState) {
        // First time seeing this hand, initialize state
        this.handStates.set(handKey, {
          handedness: hand.handedness,
          currentGesture: newGesture,
          previousGesture: "",
          position: newPosition,
          lastTransitionTime: now,
          confidence: hand.confidence,
        });
      } else {
        // Check if gesture changed
        if (newGesture !== existingState.currentGesture) {
          // Check if this matches our transition pattern
          const isTargetTransition =
            existingState.currentGesture === this.transitionPattern.from &&
            newGesture === this.transitionPattern.to;

          // Check if enough time has passed (debounce)
          const timeSinceLastTransition =
            now - existingState.lastTransitionTime;
          const isDebounced = timeSinceLastTransition >= this.debounceMs;

          if (isTargetTransition && isDebounced) {
            // Valid transition detected!
            const transition: GestureTransition = {
              handedness: hand.handedness,
              fromGesture: existingState.currentGesture,
              toGesture: newGesture,
              position: existingState.position, // Use position where fist was closed
              timestamp: now,
            };

            transitions.push(transition);

            // Call callback if provided
            if (this.onTransition) {
              this.onTransition(transition);
            }
          }

          // Update state
          this.handStates.set(handKey, {
            handedness: hand.handedness,
            currentGesture: newGesture,
            previousGesture: existingState.currentGesture,
            position: newPosition,
            lastTransitionTime: isTargetTransition
              ? now
              : existingState.lastTransitionTime,
            confidence: hand.confidence,
          });
        } else {
          // Same gesture, just update position and confidence
          this.handStates.set(handKey, {
            ...existingState,
            position: newPosition,
            confidence: hand.confidence,
          });
        }
      }
    }

    // Clean up hands that are no longer detected
    for (const handKey of this.handStates.keys()) {
      if (!currentHandKeys.has(handKey)) {
        this.handStates.delete(handKey);
      }
    }

    return transitions;
  }

  /**
   * Get current state of a specific hand
   */
  getHandState(handedness: "Left" | "Right"): HandState | undefined {
    return this.handStates.get(handedness);
  }

  /**
   * Get all current hand states
   */
  getAllHandStates(): HandState[] {
    return Array.from(this.handStates.values());
  }

  /**
   * Check if a hand is currently in a specific gesture
   */
  isHandInGesture(handedness: "Left" | "Right", gesture: string): boolean {
    const state = this.handStates.get(handedness);
    return state?.currentGesture === gesture;
  }

  /**
   * Reset all hand states
   */
  reset(): void {
    this.handStates.clear();
  }

  /**
   * Update debounce time
   */
  setDebounceMs(ms: number): void {
    this.debounceMs = ms;
  }

  /**
   * Update transition pattern
   */
  setTransitionPattern(from: string, to: string): void {
    this.transitionPattern = { from, to };
  }
}

/**
 * React hook wrapper for GestureStateManager
 */
import { useRef, useCallback } from "react";

export interface UseGestureStateManagerOptions
  extends GestureStateManagerOptions {
  onFistToPalm?: (transition: GestureTransition) => void;
}

export function useGestureStateManager(
  options: UseGestureStateManagerOptions = {}
) {
  const managerRef = useRef<GestureStateManager | null>(null);

  // Initialize manager
  if (!managerRef.current) {
    managerRef.current = new GestureStateManager({
      debounceMs: options.debounceMs,
      transitionPattern: options.transitionPattern,
      onTransition: options.onFistToPalm || options.onTransition,
    });
  }

  const processHands = useCallback(
    (detectedHands: DetectedHand[]): GestureTransition[] => {
      if (!managerRef.current) return [];
      return managerRef.current.update(detectedHands);
    },
    []
  );

  const getHandState = useCallback((handedness: "Left" | "Right") => {
    return managerRef.current?.getHandState(handedness);
  }, []);

  const getAllHandStates = useCallback(() => {
    return managerRef.current?.getAllHandStates() ?? [];
  }, []);

  const isHandInGesture = useCallback(
    (handedness: "Left" | "Right", gesture: string) => {
      return managerRef.current?.isHandInGesture(handedness, gesture) ?? false;
    },
    []
  );

  const reset = useCallback(() => {
    managerRef.current?.reset();
  }, []);

  return {
    processHands,
    getHandState,
    getAllHandStates,
    isHandInGesture,
    reset,
    manager: managerRef.current,
  };
}
