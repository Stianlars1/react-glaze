import type { ResolvingMetadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BrandIcon } from "@/components/brand/BrandIcon";
import { ComponentsExplorer } from "@/components/components/ComponentsExplorer";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(
  _props: unknown,
  parent: ResolvingMetadata,
) {
  return pageMetadata("/components", await parent);
}

function ComponentsExplorerFallback() {
  return (
    <div className="components-playground" aria-busy="true">
      <p className="components-example-status" role="status">
        Loading the component explorer...
      </p>
    </div>
  );
}

export default function ComponentsPage() {
  return (
    <div className="components-page">
      <header className="components-header">
        <Link href="/" className="landing-brand" aria-label="React Glaze home">
          <BrandIcon />
          <span>React Glaze</span>
        </Link>
        <nav aria-label="React Glaze">
          <Link href="/">Home</Link>
          <Link href="/components" aria-current="page">
            Components
          </Link>
          <Link href="/showcase">Showcase</Link>
        </nav>
      </header>
      <main>
        <div className="components-intro">
          <p className="components-eyebrow">REACT GLAZE / COMPONENTS</p>
          <h1>
            One material.
            <br />
            <span>Made to move.</span>
          </h1>
          <p>
            Composable glass surfaces and fluid menus.
            <br />
            Native controls, shared motion, your content.
          </p>
        </div>
        <Suspense fallback={<ComponentsExplorerFallback />}>
          <ComponentsExplorer />
        </Suspense>
      </main>
      <footer className="components-footer">
        <span>React 19 / Open source / MIT</span>
        <Link href="https://github.com/Stianlars1/react-glaze">
          View the source
        </Link>
      </footer>
    </div>
  );
}
