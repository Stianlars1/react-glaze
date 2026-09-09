"use client";

import { useSyncExternalStore } from "react";
import { getPlace, places, type PlaceId } from "./places";

export interface Trip {
  title: string;
  saved: PlaceId[];
  stops: PlaceId[];
}
const initialTrip: Trip = {
  title: "A little further north",
  saved: ["gasadalur"],
  stops: ["funningur"],
};
const key = "liquid-showcase-trip-v1";
const listeners = new Set<() => void>();
let trip = initialTrip;
let loaded = false;
let storageAvailable = true;

export function parseTrip(value: string | null): Trip {
  if (!value) return initialTrip;
  const data: unknown = JSON.parse(value);
  if (!data || typeof data !== "object") return initialTrip;
  const candidate = data as Partial<Trip>;
  const ids = (value: unknown): PlaceId[] =>
    Array.isArray(value)
      ? [
          ...new Set(
            value.filter((id): id is PlaceId =>
              places.some((p) => p.id === id),
            ),
          ),
        ]
      : [];
  return {
    title:
      typeof candidate.title === "string" && candidate.title.trim()
        ? candidate.title.trim().slice(0, 60)
        : initialTrip.title,
    saved: ids(candidate.saved),
    stops: ids(candidate.stops),
  };
}

function readStorage() {
  try {
    trip = parseTrip(localStorage.getItem(key));
  } catch {
    storageAvailable = false;
  }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loaded) {
    loaded = true;
    readStorage();
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      readStorage();
      listeners.forEach((notify) => notify());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
function update(next: Trip) {
  trip = next;
  try {
    localStorage.setItem(key, JSON.stringify(trip));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  listeners.forEach((notify) => notify());
}

export function useTrip() {
  const value = useSyncExternalStore(
    subscribe,
    () => trip,
    () => initialTrip,
  );
  return {
    trip: value,
    storageAvailable,
    toggleSaved: (id: PlaceId) =>
      update({
        ...trip,
        saved: trip.saved.includes(id)
          ? trip.saved.filter((item) => item !== id)
          : [...trip.saved, id],
      }),
    addStop: (id: PlaceId) => {
      if (!trip.stops.includes(id))
        update({ ...trip, stops: [...trip.stops, id] });
    },
    removeStop: (id: PlaceId) =>
      update({ ...trip, stops: trip.stops.filter((item) => item !== id) }),
    rename: (title: string) =>
      update({
        ...trip,
        title: title.trim().slice(0, 60) || initialTrip.title,
      }),
  };
}

export function downloadTrip(trip: Trip) {
  const text = [
    trip.title,
    "Faroe Islands | Roam sample itinerary",
    "",
    ...trip.stops.map(
      (id, i) => `${i + 1}. ${getPlace(id).name}\n${getPlace(id).note}`,
    ),
    "",
    "An inspiration plan. Check routes, access and conditions before travelling.",
  ].join("\n\n");
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "roam-weekend-plan.txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
