"use client";

import { useState } from "react";
import Link from "next/link";
import { LiquidGlass } from "react-glaze";
import { places, type Place } from "./places";
import { useTrip } from "./trip-store";
import { Icon } from "./icon";
import { Gallery } from "./gallery";
import { PlaceCard } from "./place-card";
import { PlaceDialog } from "./place-dialog";
import { Itinerary } from "./itinerary";
import {
  GlassDebug,
  recordGlassError,
  recordGlassMetrics,
} from "./glass-debug";

export function Planner() {
  const { trip, storageAvailable, toggleSaved, addStop, removeStop, rename } =
    useTrip();
  const [savedOnly, setSavedOnly] = useState(false);
  const [selected, setSelected] = useState<Place | null>(null);
  const [notice, setNotice] = useState("");
  const visible = savedOnly
    ? places.filter((place) => trip.saved.includes(place.id))
    : places;
  const add = (place: Place) => {
    addStop(place.id);
    setNotice(`${place.name} added to your plan.`);
  };
  return (
    <div className="showcase-shell">
      <a className="skip-link" href="#places">
        Skip to places
      </a>
      <header className="floating-header">
        <LiquidGlass
          className="navigation-glass"
          shape="pill"
          preset="quiet"
          depth={0.18}
          thickness={0.12}
          onError={recordGlassError}
          onMetrics={recordGlassMetrics("navigation")}
        >
          <Link className="wordmark" href="/" aria-label="React Glaze home">
            <Icon name="compass" />
            React Glaze
          </Link>
          <nav aria-label="Main navigation">
            <a
              href="#places"
              aria-current={!savedOnly ? "page" : undefined}
              onClick={() => setSavedOnly(false)}
            >
              Explore
            </a>
            <a
              href="#places"
              aria-current={savedOnly ? "page" : undefined}
              onClick={() => setSavedOnly(true)}
            >
              Saved<span className="nav-count">{trip.saved.length}</span>
            </a>
            <a href="#weekend" className="plan-nav">
              Your plan
              <Icon name="arrow" />
            </a>
          </nav>
        </LiquidGlass>
      </header>
      <main id="top">
        <Gallery stopCount={trip.stops.length} />
        <div className="destination-strip">
          <span>
            <Icon name="pin" />
            Faroe Islands
          </span>
          <span>North Atlantic / 62° N</span>
          <span>Slow days. Wide horizons.</span>
        </div>
        <div className="planner-layout">
          <section
            className="places-section"
            id="places"
            aria-labelledby="places-title"
          >
            <div className="section-intro">
              <div>
                <span className="eyebrow muted">
                  Your collection starts here
                </span>
                <h2 id="places-title">Places to pause.</h2>
              </div>
              <span className="editorial-count">03 / Faroe Islands</span>
            </div>
            <div className="collection-toolbar">
              <div className="segmented" aria-label="Filter places">
                <button
                  aria-pressed={!savedOnly}
                  onClick={() => setSavedOnly(false)}
                >
                  All places <span>{places.length}</span>
                </button>
                <button
                  aria-pressed={savedOnly}
                  onClick={() => setSavedOnly(true)}
                >
                  Saved <span>{trip.saved.length}</span>
                </button>
              </div>
              <span className="result-count" role="status">
                {visible.length} {visible.length === 1 ? "place" : "places"}
              </span>
            </div>
            {visible.length ? (
              <div className="place-grid">
                {visible.map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    saved={trip.saved.includes(place.id)}
                    added={trip.stops.includes(place.id)}
                    onOpen={() => setSelected(place)}
                    onSave={() => {
                      toggleSaved(place.id);
                      setNotice(
                        `${place.name} ${trip.saved.includes(place.id) ? "removed from" : "added to"} saved places.`,
                      );
                    }}
                    onAdd={() => add(place)}
                  />
                ))}
              </div>
            ) : (
              <div className="collection-empty">
                <Icon name="bookmark" />
                <h3>A place for your favourites.</h3>
                <p>Tap the bookmark on a place to keep it here.</p>
                <button
                  className="small-button"
                  onClick={() => setSavedOnly(false)}
                >
                  Explore all places
                  <Icon name="arrow" />
                </button>
              </div>
            )}
            <div className="field-note">
              <span className="eyebrow muted">A note for the road</span>
              <p>
                Less on the list.
                <br />
                <span>More to remember.</span>
              </p>
              <span>Start with one place. See where it takes you.</span>
            </div>
          </section>
          <Itinerary
            trip={trip}
            storageAvailable={storageAvailable}
            onRemove={(id) => {
              removeStop(id);
              setNotice(
                "Place removed from your plan. You can add it again from the collection.",
              );
            }}
            onRename={rename}
            onNotice={setNotice}
          />
        </div>
      </main>
      <footer className="showcase-footer">
        <span className="footer-brand">
          roam<span>A LiquidGlass experience</span>
        </span>
        <span>Sample trip. Yours to make.</span>
        <Link href="/">
          Component home
          <Icon name="arrow" />
        </Link>
      </footer>
      <div className="notice" role="status" data-liquid-overlay="">
        {notice && (
          <>
            <Icon name="check" />
            <span>{notice}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <Icon name="close" />
            </button>
          </>
        )}
      </div>
      {selected && (
        <PlaceDialog
          place={selected}
          added={trip.stops.includes(selected.id)}
          onAdd={() => add(selected)}
          onClose={() => setSelected(null)}
        />
      )}
      <GlassDebug />
    </div>
  );
}
