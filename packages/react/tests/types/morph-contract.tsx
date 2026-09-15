import { createRef } from "react";
import {
  LiquidGlassGroup,
  LiquidGlassSurface,
  type GlassGroupHandle,
  type GlassPlaybackState,
  type GlassSurface,
} from "../../dist/index.js";
const groupRef = createRef<GlassGroupHandle>();
const buttonRef = createRef<HTMLButtonElement>();
const surfaces: GlassSurface[] = [
  { id: "save", x: 40, y: 40, width: 60, height: 60 },
];
const group = (
  <LiquidGlassGroup
    ref={groupRef}
    width={200}
    height={100}
    surfaces={surfaces}
    motion={{ duration: 500, bounce: 0.5 }}
    refraction={1.5}
    onFrame={(frame) => frame.elapsed.toFixed()}
    onPlaybackUpdate={(state: GlassPlaybackState) => state.time.toFixed()}
  >
    <LiquidGlassSurface
      as="button"
      surfaceId="save"
      ref={buttonRef}
      disabled
      type="button"
    >
      Save
    </LiquidGlassSurface>
    <LiquidGlassSurface as="a" surfaceId="save" href="/saved">
      Link
    </LiquidGlassSurface>
  </LiquidGlassGroup>
);
groupRef.current?.pulse("save", "compress");
groupRef.current?.pause();
groupRef.current?.play();
groupRef.current?.seek(250);
groupRef.current?.replay();
// @ts-expect-error Explicit group dimensions are required.
const missingSize = <LiquidGlassGroup surfaces={surfaces} />;
// @ts-expect-error Native divs do not accept href.
const badSurface = <LiquidGlassSurface surfaceId="save" href="/bad" />;
// @ts-expect-error Pulse kind is a finite public vocabulary.
groupRef.current?.pulse("save", "jump");
void [group, missingSize, badSurface];
