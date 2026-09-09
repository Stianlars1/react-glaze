"use client";

import { useCallback, useId, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import Image from "next/image";
import { LiquidGlass } from "react-glaze";
import { useGlassDrag } from "@/hooks/useGlassDrag";

const scenes = [
  { id: "soft", label: "Soft forms", image: "/art/soft.png" },
  { id: "metal", label: "Hard light", image: "/art/metal.png" },
  { id: "garden", label: "Small world", image: "/art/garden.png" },
] as const;

type SceneImage = { index: number; request: number };
const imageSizes = "(max-width: 760px) calc(100vw - 32px), (max-width: 1280px) 58vw, 760px";

export function MaterialStage() {
  const [displayed, setDisplayed] = useState<SceneImage>({ index: 0, request: 0 });
  const [pending, setPending] = useState<SceneImage | null>(null);
  const latestRequest = useRef(0);
  const [frosted, setFrosted] = useState(false);
  const [failedScene, setFailedScene] = useState<string | null>(null);
  const [glassError, setGlassError] = useState(false);
  const instructionId = useId();
  const materialId = useId();
  const {
    stage: stageRef,
    host: glassRef,
    position,
    dragging,
    bindings,
  } = useGlassDrag<HTMLButtonElement>("button");
  const scene = scenes[displayed.index];
  const onGlassReady = useCallback(() => setGlassError(false), []);
  const onGlassError = useCallback(() => setGlassError(true), []);
  const chooseScene = (index: number) => {
    if (pending?.index === index || (!pending && displayed.index === index)) return;
    const request = ++latestRequest.current;
    setFailedScene(null);
    setPending(index === displayed.index ? null : { index, request });
  };
  const failImage = (image: SceneImage) => {
    if (image.request !== latestRequest.current) return;
    setFailedScene(scenes[image.index].id);
    setPending(null);
  };
  const revealImage = async (
    event: SyntheticEvent<HTMLImageElement>,
    image: SceneImage,
  ) => {
    const element = event.currentTarget;
    try {
      await element.decode();
      if (image.request !== latestRequest.current) return;
      setDisplayed(image);
      setPending(null);
      setFailedScene(null);
    } catch {
      failImage(image);
    }
  };
  const images = pending ? [displayed, pending] : [displayed];

  return (
    <div className="landing-stage" data-scene={scene.id}>
      <div ref={stageRef} className="landing-art">
        {images.map((image) => {
          const isPending = image.request !== displayed.request;
          return (
            <Image
              key={image.request}
              className="landing-art-image"
              src={scenes[image.index].image}
              alt=""
              fill
              sizes={imageSizes}
              loading="eager"
              draggable={false}
              style={isPending ? { display: "none" } : undefined}
              onError={() => failImage(image)}
              onLoad={(event) => void revealImage(event, image)}
            />
          );
        })}
        <LiquidGlass
          ref={glassRef}
          {...bindings}
          as="button"
          type="button"
          className="landing-glass"
          shape="pill"
          width={280}
          height="auto"
          preset={frosted ? "frosted" : "reference"}
          lighting="responsive"
          rimLight={{ mode: "pointer", onLeave: "hold" }}
          contentMode="sharp"
          maxDpr={2}
          aria-label="A different feeling. Toggle frosted glass"
          aria-pressed={frosted}
          aria-describedby={`${instructionId} ${materialId}`}
          data-dragging={dragging}
          style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
          onClick={() => setFrosted((value) => !value)}
          onReady={onGlassReady}
          onError={onGlassError}
        >
          <span>A different feeling.</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 12h14m-5-5 5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </LiquidGlass>
      </div>

      <div className="landing-stage-caption">
        <p id={instructionId}>
          Drag to explore. Click to frost.
          <span className="landing-keyboard-hint"> Alt + arrows to move.</span>
        </p>
        <span id={materialId} className="landing-material-status" role="status">
          {pending ? "Loading scene..." : frosted ? "Frosted glass" : "Clear glass"}
        </span>
      </div>

      <div className="landing-scene-controls" role="group" aria-label="Choose a scene">
        {scenes.map((option, index) => (
          <button
            key={option.id}
            type="button"
            className="landing-scene-button"
            aria-pressed={displayed.index === index}
            aria-busy={pending?.index === index}
            onClick={() => chooseScene(index)}
          >
            <span aria-hidden="true">0{index + 1}</span>
            {option.label}
          </button>
        ))}
      </div>

      {(glassError || failedScene !== null) && (
        <p className="landing-stage-error" role="status">
          {failedScene !== null
            ? "This scene could not load. Try another scene or refresh the page."
            : "The glass could not load. Please refresh the page to try again."}
        </p>
      )}
    </div>
  );
}
