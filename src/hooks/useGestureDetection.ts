import { useEffect, useRef, useState, useCallback } from "react";
import {
  GestureRecognizer,
  FilesetResolver,
  GestureRecognizerResult,
} from "@mediapipe/tasks-vision";

export interface DetectedHand {
  handedness: "Left" | "Right";
  gesture: string;
  confidence: number;
  landmarks: Array<{ x: number; y: number; z: number }>;
  centerPosition: { x: number; y: number };
}

export interface GestureDetectionOptions {
  enabled?: boolean;
  numHands?: number;
  minHandDetectionConfidence?: number;
  minTrackingConfidence?: number;
  categoryAllowlist?: string[];
  onGestureDetected?: (hands: DetectedHand[]) => void;
}

export function useGestureDetection(options: GestureDetectionOptions = {}) {
  const {
    enabled = true,
    numHands = 2,
    minHandDetectionConfidence = 0.7,
    minTrackingConfidence = 0.5,
    categoryAllowlist = ["Closed_Fist", "Open_Palm"],
    onGestureDetected,
  } = options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedHands, setDetectedHands] = useState<DetectedHand[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);

  // Initialize GestureRecognizer
  const initializeGestureRecognizer = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      const gestureRecognizer = await GestureRecognizer.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands,
          minHandDetectionConfidence,
          minTrackingConfidence,
          cannedGesturesClassifierOptions: {
            categoryAllowlist,
          },
        }
      );

      gestureRecognizerRef.current = gestureRecognizer;
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to initialize gesture recognizer";
      setError(errorMessage);
      console.error("Gesture recognizer initialization error:", err);
    }
  }, [
    numHands,
    minHandDetectionConfidence,
    minTrackingConfidence,
    categoryAllowlist,
  ]);

  // Set up webcam video stream
  const setupWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      });

      streamRef.current = stream;
      setHasPermission(true);
      setError(null);

      // Create video element if it doesn't exist
      if (!videoRef.current) {
        const video = document.createElement("video");
        video.autoplay = true;
        video.playsInline = true;
        videoRef.current = video;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to access camera";
      setError(errorMessage);
      setHasPermission(false);
      console.error("Webcam setup error:", err);
      return false;
    }
  }, []);

  // Process video frame for gesture detection
  const detectGestures = useCallback(() => {
    if (
      !gestureRecognizerRef.current ||
      !videoRef.current ||
      videoRef.current.readyState !== 4
    ) {
      return;
    }

    const now = performance.now();

    // Throttle to ~30 FPS
    if (now - lastDetectionTimeRef.current < 33) {
      animationFrameRef.current = requestAnimationFrame(detectGestures);
      return;
    }

    lastDetectionTimeRef.current = now;

    try {
      const result: GestureRecognizerResult =
        gestureRecognizerRef.current.recognizeForVideo(videoRef.current, now);

      const hands: DetectedHand[] = [];

      if (result.gestures && result.gestures.length > 0) {
        for (let i = 0; i < result.gestures.length; i++) {
          const gesture = result.gestures[i][0]; // Top gesture
          const handedness = result.handedness[i][0];
          const landmarks = result.landmarks[i];

          if (gesture && handedness && landmarks) {
            // Calculate center position (use wrist landmark #0 or palm center)
            const centerX =
              landmarks.reduce((sum, lm) => sum + lm.x, 0) / landmarks.length;
            const centerY =
              landmarks.reduce((sum, lm) => sum + lm.y, 0) / landmarks.length;

            hands.push({
              handedness: handedness.categoryName as "Left" | "Right",
              gesture: gesture.categoryName,
              confidence: gesture.score,
              landmarks: landmarks.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z })),
              centerPosition: { x: centerX, y: centerY },
            });
          }
        }
      }

      setDetectedHands(hands);

      if (onGestureDetected && hands.length > 0) {
        onGestureDetected(hands);
      }
    } catch (err) {
      console.error("Gesture detection error:", err);
    }

    animationFrameRef.current = requestAnimationFrame(detectGestures);
  }, [onGestureDetected]);

  // Initialize everything when enabled
  useEffect(() => {
    if (!enabled) return;

    const init = async () => {
      await initializeGestureRecognizer();
      const webcamReady = await setupWebcam();

      if (webcamReady) {
        // Start detection loop
        detectGestures();
      }
    };

    init();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (gestureRecognizerRef.current) {
        gestureRecognizerRef.current.close();
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [enabled, initializeGestureRecognizer, setupWebcam, detectGestures]);

  return {
    isInitialized,
    error,
    detectedHands,
    hasPermission,
    videoElement: videoRef.current,
  };
}
