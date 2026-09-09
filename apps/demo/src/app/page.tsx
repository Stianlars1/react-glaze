import Link from "next/link";
import { redirect } from "next/navigation";
import { MaterialStage } from "@/components/landing/MaterialStage";
import { InstallCommand } from "@/components/landing/InstallCommand";
import { BrandMark } from "@/components/brand/BrandMark";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/");

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ config?: string | string[] }>;
}) {
  const { config } = await searchParams;
  if (config !== undefined) {
    const query = new URLSearchParams({
      config: Array.isArray(config) ? config[0] : config,
    });
    redirect(`/playground?${query}`);
  }

  return (
    <div className="landing-shell">
      <header className="landing-header">
        <Link href="/" className="landing-brand" aria-label="React Glaze home">
          <BrandMark className="brand-mark" />
          <span>React Glaze</span>
        </Link>
        <a className="landing-github" href="https://github.com/Stianlars1/react-glaze">
          GitHub
        </a>
      </header>

      <main className="landing-main">
        <div className="landing-copy">
          <div className="landing-introduction">
            <h1>Liquid glass for React.</h1>
            <p className="landing-description">
              Wrap a button or a card.<br />
              Keep your content and your own CSS.
            </p>
          </div>
          <div className="landing-entry-points">
            <InstallCommand />
            <nav className="landing-actions" aria-label="Explore React Glaze">
              <Link href="/playground" className="landing-route-link">
                <span>Playground</span>
                <span className="landing-route-detail">Tune the glass</span>
              </Link>
              <Link href="/showcase" className="landing-route-link">
                <span>Showcase</span>
                <span className="landing-route-detail">See it in an app</span>
              </Link>
            </nav>
          </div>
        </div>
        <MaterialStage />
      </main>

      <footer className="landing-footer">
        <span>An open-source project by Stian Larsen.</span>
        <div>
          <span>React 19</span><span aria-hidden="true">/</span>
          <a href="https://github.com/Stianlars1/react-glaze/blob/main/LICENSE">MIT licensed</a>
          <span aria-hidden="true">/</span>
          <a href="https://github.com/Stianlars1/react-glaze#readme">Documentation</a>
        </div>
      </footer>
    </div>
  );
}
