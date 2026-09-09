"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { getPlace, type PlaceId } from "./places";
import { downloadTrip, type Trip } from "./trip-store";
import { Icon } from "./icon";

export function Itinerary({
  trip,
  storageAvailable,
  onRemove,
  onRename,
  onNotice,
}: {
  trip: Trip;
  storageAvailable: boolean;
  onRemove: (id: PlaceId) => void;
  onRename: (title: string) => void;
  onNotice: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const finishEditing = () => {
    setEditing(false);
    requestAnimationFrame(() => editButton.current?.focus());
  };
  return (
    <aside id="weekend" className="itinerary" aria-label="Your weekend plan">
      <div className="section-kicker">
        <Icon name="compass" />
        <span className="eyebrow">Your weekend</span>
      </div>
      {editing ? (
        <form
          className="trip-form"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onRename(String(data.get("title")));
            finishEditing();
            onNotice("Trip name updated.");
          }}
        >
          <label htmlFor="trip-title">Trip name</label>
          <input
            id="trip-title"
            name="title"
            defaultValue={trip.title}
            maxLength={60}
            required
            autoFocus
          />
          <div className="form-actions">
            <button className="small-button" type="submit">
              Save name
            </button>
            <button
              className="text-button"
              type="button"
              onClick={finishEditing}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="plan-heading">
          <h2>{trip.title}</h2>
          <button
            className="icon-button"
            ref={editButton}
            aria-label="Edit trip name"
            onClick={() => setEditing(true)}
          >
            <Icon name="edit" />
          </button>
        </div>
      )}
      <p className="plan-meta">
        Faroe Islands <span>·</span> {trip.stops.length}{" "}
        {trip.stops.length === 1 ? "place" : "places"}
      </p>
      {trip.stops.length ? (
        <ol className="stop-list">
          {trip.stops.map((id, index) => {
            const place = getPlace(id);
            return (
              <li key={id}>
                <span className="stop-number">{index + 1}</span>
                <Image
                  src={place.image}
                  alt=""
                  width={52}
                  height={52}
                  sizes="52px"
                  style={{ objectPosition: place.position }}
                />
                <div>
                  <strong>{place.name}</strong>
                  <span>{place.category}</span>
                </div>
                <button
                  className="icon-button"
                  aria-label={`Remove ${place.name} from plan`}
                  onClick={() => onRemove(id)}
                >
                  <Icon name="close" />
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="plan-empty">
          <Icon name="pin" />
          <p>Your weekend is wide open.</p>
          <span>Add a place to make it yours.</span>
        </div>
      )}
      <button
        className="primary-button download-plan"
        disabled={!trip.stops.length}
        onClick={() => {
          downloadTrip(trip);
          onNotice("Your weekend plan has been downloaded.");
        }}
      >
        <Icon name="download" />
        Download plan
      </button>
      <p className="storage-note">
        {storageAvailable
          ? "Saved in this browser. Ready when you are."
          : "Browser storage is unavailable. Download your plan to keep it."}
      </p>
      <div className="plan-note">
        <span className="eyebrow">Leave a little space</span>
        <p>The best part of a trip is often the part you didn&apos;t plan.</p>
      </div>
    </aside>
  );
}
