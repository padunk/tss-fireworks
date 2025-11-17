import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { a as api } from "./router-DC6Zm_D8.js";
import { useState, useRef, useCallback, useEffect } from "react";
import { Fireworks } from "@fireworks-js/react";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import "@tanstack/react-router";
import "@tanstack/react-router-with-query";
import "convex/react";
import "@tanstack/react-router-devtools";
import "convex/server";
import "../server.js";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core";
import "node:async_hooks";
import "@tanstack/router-core/ssr/server";
import "h3-v2";
import "tiny-invariant";
import "seroval";
import "@tanstack/react-router/ssr/server";
function useGestureDetection(options = {}) {
  const {
    enabled = true,
    numHands = 2,
    minHandDetectionConfidence = 0.7,
    minTrackingConfidence = 0.5,
    categoryAllowlist = ["Closed_Fist", "Open_Palm"],
    onGestureDetected
  } = options;
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [detectedHands, setDetectedHands] = useState([]);
  const [hasPermission, setHasPermission] = useState(null);
  const gestureRecognizerRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const initializeGestureRecognizer = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const gestureRecognizer = await GestureRecognizer.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands,
          minHandDetectionConfidence,
          minTrackingConfidence,
          cannedGesturesClassifierOptions: {
            categoryAllowlist
          }
        }
      );
      gestureRecognizerRef.current = gestureRecognizer;
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initialize gesture recognizer";
      setError(errorMessage);
      console.error("Gesture recognizer initialization error:", err);
    }
  }, [
    numHands,
    minHandDetectionConfidence,
    minTrackingConfidence,
    categoryAllowlist
  ]);
  const setupWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        }
      });
      streamRef.current = stream;
      setHasPermission(true);
      setError(null);
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
      const errorMessage = err instanceof Error ? err.message : "Failed to access camera";
      setError(errorMessage);
      setHasPermission(false);
      console.error("Webcam setup error:", err);
      return false;
    }
  }, []);
  const detectGestures = useCallback(() => {
    if (!gestureRecognizerRef.current || !videoRef.current || videoRef.current.readyState !== 4) {
      return;
    }
    const now = performance.now();
    if (now - lastDetectionTimeRef.current < 33) {
      animationFrameRef.current = requestAnimationFrame(detectGestures);
      return;
    }
    lastDetectionTimeRef.current = now;
    try {
      const result = gestureRecognizerRef.current.recognizeForVideo(videoRef.current, now);
      const hands = [];
      if (result.gestures && result.gestures.length > 0) {
        for (let i = 0; i < result.gestures.length; i++) {
          const gesture = result.gestures[i][0];
          const handedness = result.handedness[i][0];
          const landmarks = result.landmarks[i];
          if (gesture && handedness && landmarks) {
            const centerX = landmarks.reduce((sum, lm) => sum + lm.x, 0) / landmarks.length;
            const centerY = landmarks.reduce((sum, lm) => sum + lm.y, 0) / landmarks.length;
            hands.push({
              handedness: handedness.categoryName,
              gesture: gesture.categoryName,
              confidence: gesture.score,
              landmarks: landmarks.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z })),
              centerPosition: { x: centerX, y: centerY }
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
  useEffect(() => {
    if (!enabled) return;
    const init = async () => {
      await initializeGestureRecognizer();
      const webcamReady = await setupWebcam();
      if (webcamReady) {
        detectGestures();
      }
    };
    init();
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
    videoElement: videoRef.current
  };
}
class GestureStateManager {
  handStates = /* @__PURE__ */ new Map();
  debounceMs;
  transitionPattern;
  onTransition;
  constructor(options = {}) {
    this.debounceMs = options.debounceMs ?? 500;
    this.transitionPattern = options.transitionPattern ?? {
      from: "Closed_Fist",
      to: "Open_Palm"
    };
    this.onTransition = options.onTransition;
  }
  /**
   * Update hand states with newly detected hands
   */
  update(detectedHands) {
    const transitions = [];
    const currentHandKeys = /* @__PURE__ */ new Set();
    const now = Date.now();
    for (const hand of detectedHands) {
      const handKey = hand.handedness;
      currentHandKeys.add(handKey);
      const existingState = this.handStates.get(handKey);
      const newGesture = hand.gesture;
      const newPosition = hand.centerPosition;
      if (!existingState) {
        this.handStates.set(handKey, {
          handedness: hand.handedness,
          currentGesture: newGesture,
          previousGesture: "",
          position: newPosition,
          lastTransitionTime: now,
          confidence: hand.confidence
        });
      } else {
        if (newGesture !== existingState.currentGesture) {
          const isTargetTransition = existingState.currentGesture === this.transitionPattern.from && newGesture === this.transitionPattern.to;
          const timeSinceLastTransition = now - existingState.lastTransitionTime;
          const isDebounced = timeSinceLastTransition >= this.debounceMs;
          if (isTargetTransition && isDebounced) {
            const transition = {
              handedness: hand.handedness,
              fromGesture: existingState.currentGesture,
              toGesture: newGesture,
              position: existingState.position,
              // Use position where fist was closed
              timestamp: now
            };
            transitions.push(transition);
            if (this.onTransition) {
              this.onTransition(transition);
            }
          }
          this.handStates.set(handKey, {
            handedness: hand.handedness,
            currentGesture: newGesture,
            previousGesture: existingState.currentGesture,
            position: newPosition,
            lastTransitionTime: isTargetTransition ? now : existingState.lastTransitionTime,
            confidence: hand.confidence
          });
        } else {
          this.handStates.set(handKey, {
            ...existingState,
            position: newPosition,
            confidence: hand.confidence
          });
        }
      }
    }
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
  getHandState(handedness) {
    return this.handStates.get(handedness);
  }
  /**
   * Get all current hand states
   */
  getAllHandStates() {
    return Array.from(this.handStates.values());
  }
  /**
   * Check if a hand is currently in a specific gesture
   */
  isHandInGesture(handedness, gesture) {
    const state = this.handStates.get(handedness);
    return state?.currentGesture === gesture;
  }
  /**
   * Reset all hand states
   */
  reset() {
    this.handStates.clear();
  }
  /**
   * Update debounce time
   */
  setDebounceMs(ms) {
    this.debounceMs = ms;
  }
  /**
   * Update transition pattern
   */
  setTransitionPattern(from, to) {
    this.transitionPattern = { from, to };
  }
}
function useGestureStateManager(options = {}) {
  const managerRef = useRef(null);
  if (!managerRef.current) {
    managerRef.current = new GestureStateManager({
      debounceMs: options.debounceMs,
      transitionPattern: options.transitionPattern,
      onTransition: options.onFistToPalm || options.onTransition
    });
  }
  const processHands = useCallback(
    (detectedHands) => {
      if (!managerRef.current) return [];
      return managerRef.current.update(detectedHands);
    },
    []
  );
  const getHandState = useCallback((handedness) => {
    return managerRef.current?.getHandState(handedness);
  }, []);
  const getAllHandStates = useCallback(() => {
    return managerRef.current?.getAllHandStates() ?? [];
  }, []);
  const isHandInGesture = useCallback(
    (handedness, gesture) => {
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
    manager: managerRef.current
  };
}
function FireworksPage() {
  const [userId, setUserId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [gestureMode, setGestureMode] = useState(false);
  const {
    data: fireworks = [],
    isPending
  } = useQuery({
    ...convexQuery(api.fireworks.getActiveFireworks, {}),
    initialData: []
  });
  const {
    data: stats
  } = useQuery({
    ...convexQuery(api.fireworks.getStats, {})
  });
  const {
    mutate: createUser
  } = useMutation({
    mutationFn: useConvexMutation(api.users.getOrCreateUser),
    onSuccess: (id) => {
      setUserId(id);
      setIsInitialized(true);
    },
    onError: (error) => {
      console.error("Failed to bootstrap user:", error);
    }
  });
  useEffect(() => {
    let anonymousId = localStorage.getItem("fireworks_anonymous_id");
    if (!anonymousId) {
      anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("fireworks_anonymous_id", anonymousId);
    }
    const displayName = localStorage.getItem("fireworks_display_name") || `User${Math.floor(Math.random() * 1e3)}`;
    createUser({
      anonymousId,
      displayName
    });
  }, []);
  return /* @__PURE__ */ jsxs("div", { className: "p-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold mb-2", children: "🎆 Fireworks" }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-600 mb-4", children: gestureMode ? "Close your fist and open your palm to launch fireworks! ✊➡️🖐️" : "Click or tap anywhere on the canvas to launch fireworks!" }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-4 items-center mb-4", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setGestureMode(!gestureMode), className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors", children: gestureMode ? "Switch to Click Mode" : "Switch to Gesture Mode" }),
        stats && /* @__PURE__ */ jsxs("div", { className: "flex gap-4 text-sm", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "Active:" }),
            " ",
            stats.active
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "Total Launched:" }),
            " ",
            stats.total
          ] })
        ] })
      ] })
    ] }),
    isPending && /* @__PURE__ */ jsx("div", { className: "text-center py-8", children: "Loading fireworks..." }),
    isInitialized && userId ? /* @__PURE__ */ jsx(FireworksCanvas, { userId, fireworks, gestureMode }) : /* @__PURE__ */ jsx("div", { className: "text-center py-8", children: "Initializing..." })
  ] });
}
function FireworksCanvas({
  userId,
  fireworks,
  gestureMode
}) {
  const fireworksRef = useRef(null);
  const processedFireworksRef = useRef(/* @__PURE__ */ new Set());
  const containerRef = useRef(null);
  const {
    mutate: launchFirework
  } = useMutation({
    mutationFn: useConvexMutation(api.fireworks.launchFirework)
  });
  const {
    processHands,
    getAllHandStates
  } = useGestureStateManager({
    debounceMs: 500,
    onFistToPalm: (transition) => {
      console.log(`🎆 Firework launched from ${transition.handedness} hand!`);
      launchFirework({
        userId,
        handCount: 1,
        positionX: transition.position.x,
        positionY: transition.position.y,
        velocityX: 0,
        velocityY: 1
      });
    }
  });
  const {
    detectedHands,
    isInitialized,
    error,
    hasPermission,
    videoElement
  } = useGestureDetection({
    enabled: gestureMode,
    numHands: 2,
    onGestureDetected: (hands) => {
      processHands(hands);
    }
  });
  const handStates = getAllHandStates();
  const handleCanvasClick = (event) => {
    if (gestureMode) return;
    const container = event.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    launchFirework({
      userId,
      handCount: 1,
      positionX: x,
      positionY: y,
      velocityX: (Math.random() - 0.5) * 0.5,
      velocityY: 1
    });
  };
  useEffect(() => {
    if (!fireworksRef.current) return;
    fireworks.forEach((firework) => {
      if (!processedFireworksRef.current.has(firework._id)) {
        const launchCount = firework.effectType === "burst" ? 3 : 1;
        fireworksRef.current?.launch(launchCount);
        processedFireworksRef.current.add(firework._id);
      }
    });
    const activeIds = new Set(fireworks.map((f) => f._id));
    const expiredIds = Array.from(processedFireworksRef.current).filter((id) => !activeIds.has(id));
    expiredIds.forEach((id) => processedFireworksRef.current.delete(id));
  }, [fireworks]);
  return /* @__PURE__ */ jsxs("div", { ref: containerRef, onClick: handleCanvasClick, className: "relative w-full h-[600px] bg-black rounded-lg overflow-hidden", style: {
    touchAction: "none",
    cursor: gestureMode ? "default" : "crosshair"
  }, children: [
    /* @__PURE__ */ jsx(Fireworks, { ref: fireworksRef, autostart: false, options: {
      opacity: 0.5,
      acceleration: 1.05,
      friction: 0.97,
      gravity: 1.5,
      particles: 50,
      traceLength: 3,
      traceSpeed: 10,
      explosion: 5,
      intensity: 30,
      flickering: 50,
      lineStyle: "round",
      hue: {
        min: 0,
        max: 360
      },
      delay: {
        min: 30,
        max: 60
      },
      rocketsPoint: {
        min: 50,
        max: 50
      },
      lineWidth: {
        explosion: {
          min: 1,
          max: 3
        },
        trace: {
          min: 1,
          max: 2
        }
      },
      brightness: {
        min: 50,
        max: 80
      },
      decay: {
        min: 0.015,
        max: 0.03
      },
      mouse: {
        click: false,
        move: false,
        max: 1
      }
    }, style: {
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      position: "absolute"
    } }),
    gestureMode && /* @__PURE__ */ jsxs(Fragment, { children: [
      videoElement && /* @__PURE__ */ jsx("div", { className: "absolute top-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white/30 bg-black/50", children: /* @__PURE__ */ jsx("video", { ref: (el) => {
        if (el && videoElement) {
          el.srcObject = videoElement.srcObject;
          el.play();
        }
      }, autoPlay: true, playsInline: true, muted: true, className: "w-full h-full object-cover transform scale-x-[-1]" }) }),
      /* @__PURE__ */ jsx("div", { className: "absolute bottom-4 left-4 right-4 bg-black/70 text-white rounded-lg p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
          error && /* @__PURE__ */ jsxs("div", { className: "text-red-400 text-sm mb-2", children: [
            "❌ ",
            error
          ] }),
          !isInitialized && !error && /* @__PURE__ */ jsx("div", { className: "text-yellow-400 text-sm", children: "⏳ Initializing gesture detection..." }),
          hasPermission === false && /* @__PURE__ */ jsx("div", { className: "text-red-400 text-sm", children: "📷 Camera access denied. Please enable camera permissions." }),
          isInitialized && hasPermission && /* @__PURE__ */ jsx("div", { className: "flex gap-6 text-sm", children: detectedHands.length === 0 ? /* @__PURE__ */ jsx("div", { className: "text-gray-400", children: "👋 No hands detected" }) : detectedHands.map((hand, idx) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxs("span", { className: "font-semibold", children: [
              hand.handedness,
              ":"
            ] }),
            /* @__PURE__ */ jsx("span", { children: hand.gesture === "Closed_Fist" ? "✊" : "🖐️" }),
            /* @__PURE__ */ jsx("span", { className: "text-gray-300", children: hand.gesture.replace("_", " ") }),
            /* @__PURE__ */ jsxs("span", { className: "text-gray-400 text-xs", children: [
              "(",
              (hand.confidence * 100).toFixed(0),
              "%)"
            ] })
          ] }, idx)) })
        ] }),
        handStates.length > 0 && /* @__PURE__ */ jsx("div", { className: "flex gap-3 text-2xl", children: handStates.map((state, idx) => /* @__PURE__ */ jsx("div", { className: `transition-all ${state.currentGesture === "Closed_Fist" ? "scale-125 animate-pulse" : ""}`, title: `${state.handedness} hand: ${state.currentGesture}`, children: state.currentGesture === "Closed_Fist" ? "✊" : "🖐️" }, idx)) })
      ] }) })
    ] })
  ] });
}
export {
  FireworksPage as component
};
