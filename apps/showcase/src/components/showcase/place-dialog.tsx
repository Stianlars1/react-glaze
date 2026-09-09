"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { LiquidGlass } from "react-glaze";
import type { Place } from "./places";
import { Icon } from "./icon";
import { recordGlassError } from "./glass-debug";

export function PlaceDialog({
  place,
  added,
  onAdd,
  onClose,
}: {
  place: Place;
  added: boolean;
  onAdd: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const trigger = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement) trigger.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="place-dialog"
      aria-labelledby="place-dialog-title"
      onClose={() => {
        if (!ref.current?.open) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
      }}
    >
      <div className="dialog-image">
        <Image
          src={place.image}
          alt={place.alt}
          fill
          sizes="(max-width: 640px) 100vw, 640px"
          style={{ objectPosition: place.position }}
        />
        <LiquidGlass
          as="button"
          shape="circle"
          preset="quiet"
          className="dialog-close save-place"
          aria-label="Close place details"
          onClick={() => ref.current?.close()}
          onError={recordGlassError}
        >
          <Icon name="close" />
        </LiquidGlass>
      </div>
      <div className="dialog-content">
        <span className="eyebrow muted">{place.category}</span>
        <h2 id="place-dialog-title">{place.name}</h2>
        <p>{place.description}</p>
        <p>{place.note}</p>
        <button className="primary-button" disabled={added} onClick={onAdd}>
          <Icon name={added ? "check" : "plus"} />
          {added ? "In your plan" : "Add to plan"}
        </button>
        <small>
          Photo by{" "}
          <a href={place.source} target="_blank" rel="noreferrer">
            {place.photographer} / Unsplash
          </a>
        </small>
      </div>
    </dialog>
  );
}
