import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent, KeyboardEvent, MouseEvent } from "react";

type Position = { x: number; y: number };
type Limits = { x: number; y: number };
const clamp = (position: Position, limits: Limits): Position => ({
  x: Math.max(-limits.x, Math.min(limits.x, position.x)),
  y: Math.max(-limits.y, Math.min(limits.y, position.y)),
});
export function useGlassDrag<
  Element extends HTMLDivElement | HTMLButtonElement = HTMLDivElement | HTMLButtonElement,
>(example: string) {
  const stage = useRef<HTMLDivElement>(null),
    host = useRef<Element>(null);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 }),
    [dragging, setDragging] = useState(false);
  const current = useRef(position);
  useLayoutEffect(() => {
    current.current = position;
  }, [position]);
  const gesture = useRef<{
    id: number;
    start: Position;
    origin: Position;
    limits: Limits;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const limits = (): Limits => ({
    x: Math.max(
      0,
      ((stage.current?.clientWidth ?? 0) - (host.current?.offsetWidth ?? 0)) /
        2 -
        8,
    ),
    y: Math.max(
      0,
      ((stage.current?.clientHeight ?? 0) - (host.current?.offsetHeight ?? 0)) /
        2 -
        8,
    ),
  });
  useEffect(() => {
    const observer = new ResizeObserver(() =>
      setPosition((p) => {
        const next = clamp(p, limits());
        return next.x === p.x && next.y === p.y ? p : next;
      }),
    );
    if (stage.current) observer.observe(stage.current);
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, [example]);
  const reset = () => setPosition({ x: 0, y: 0 });
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!event.isPrimary || event.button !== 0 || gesture.current) return;
    suppressClick.current = false;
    gesture.current = {
      id: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: current.current,
      limits: limits(),
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    const x = event.clientX - active.start.x,
      y = event.clientY - active.start.y;
    if (!active.moved && Math.hypot(x, y) < 5) return;
    active.moved = true;
    suppressClick.current = true;
    setPosition(
      clamp({ x: active.origin.x + x, y: active.origin.y + y }, active.limits),
    );
  };
  const finish = (event: PointerEvent<HTMLElement>) => {
    if (gesture.current?.id !== event.pointerId) return;
    gesture.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (suppressClick.current && event.detail !== 0) {
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!event.altKey) return;
    if (event.key === "Home") {
      event.preventDefault();
      reset();
      return;
    }
    const directions: Record<string, Position> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const step = event.shiftKey ? 25 : 10;
    setPosition((p) =>
      clamp(
        { x: p.x + direction.x * step, y: p.y + direction.y * step },
        limits(),
      ),
    );
  };
  return {
    stage,
    host,
    position,
    dragging,
    reset,
    moveTo: setPosition,
    bindings: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
      onLostPointerCapture: finish,
      onClickCapture,
      onKeyDown,
    },
  };
}
