export { useGestureDetection } from "./useGestureDetection";
export type {
  DetectedHand,
  GestureDetectionOptions,
} from "./useGestureDetection";

export { useWebcam } from "./useWebcam";
export type { WebcamOptions } from "./useWebcam";

// Re-export gesture state management utilities
export {
  useGestureStateManager,
  GestureStateManager,
} from "../utils/gestureTransitions";
export type {
  HandState,
  GestureTransition,
  GestureStateManagerOptions,
  UseGestureStateManagerOptions,
} from "../utils/gestureTransitions";
