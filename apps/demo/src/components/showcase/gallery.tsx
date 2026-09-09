"use client";

import { useState } from "react";
import Image from "next/image";
import { LiquidGlass } from "react-glaze";
import { Icon } from "./icon";
import { places } from "./places";
import { recordGlassError, recordGlassMetrics } from "./glass-debug";

export function Gallery({ stopCount }: { stopCount: number }) {
  const [index, setIndex] = useState(0);
  const photo = places[index];
  return (
    <section
      className="destination"
      aria-label="Faroe Islands photo collection"
    >
      <Image
        className="destination-photo"
        src={photo.image}
        alt={photo.alt}
        fill
        loading="eager"
        fetchPriority="high"
        sizes="100vw"
        style={{ objectPosition: photo.position }}
      />
      <div className="destination-shade" />
      <div className="destination-copy">
        <span className="eyebrow">A weekend in the North Atlantic</span>
        <h1>
          Faroe
          <br />
          Islands<span className="title-period">.</span>
        </h1>
        <p>
          A few good places.
          <br />A little room to get lost.
        </p>
        <a className="text-link on-photo" href="#places">
          Find your next stop <Icon name="arrow" />
        </a>
      </div>
      <LiquidGlass
        className="weekend-card"
        shape="rounded"
        preset="quiet"
        depth={0.24}
        onError={recordGlassError}
        onMetrics={recordGlassMetrics("weekend-card")}
      >
        <span className="eyebrow">Your next escape</span>
        <div className="weekend-title">
          <Icon name="compass" />
          <span>Take the scenic way.</span>
        </div>
        <p>
          Collect the places that speak to you.
          <br />
          We&apos;ll keep them together.
        </p>
        <a href="#weekend" className="text-link on-photo">
          Open your plan <span className="count">{stopCount}</span>
          <Icon name="arrow" />
        </a>
      </LiquidGlass>
      <div className="photo-footer">
        <span className="photo-location">
          <Icon name="pin" />
          {photo.name}
        </span>
        <LiquidGlass
          className="gallery-toolbar"
          shape="pill"
          preset="reference"
          depth={0.22}
          onError={recordGlassError}
          onMetrics={recordGlassMetrics("gallery")}
        >
          <button
            className="icon-button"
            aria-label="Previous photo"
            onClick={() =>
              setIndex((index + places.length - 1) % places.length)
            }
          >
            <Icon name="back" />
          </button>
          <span className="gallery-count" aria-live="polite">
            0{index + 1}
            <span> / 03</span>
          </span>
          <button
            className="icon-button"
            aria-label="Next photo"
            onClick={() => setIndex((index + 1) % places.length)}
          >
            <Icon name="arrow" />
          </button>
        </LiquidGlass>
      </div>
    </section>
  );
}
