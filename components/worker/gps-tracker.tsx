"use client";

import { useEffect, useRef, useState } from "react";

type GpsStatus = "idle" | "requesting" | "active" | "denied" | "error" | "unsupported";
type Coords = { latitude: number; longitude: number; accuracy: number };

const HEARTBEAT_INTERVAL_MS = 20_000;

function sendLocation(coords: Coords, onSent: () => void) {
  fetch("/api/locations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy_meters: coords.accuracy,
    }),
  })
    .then(onSent)
    .catch(() => undefined);
}

/**
 * Tracks GPS while the worker is not OFFLINE and posts fixes to
 * /api/locations on a fixed heartbeat interval — not just when
 * `watchPosition` reports a change. A stationary worker still needs
 * fresh updates, since dispatch requires a recent fix (see the
 * `find_available_workers_near_location` freshness window).
 * `active` controls whether tracking should currently be running
 * (driven by the worker's status, polled by the parent).
 */
export function GpsTracker({ active }: { active: boolean }) {
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const latestCoordsRef = useRef<Coords | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      latestCoordsRef.current = null;
      const timeoutId = setTimeout(() => setGpsStatus("idle"), 0);
      return () => clearTimeout(timeoutId);
    }

    if (!("geolocation" in navigator)) {
      const timeoutId = setTimeout(() => setGpsStatus("unsupported"), 0);
      return () => clearTimeout(timeoutId);
    }

    const requestingTimeoutId = setTimeout(() => setGpsStatus("requesting"), 0);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGpsStatus("active");
        latestCoordsRef.current = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
      },
      (err) => {
        setGpsStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );

    watchIdRef.current = watchId;

    const heartbeat = setInterval(() => {
      if (latestCoordsRef.current) {
        sendLocation(latestCoordsRef.current, () => setLastUpdatedAt(new Date()));
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      clearTimeout(requestingTimeoutId);
      clearInterval(heartbeat);
      navigator.geolocation.clearWatch(watchId);
      watchIdRef.current = null;
    };
  }, [active]);

  if (!active) {
    return <p className="text-xs text-black/50">GPS: inactive (set AVAILABLE to enable)</p>;
  }

  const label: Record<GpsStatus, string> = {
    idle: "GPS: idle",
    requesting: "GPS: requesting permission…",
    active: "GPS: active",
    denied: "GPS: permission denied — enable location access to receive jobs",
    error: "GPS: error reading location",
    unsupported: "GPS: not supported by this browser",
  };

  return (
    <p className="text-xs text-black/60">
      {label[gpsStatus]}
      {lastUpdatedAt && ` · last update ${lastUpdatedAt.toLocaleTimeString()}`}
    </p>
  );
}
