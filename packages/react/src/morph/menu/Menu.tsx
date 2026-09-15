"use client";
import { createElement, useId, useImperativeHandle, useLayoutEffect, useRef } from "react";
import type { GlassAction, GlassGroupHandle, GlassMenuHandle, GlassMorphFrame, LiquidGlassActionsProps } from "../../morph-types.js";
import { LiquidGlassGroup } from "../../LiquidGlassGroup.js";
import { LiquidGlassSurface } from "../../LiquidGlassSurface.js";
import { ANCHOR_ID, TRIGGER_ID, actionSurfaceId, makeMenuLayout } from "./layout.js";
import { boundedSize, panelContentOpacity, validateActions, validateContent } from "./logic.js";
import { useMenuMeasurements } from "./use-measurements.js";
import { useMenu } from "./use-menu.js";
import { menuStyles } from "./styles.js";

export function GlassMenu({ mode, ...props }: LiquidGlassActionsProps & { mode: "split" | "panel" }) {
  if (typeof props.label !== "string" || !props.label.trim()) throw new TypeError("Glass menus need a nonempty trigger label.");
  validateActions(props.items); validateContent(props.trigger, "Glass menu trigger");
  const { items, appearance = "icons", layout: arrangement = "fan", direction = "top", distance = 0,
    triggerSize: requestedTrigger, actionSize: requestedAction, material, motion, connection, refraction,
    reducedMotion, backdrop, boundary, onReady, onError, onPlaybackUpdate } = props;
  const triggerSize = boundedSize(requestedTrigger, 72), actionSize = boundedSize(requestedAction, mode === "panel" ? 52 : 56);
  const labels = appearance === "labels";
  const measurements = useMenuMeasurements(items, actionSize, labels, triggerSize, boundary);
  const layout = makeMenuLayout({ mode, trigger: triggerSize, items: measurements.sizes, layout: arrangement,
    direction, distance, labels, view: measurements.view });
  const group = useRef<GlassGroupHandle>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const frame = useRef<GlassMorphFrame | undefined>(undefined);
  const currentLayout = useRef(layout); currentLayout.current = layout;
  const currentSize = useRef(triggerSize); currentSize.current = triggerSize;
  const positions = () => items.map(item => {
    const id = actionSurfaceId(item.id);
    const target = currentLayout.current.expanded.find(s => s.id === id);
    const pose = frame.current?.surfaces.find(s => s.id === id);
    const usePose = pose && pose.width > 1 && pose.height > 1;
    return { id: item.id, x: (usePose ? pose : target)?.x ?? 0, y: (usePose ? pose : target)?.y ?? 0 };
  });
  const behavior = useMenu(props, measurements.root, group, layout.mode === "panel", positions);
  useImperativeHandle(props.ref, (): GlassMenuHandle => ({
    get element() { return measurements.root.current; },
    pause() { group.current?.pause(); },
    play() { group.current?.play(); },
    seek(timeMs) { group.current?.seek(timeMs); },
    replay() { group.current?.replay(); },
  }), [measurements.root]);
  useLayoutEffect(() => { measurements.refresh(); }, [behavior.open]);
  const instanceId = useId(), menuId = `${instanceId}-menu`, triggerId = `${instanceId}-trigger`;
  const initial = useRef({ surfaces: behavior.open ? layout.expanded : layout.closed, anchor: layout.anchor, open: behavior.open });
  const panel = layout.mode === "panel";
  const paint = (next: GlassMorphFrame) => {
    frame.current = next;
    const anchor = next.surfaces.find(s => s.id === ANCHOR_ID);
    if (anchor && group.current?.element) {
      group.current.element.style.left = `${currentSize.current / 2 - anchor.x}px`;
      group.current.element.style.top = `${currentSize.current / 2 - anchor.y}px`;
      const pane = currentLayout.current.expanded.find(s => s.id === TRIGGER_ID);
      if (pane && closeButton.current) {
        closeButton.current.style.left = `${anchor.x + pane.x - currentLayout.current.anchor.x + pane.width / 2 - 44}px`;
        closeButton.current.style.top = `${anchor.y + pane.y - currentLayout.current.anchor.y - pane.height / 2 - 48}px`;
      }
    }
    const triggerPose = next.surfaces.find(s => s.id === TRIGGER_ID);
    const expanded = currentLayout.current.expanded.find(s => s.id === TRIGGER_ID);
    if (behavior.scroll.current && triggerPose && expanded && anchor) {
      behavior.scroll.current.style.opacity = String(panelContentOpacity(
        { ...triggerPose, x: triggerPose.x - anchor.x, y: triggerPose.y - anchor.y },
        { ...expanded, x: expanded.x - currentLayout.current.anchor.x, y: expanded.y - currentLayout.current.anchor.y },
        currentSize.current, behavior.open, next.active));
    }
    if (behavior.trigger.current && triggerPose) {
      const scale = currentLayout.current.mode === "split" && triggerPose.width < currentSize.current * 1.4
        ? triggerPose.width / currentSize.current : 1;
      behavior.trigger.current.style.transform = `scale(${scale})`;
    }
  };
  const content = (item: GlassAction) => <span data-glaze-menu-item-content="" ref={node => measurements.registerContent(item.id, node)}>
    {item.content ?? (!labels && item.icon !== undefined ? item.icon : <>{item.icon}{item.label}</>)}
  </span>;
  const itemProps = (item: GlassAction) => ({
    id: `${instanceId}-item-${encodeURIComponent(item.id)}`,
    role: "menuitem" as const,
    type: "button" as const,
    "aria-label": item.label,
    disabled: item.disabled,
    tabIndex: behavior.open && !item.disabled && behavior.focused === item.id ? 0 : -1,
    className: props.itemClassName,
    ref: (node: HTMLButtonElement | null) => {
      if (node) behavior.buttons.current.set(item.id, node); else behavior.buttons.current.delete(item.id);
    },
    onFocus: () => behavior.onItemFocus(item.id),
    onClick: () => behavior.select(item.id),
  });
  const triggerProps = {
    id: triggerId,
    ref: behavior.trigger,
    type: "button" as const,
    "aria-label": props.label,
    "aria-haspopup": "menu" as const,
    "aria-expanded": behavior.open,
    "aria-controls": menuId,
    disabled: behavior.disabled,
    className: props.triggerClassName,
    tabIndex: behavior.triggerTabIndex,
    onClick: behavior.onTriggerClick,
    onKeyDown: behavior.onTriggerKeyDown,
  };
  const closeIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18" /></svg>;
  const triggerContent = props.trigger ?? (behavior.open && !panel ? closeIcon :
    <svg width="28" height="28" viewBox="0 0 28 28" fill="currentColor" aria-hidden="true" focusable="false">
      <circle cx="6" cy="14" r="2" /><circle cx="14" cy="14" r="2" /><circle cx="22" cy="14" r="2" />
    </svg>);
  const pane = layout.expanded.find(s => s.id === TRIGGER_ID)!;
  return <div ref={measurements.root} className={props.className} data-glaze-menu-root="" data-glaze-menu-mode={layout.mode}
    data-glaze-menu-direction={layout.direction} data-glaze-menu-wrapped={layout.wrapped || undefined}
    tabIndex={-1} onFocusCapture={behavior.onFocusCapture} onKeyDown={behavior.onMenuKeyDown}
    style={{ ...props.style, position: "relative", display: "inline-block", width: triggerSize, height: triggerSize,
      flexShrink: 0, zIndex: behavior.open ? props.style?.zIndex ?? 100 : props.style?.zIndex }}>
    {createElement("style", { href: "react-glaze-menus-v1", precedence: "react-glaze" }, menuStyles)}
    <LiquidGlassGroup ref={group} width={layout.width} height={layout.height}
      surfaces={behavior.open ? layout.expanded : layout.closed} initialSurfaces={initial.current.surfaces}
      material={material} motion={motion} connection={connection} refraction={refraction} reducedMotion={reducedMotion}
      backdrop={backdrop} onReady={onReady} onError={onError} onPlaybackUpdate={onPlaybackUpdate} onFrame={paint}
      style={{ position: "absolute", left: triggerSize / 2 - initial.current.anchor.x,
        top: triggerSize / 2 - initial.current.anchor.y, pointerEvents: "none" }}>
      {panel ? <LiquidGlassSurface as="div" surfaceId={TRIGGER_ID} contentScale="fixed" role="menu" id={menuId} tabIndex={-1}
        aria-label={props.label} aria-hidden={!behavior.open} inert={!behavior.open} data-glaze-menu-panel="" data-appearance={appearance}>
        <div data-glaze-menu-scroll="" ref={behavior.scroll} style={{ width: layout.panel.w, height: layout.panel.h, opacity: Number(initial.current.open) }}>
          <div data-glaze-menu-grid="" style={{ gridTemplateColumns: `repeat(${layout.panel.columns}, 1fr)`,
            width: layout.panel.contentWidth, minHeight: layout.panel.contentHeight }}>
            {items.map(item => <button key={item.id} {...itemProps(item)} data-glaze-menu-panel-item=""
              style={{ minHeight: Math.max(actionSize, ...measurements.sizes.map(s => s.h)) }}>{content(item)}</button>)}
          </div>
        </div>
      </LiquidGlassSurface> : <>
        <LiquidGlassSurface as="div" surfaceId={TRIGGER_ID} aria-hidden="true" inert />
        <div role="menu" id={menuId} aria-label={props.label} aria-hidden={!behavior.open} inert={!behavior.open}
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {items.map(item => <LiquidGlassSurface as="button" key={item.id} surfaceId={actionSurfaceId(item.id)} contentScale="follow"
            {...itemProps(item)}>{content(item)}</LiquidGlassSurface>)}
        </div>
      </>}
      {panel && <button ref={closeButton} type="button" aria-label={`Close ${props.label}`} data-glaze-menu-close=""
        inert={!behavior.open} aria-hidden={!behavior.open} tabIndex={-1} onClick={behavior.close}
        style={{ visibility: behavior.open ? "visible" : "hidden", left: pane.x + pane.width / 2 - 44,
          top: pane.y - pane.height / 2 - 48 }}>{closeIcon}</button>}
    </LiquidGlassGroup>
    <button {...triggerProps} data-glaze-menu-trigger-overlay="" data-liquid-overlay="" inert={panel && behavior.open}>{triggerContent}</button>
  </div>;
}
