"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const Playground = dynamic(() => import("./App").then((module) => module.App), {
  ssr: false,
  loading: () => (
    <div className="playground-shell">
      <p className="playground-loading" role="status">
        Loading the playground...
      </p>
    </div>
  ),
});

export function PlaygroundLoader({ active }: { active: boolean }) {
  const [hasMounted, setHasMounted] = useState(active);
  if (active && !hasMounted) setHasMounted(true);

  return hasMounted || active ? <Playground active={active} /> : null;
}
