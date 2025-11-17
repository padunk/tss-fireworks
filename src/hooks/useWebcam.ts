import { useEffect, useRef, useState, useCallback } from "react";

export interface WebcamOptions {
  enabled?: boolean;
  width?: number;
  height?: number;
  facingMode?: "user" | "environment";
}

export function useWebcam(options: WebcamOptions = {}) {
  const {
    enabled = true,
    width = 1280,
    height = 720,
    facingMode = "user",
  } = options;

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode,
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
        video.muted = true;
        videoRef.current = video;
      }

      videoRef.current.srcObject = stream;

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => {
              setIsReady(true);
              resolve();
            });
          };
        }
      });

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to access camera";
      setError(errorMessage);
      setHasPermission(false);
      console.error("Webcam error:", err);
      return false;
    }
  }, [width, height, facingMode]);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsReady(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      startWebcam();
    } else {
      stopWebcam();
    }

    return () => {
      stopWebcam();
    };
  }, [enabled, startWebcam, stopWebcam]);

  return {
    videoElement: videoRef.current,
    stream: streamRef.current,
    hasPermission,
    isReady,
    error,
    startWebcam,
    stopWebcam,
  };
}
