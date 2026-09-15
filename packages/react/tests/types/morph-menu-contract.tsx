import { createRef } from "react";
import { LiquidGlassActions, LiquidGlassMenu, type GlassAction, type GlassMenuHandle } from "../../dist/index.js";

const items: readonly GlassAction[] = [{ id: "save", label: "Save", icon: <span>+</span>, onSelect() {} },
  { id: "custom", label: "Custom", content: <strong>Custom content</strong>, disabled: true }];
const menuRef = createRef<GlassMenuHandle>();
const externalControls = createRef<HTMLDivElement>();
const boundary = createRef<HTMLDivElement>();
const split = <LiquidGlassActions label="Document actions" items={items} trigger={<span>Open</span>}
  layout="fan" direction="top" actionSize={56} triggerSize={72} distance={-60} appearance="labels"
  open={true} onOpenChange={next => next.valueOf()} motion={{ duration: 1234, bounce: .7 }}
  material={{ preset: "reference" }} connection={12} refraction={1} reducedMotion={false}
  onError={error => error.message} onReady={() => {}} className="actions" itemClassName="action"
  ref={menuRef} externalControls={externalControls} boundary={boundary}
  onPlaybackUpdate={state => state.available.valueOf()} />;
const menu = <LiquidGlassMenu ref={menuRef} label="Document actions" items={items} direction="left" defaultOpen />;
menuRef.current?.pause();
menuRef.current?.play();
menuRef.current?.seek(250);
menuRef.current?.replay();
// @ts-expect-error Layout values are a finite vocabulary.
const badLayout = <LiquidGlassActions label="Actions" items={items} layout="grid" />;
// @ts-expect-error Directions do not accept arbitrary strings.
const badDirection = <LiquidGlassMenu label="Actions" items={items} direction="north" />;
// @ts-expect-error Every action requires a label even when custom content is supplied.
const missingLabel = <LiquidGlassActions label="Actions" items={[{ id: "save", content: "Save" }]} />;
// @ts-expect-error Each action needs a stable string ID.
const invalidId = <LiquidGlassActions label="Actions" items={[{ id: 4, label: "Save" }]} />;
// @ts-expect-error Action callbacks must be functions.
const invalidCallback = <LiquidGlassMenu label="Actions" items={[{ id: "save", label: "Save", onSelect: "save" }]} />;
// @ts-expect-error Split layout controls are not panel props.
const panelLayout = <LiquidGlassMenu label="Actions" items={items} layout="row" />;
// @ts-expect-error Trigger accessible name is required.
const unlabelled = <LiquidGlassMenu items={items} />;
void [split, menu, badLayout, badDirection, missingLabel, invalidId, invalidCallback, panelLayout, unlabelled];
