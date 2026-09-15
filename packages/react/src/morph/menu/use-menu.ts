import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import type { GlassGroupHandle, GlassMenuBaseProps } from "../../morph-types.js";
import { adjacentItem, directionalItem, edgeItem, isMenuInteraction, MenuFocusState, openingFocusTarget, radioTabStops, typeaheadItem, type MenuPoint } from "./logic.js";
import { TRIGGER_ID } from "./layout.js";

type CloseReason = "return" | "outside" | "tab";
const tabbable = "a[href],area[href],button,input,select,textarea,summary,iframe,[tabindex],[contenteditable='true']";

function adjacentPageControl(root: HTMLElement, trigger: HTMLButtonElement, backwards: boolean) {
  const candidates = [...root.ownerDocument.querySelectorAll<HTMLElement>(tabbable)].filter(node => node === trigger ||
    (!root.contains(node) && node.tabIndex >= 0 && !node.matches(":disabled") && !node.closest("[inert],[hidden]") &&
      node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden"));
  if (!candidates.includes(trigger)) candidates.push(trigger);
  candidates.sort((a, b) => {
    const ai = Math.max(0, a.tabIndex), bi = Math.max(0, b.tabIndex);
    if (ai !== bi && (ai > 0 || bi > 0)) return (ai || Infinity) - (bi || Infinity);
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });
  const stops = radioTabStops(candidates.map(node => {
    const input = node.tagName === "INPUT" ? node as HTMLInputElement : undefined;
    return { value: node, radio: input?.type === "radio" ? {
      name: input.name, checked: input.checked, form: input.form, tree: input.getRootNode(),
    } : undefined };
  }), backwards);
  return stops[stops.indexOf(trigger) + (backwards ? -1 : 1)];
}

export function useMenu(props: GlassMenuBaseProps, root: RefObject<HTMLDivElement | null>,
  group: RefObject<GlassGroupHandle | null>, panel: boolean, positions: () => MenuPoint[]) {
  const [internalOpen, setInternalOpen] = useState(props.defaultOpen ?? false);
  const [focused, setFocused] = useState<string | undefined>(() => edgeItem(props.items, "first"));
  const [tabExiting, setTabExiting] = useState(false);
  const disabled = !!props.disabled || props.items.length === 0;
  const open = !disabled && (props.open ?? internalOpen);
  const trigger = useRef<HTMLButtonElement>(null), scroll = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<"first" | "last" | string | undefined>(undefined);
  const focus = useRef(new MenuFocusState());
  const previousOpen = useRef(false), typeahead = useRef({ text: "", time: -Infinity });
  const previousPanel = useRef(panel);
  const tabTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef({ props, open, panel, focused, positions });
  latest.current = { props, open, panel, focused, positions };

  const focusTrigger = () => {
    if (trigger.current && !trigger.current.disabled) trigger.current.focus({ preventScroll: true });
    else if (root.current && trigger.current) (adjacentPageControl(root.current, trigger.current, false) ?? root.current).focus({ preventScroll: true });
  };
  const focusEmptyMenu = () => root.current?.querySelector<HTMLElement>("[role='menu']")?.focus({ preventScroll: true });
  const focusItem = (id: string | undefined) => {
    const item = latest.current.props.items.find(action => action.id === id && !action.disabled);
    const button = item && buttons.current.get(item.id);
    if (!button || !latest.current.open) return;
    setFocused(item.id); button.focus({ preventScroll: true });
    const container = scroll.current;
    if (container) {
      let top = button.offsetTop, left = button.offsetLeft;
      let parent = button.offsetParent as HTMLElement | null;
      while (parent && parent !== container) {
        top += parent.offsetTop; left += parent.offsetLeft;
        parent = parent.offsetParent as HTMLElement | null;
      }
      if (top < container.scrollTop) container.scrollTop = top;
      else if (top + button.offsetHeight > container.scrollTop + container.clientHeight)
        container.scrollTop = top + button.offsetHeight - container.clientHeight;
      if (left < container.scrollLeft) container.scrollLeft = left;
      else if (left + button.offsetWidth > container.scrollLeft + container.clientWidth)
        container.scrollLeft = left + button.offsetWidth - container.clientWidth;
    }
  };
  const requestOpen = (next: boolean, reason: CloseReason = "return", edge?: "first" | "last") => {
    const current = latest.current;
    if (next && (current.props.disabled || !current.props.items.length)) return;
    if (next) { pendingFocus.current = edge ?? "first"; focus.current.cancelClose(); }
    else { pendingFocus.current = undefined; focus.current.requestClose(reason); }
    if (next === current.open) {
      if (next && edge) focusItem(edgeItem(current.props.items, edge));
      return;
    }
    if (current.props.open === undefined) setInternalOpen(next);
    current.props.onOpenChange?.(next);
  };
  const requestRef = useRef(requestOpen); requestRef.current = requestOpen;

  useLayoutEffect(() => {
    const wasOpen = previousOpen.current;
    const changedPanel = previousPanel.current !== panel;
    previousOpen.current = open;
    previousPanel.current = panel;
    if (wasOpen !== open) {
      group.current?.pulse(TRIGGER_ID, open ? "compress" : "expand");
      typeahead.current = { text: "", time: -Infinity };
      if (open) {
        const target = openingFocusTarget(
          pendingFocus.current,
          root.current?.ownerDocument.activeElement ?? null,
          props.externalControls?.current ?? null,
        );
        if (target !== undefined) {
          const id = target === "first" || target === "last" ? edgeItem(props.items, target) : target;
          if (id) focusItem(id);
          else if (panel) focusEmptyMenu();
        }
        pendingFocus.current = undefined;
      } else {
        const active = root.current?.ownerDocument.activeElement;
        if (focus.current.shouldRestore(root.current?.contains(active ?? null) ?? false))
          focusTrigger();
        focus.current.closed();
      }
    }
    if (open && changedPanel && focus.current.owned) {
      if (focused) focusItem(focused); else if (panel) focusEmptyMenu();
    }
    if (open && !props.items.some(item => item.id === focused && !item.disabled)) {
      const id = edgeItem(props.items, "first");
      setFocused(id);
      const active = root.current?.ownerDocument.activeElement;
      if (focus.current.owned && (!active || active === document.body || root.current?.contains(active))) {
        if (id) focusItem(id); else if (panel) focusEmptyMenu(); else focusTrigger();
      }
    }
  }, [open, panel, focused, props.items, root, group]);

  useEffect(() => {
    if (!open) return;
    const doc = root.current?.ownerDocument;
    if (!doc) return;
    const outside = (event: PointerEvent) => {
      if (!isMenuInteraction(event.composedPath(), root.current,
        latest.current.props.externalControls?.current ?? null))
        requestRef.current(false, "outside");
    };
    const focusChanged = (event: FocusEvent) => {
      const path = event.composedPath();
      const inside = isMenuInteraction(path, root.current);
      const associated = isMenuInteraction(path, null,
        latest.current.props.externalControls?.current ?? null);
      if (inside) focus.current.enter();
      else if (associated) focus.current.associate();
      else { focus.current.leave(); requestRef.current(false, "outside"); }
    };
    doc.addEventListener("pointerdown", outside, true);
    doc.addEventListener("focusin", focusChanged, true);
    return () => { doc.removeEventListener("pointerdown", outside, true); doc.removeEventListener("focusin", focusChanged, true); };
  }, [open, root]);
  useEffect(() => () => { if (tabTimer.current !== undefined) clearTimeout(tabTimer.current); }, []);

  const keyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || !latest.current.open) return;
    const current = latest.current;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); requestOpen(false); return; }
    if (event.key === "Tab") {
      const target = root.current && trigger.current ? adjacentPageControl(root.current, trigger.current, event.shiftKey) : undefined;
      if (target) {
        event.preventDefault();
        if (isMenuInteraction([target], null, current.props.externalControls?.current ?? null))
          focus.current.associate();
        else requestOpen(false, "tab");
        target.focus();
      }
      else {
        setTabExiting(true); requestOpen(false, "tab");
        tabTimer.current = setTimeout(() => setTabExiting(false), 0);
      }
      return;
    }
    const id = [...buttons.current].find(([, node]) => node === event.target)?.[0] ?? current.focused;
    let next: string | undefined;
    if (event.key === "Home" || event.key === "End") next = edgeItem(current.props.items, event.key === "Home" ? "first" : "last");
    else if (event.key.startsWith("Arrow")) {
      if (current.panel) {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        next = adjacentItem(current.props.items, id, event.key === "ArrowDown" ? 1 : -1);
      } else {
        const enabled = new Set(current.props.items.filter(item => !item.disabled).map(item => item.id));
        next = directionalItem(current.positions().filter(point => enabled.has(point.id)), id, event.key);
      }
    } else if ([...event.key].length === 1 && event.key !== " " && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const result = typeaheadItem(current.props.items, id, event.key, event.timeStamp, typeahead.current);
      typeahead.current = result.state; next = result.id;
    } else return;
    event.preventDefault(); focusItem(next);
  };

  return { open, disabled, trigger, buttons, scroll, focused,
    triggerTabIndex: tabExiting || (panel && open) ? -1 : 0,
    onFocusCapture() { focus.current.enter(); },
    onTriggerClick() { requestOpen(!latest.current.open); },
    onTriggerKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault(); requestOpen(true, "return", event.key === "ArrowUp" ? "last" : "first");
      } else keyDown(event);
    },
    onMenuKeyDown: keyDown,
    onItemFocus(id: string) { focus.current.enter(); setFocused(id); },
    select(id: string) {
      const item = latest.current.props.items.find(action => action.id === id);
      if (!latest.current.open || !item || item.disabled) return;
      try { item.onSelect?.(); } finally { requestOpen(false); }
    },
    close() { requestOpen(false); } };
}
