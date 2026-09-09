"use client";

import Image from "next/image";
import { LiquidGlass } from "react-glaze";
import type { Place } from "./places";
import { Icon } from "./icon";
import { recordGlassError } from "./glass-debug";

export function PlaceCard({
  place,
  saved,
  added,
  onSave,
  onAdd,
  onOpen,
}: {
  place: Place;
  saved: boolean;
  added: boolean;
  onSave: () => void;
  onAdd: () => void;
  onOpen: () => void;
}) {
  return (
    <article className="place-card">
      <div className="place-image">
        <button
          className="image-open"
          onClick={onOpen}
          aria-label={`View ${place.name}`}
        >
          <Image
            src={place.image}
            alt={place.alt}
            fill
            sizes="(max-width: 600px) 90vw, (max-width: 1050px) 44vw, 28vw"
            style={{ objectPosition: place.position }}
          />
        </button>
        <LiquidGlass
          as="button"
          shape="circle"
          preset="reference"
          depth={0.22}
          className="save-place"
          aria-label={`${saved ? "Unsave" : "Save"} ${place.name}`}
          aria-pressed={saved}
          onClick={onSave}
          onError={recordGlassError}
        >
          <Icon name="bookmark" fill={saved ? "currentColor" : "none"} />
        </LiquidGlass>
      </div>
      <span className="eyebrow muted">{place.category}</span>
      <h3>
        <button className="heading-button" onClick={onOpen}>
          {place.name}
          <Icon name="arrow" />
        </button>
      </h3>
      <p>{place.description}</p>
      <button className="add-stop" disabled={added} onClick={onAdd}>
        <Icon name={added ? "check" : "plus"} />
        {added ? "In your plan" : "Add to plan"}
      </button>
    </article>
  );
}
