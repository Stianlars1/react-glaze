"use client";

import dynamic from "next/dynamic";

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

export function PlaygroundLoader() {
  return <Playground />;
}
