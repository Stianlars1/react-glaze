import Link from "next/link";
import { redirect } from "next/navigation";
import { MaterialStage } from "@/components/landing/MaterialStage";
import { InstallCommand } from "@/components/landing/InstallCommand";
import { BrandIcon } from "@/components/brand/BrandIcon";
import { PACKAGE_URL, pageMetadata, REPOSITORY_URL } from "@/lib/seo";
import { ResourceLink } from "@/components/analytics/ResourceLink";
import { redirectToComponents, type RouteSearchParams } from "@/lib/components-navigation";

export const metadata = pageMetadata("/");

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<RouteSearchParams>;
}) {
  const query = await searchParams;
  const { config } = query;
  if (config !== undefined) {
    redirect(redirectToComponents(query));
  }

  return (
    <div className="landing-shell">
      <header className="landing-header">
        <Link href="/" className="landing-brand" aria-label="React Glaze home">
          <BrandIcon />
          <span>React Glaze</span>
        </Link>
        <nav className="landing-resources" aria-label="Project resources">
          <ResourceLink destination="github" className="landing-resource-link" href={REPOSITORY_URL}>
            GitHub
          </ResourceLink>
          <ResourceLink destination="npm" className="landing-resource-link" href={PACKAGE_URL}>
            npm
          </ResourceLink>
        </nav>
      </header>

      <main className="landing-main">
        <div className="landing-copy">
          <div className="landing-introduction">
            <h1>Liquid glass for React.</h1>
            <p className="landing-description">
              Wrap a button or a card.<br />
              Compose a menu. Keep your own CSS.
            </p>
          </div>
          <div className="landing-entry-points">
            <InstallCommand />
            <nav className="landing-actions" aria-label="Explore React Glaze">
              <Link href="/components" className="landing-route-link">
                <span>Components</span>
                <span className="landing-route-detail">Explore and customize</span>
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
        <span>
          An open-source project by <a href="https://www.stianlarsen.com/">Stian Larsen</a>.
        </span>
        <div>
          <span>React 19</span><span aria-hidden="true">/</span>
          <a href="https://github.com/Stianlars1/react-glaze/blob/main/LICENSE">MIT licensed</a>
          <span aria-hidden="true">/</span>
          <ResourceLink destination="documentation" href="https://github.com/Stianlars1/react-glaze#readme">Documentation</ResourceLink>
        </div>
      </footer>
    </div>
  );
}
