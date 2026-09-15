"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlaygroundLoader } from "@/components/playground/PlaygroundLoader";
import {
  componentsHref,
  selectedComponent,
  type ComponentView,
} from "@/lib/components-navigation";
import { GroupExample } from "./GroupExample";
import { MenuPlayground } from "./MenuPlayground";

const choices: ReadonlyArray<{ id: ComponentView; label: string }> = [
  { id: "actions", label: "Split actions" },
  { id: "menu", label: "Morphing menu" },
  { id: "glass", label: "Liquid Glass" },
];

export function ComponentsExplorer() {
  const router = useRouter();
  const search = useSearchParams();
  const selected = selectedComponent(search);
  const choose = useCallback(
    (component: ComponentView) => {
      router.push(
        componentsHref(
          new URLSearchParams(search.toString()),
          component,
          window.location.hash,
        ),
        { scroll: false },
      );
    },
    [router, search],
  );
  const menuKind = selected === "menu" ? "menu" : "actions";
  const menuActive = selected !== "glass";

  return (
    <>
      <div className="components-tabs" role="group" aria-label="Component">
        {choices.map(({ id, label }) => (
          <button
            type="button"
            key={id}
            aria-pressed={selected === id}
            onClick={() => choose(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <MenuPlayground kind={menuKind} active={menuActive} />
      <PlaygroundLoader active={selected === "glass"} />
      <GroupExample />
    </>
  );
}
