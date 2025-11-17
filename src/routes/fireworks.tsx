import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { useEffect, useRef, useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { Fireworks } from "@fireworks-js/react";
import type { FireworksHandlers } from "@fireworks-js/react";
import { useGestureDetection, useGestureStateManager } from "../hooks";
import type { GestureTransition } from "../utils/gestureTransitions";

export const Route = createFileRoute("/fireworks")({
  loader: ({ context: { queryClient } }) => {
    // Prefetch active fireworks for SSR
    return queryClient.ensureQueryData({
      ...convexQuery(api.fireworks.getActiveFireworks, {}),
    });
  },
  component: FireworksPage,
});

function FireworksPage() {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [gestureMode, setGestureMode] = useState(false);

  // Live subscription to active fireworks
  const { data: fireworks = [], isPending } = useQuery({
    ...convexQuery(api.fireworks.getActiveFireworks, {}),
    initialData: [],
  });

  // Query stats
  const { data: stats } = useQuery({
    ...convexQuery(api.fireworks.getStats, {}),
  });

  // User bootstrap mutation
  const { mutate: createUser } = useMutation({
    mutationFn: useConvexMutation(api.users.getOrCreateUser),
    onSuccess: (id: Id<"users">) => {
      setUserId(id);
      setIsInitialized(true);
    },
    onError: (error) => {
      console.error("Failed to bootstrap user:", error);
    },
  });

  // User bootstrap effect
  useEffect(() => {
    // Get or create anonymousId from localStorage
    let anonymousId = localStorage.getItem("fireworks_anonymous_id");
    if (!anonymousId) {
      anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("fireworks_anonymous_id", anonymousId);
    }

    // Get display name from localStorage or generate one
    const displayName =
      localStorage.getItem("fireworks_display_name") ||
      `User${Math.floor(Math.random() * 1000)}`;

    // Bootstrap user
    createUser({ anonymousId, displayName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-3xl font-bold mb-2">🎆 VireWorks</h1>
        <p className="text-gray-600 mb-4">
          {gestureMode
            ? "Close your fist and open your palm to launch fireworks! ✊➡️🖐️"
            : "Click or tap anywhere on the canvas to launch fireworks!, you can see your friends fireworks too!"}
        </p>
        <div className="flex gap-4 items-center mb-4">
          {/* <button
            onClick={() => setGestureMode(!gestureMode)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {gestureMode ? "Switch to Click Mode" : "Switch to Gesture Mode"}
          </button> */}
          {stats && (
            <div className="flex gap-4 text-sm">
              <div>
                <span className="font-semibold">Active:</span> {stats.active}
              </div>
              <div>
                <span className="font-semibold">Total Launched:</span>{" "}
                {stats.total}
              </div>
            </div>
          )}
        </div>
      </div>

      {isPending && (
        <div className="text-center py-8">Loading fireworks...</div>
      )}

      {isInitialized && userId ? (
        <FireworksCanvas
          userId={userId}
          fireworks={fireworks}
          gestureMode={gestureMode}
        />
      ) : (
        <div className="text-center py-8">Initializing...</div>
      )}
    </div>
  );
}

interface FireworkData {
  _id: Id<"fireworks_active">;
  _creationTime: number;
  userId: Id<"users">;
  handCount: number;
  positionX: number;
  positionY: number;
  velocityX?: number;
  velocityY?: number;
  color: string;
  effectType: "burst" | "fountain" | "sparkle" | "cascade";
  launchedAt: number;
  duration: number;
  expiresAt: number;
}

interface FireworksCanvasProps {
  userId: Id<"users">;
  fireworks: FireworkData[];
  gestureMode: boolean;
}

function FireworksCanvas({
  userId,
  fireworks,
  gestureMode,
}: FireworksCanvasProps) {
  const fireworksRef = useRef<FireworksHandlers>(null);
  const processedFireworksRef = useRef<Set<Id<"fireworks_active">>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Launch firework mutation
  const { mutate: launchFirework } = useMutation({
    mutationFn: useConvexMutation(api.fireworks.launchFirework),
  });

  // Gesture state manager with transition callback
  const { processHands, getAllHandStates } = useGestureStateManager({
    debounceMs: 500,
    onFistToPalm: (transition: GestureTransition) => {
      console.log(`🎆 Firework launched from ${transition.handedness} hand!`);

      // Launch firework at the position where the fist was closed
      launchFirework({
        userId,
        handCount: 1,
        positionX: transition.position.x,
        positionY: transition.position.y,
        velocityX: 0,
        velocityY: 1,
      });
    },
  });

  // Gesture detection
  const { detectedHands, isInitialized, error, hasPermission, videoElement } =
    useGestureDetection({
      enabled: gestureMode,
      numHands: 2,
      onGestureDetected: (hands) => {
        // Process detected hands through state manager
        processHands(hands);
      },
    });

  // Get current hand states for UI display
  const handStates = getAllHandStates();

  // Handle canvas click/tap to launch firework (only when not in gesture mode)
  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (gestureMode) return; // Don't trigger on click in gesture mode

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
      velocityY: 1,
    });
  };

  // Effect to sync Convex fireworks with fireworks-js library
  useEffect(() => {
    if (!fireworksRef.current) return;

    // Launch fireworks for new entries
    fireworks.forEach((firework) => {
      if (!processedFireworksRef.current.has(firework._id)) {
        // Calculate number of launches based on effect type
        const launchCount = firework.effectType === "burst" ? 3 : 1;
        fireworksRef.current?.launch(launchCount);
        processedFireworksRef.current.add(firework._id);
      }
    });

    // Clean up expired fireworks from our tracking
    const activeIds = new Set(fireworks.map((f) => f._id));
    const expiredIds = Array.from(processedFireworksRef.current).filter(
      (id) => !activeIds.has(id)
    );
    expiredIds.forEach((id) => processedFireworksRef.current.delete(id));
  }, [fireworks]);

  return (
    <div
      ref={containerRef}
      onClick={handleCanvasClick}
      className="relative w-full h-[600px] bg-black rounded-lg overflow-hidden"
      style={{
        touchAction: "none",
        cursor: gestureMode ? "default" : "crosshair",
      }}
    >
      {/* Fireworks canvas */}
      <Fireworks
        ref={fireworksRef}
        autostart={false}
        options={{
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
            max: 360,
          },
          delay: {
            min: 30,
            max: 60,
          },
          rocketsPoint: {
            min: 50,
            max: 50,
          },
          lineWidth: {
            explosion: {
              min: 1,
              max: 3,
            },
            trace: {
              min: 1,
              max: 2,
            },
          },
          brightness: {
            min: 50,
            max: 80,
          },
          decay: {
            min: 0.015,
            max: 0.03,
          },
          mouse: {
            click: false,
            move: false,
            max: 1,
          },
        }}
        style={{
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          position: "absolute",
        }}
      />

      {/* Gesture mode UI overlay */}
      {gestureMode && (
        <>
          {/* Video preview (small corner preview) */}
          {videoElement && (
            <div className="absolute top-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white/30 bg-black/50">
              <video
                ref={(el) => {
                  if (el && videoElement) {
                    el.srcObject = videoElement.srcObject;
                    el.play();
                  }
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            </div>
          )}

          {/* Gesture status overlay */}
          <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {error && (
                  <div className="text-red-400 text-sm mb-2">❌ {error}</div>
                )}
                {!isInitialized && !error && (
                  <div className="text-yellow-400 text-sm">
                    ⏳ Initializing gesture detection...
                  </div>
                )}
                {hasPermission === false && (
                  <div className="text-red-400 text-sm">
                    📷 Camera access denied. Please enable camera permissions.
                  </div>
                )}
                {isInitialized && hasPermission && (
                  <div className="flex gap-6 text-sm">
                    {detectedHands.length === 0 ? (
                      <div className="text-gray-400">👋 No hands detected</div>
                    ) : (
                      detectedHands.map((hand, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="font-semibold">
                            {hand.handedness}:
                          </span>
                          <span>
                            {hand.gesture === "Closed_Fist" ? "✊" : "🖐️"}
                          </span>
                          <span className="text-gray-300">
                            {hand.gesture.replace("_", " ")}
                          </span>
                          <span className="text-gray-400 text-xs">
                            ({(hand.confidence * 100).toFixed(0)}%)
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Ready indicators */}
              {handStates.length > 0 && (
                <div className="flex gap-3 text-2xl">
                  {handStates.map((state, idx) => (
                    <div
                      key={idx}
                      className={`transition-all ${
                        state.currentGesture === "Closed_Fist"
                          ? "scale-125 animate-pulse"
                          : ""
                      }`}
                      title={`${state.handedness} hand: ${state.currentGesture}`}
                    >
                      {state.currentGesture === "Closed_Fist" ? "✊" : "🖐️"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
