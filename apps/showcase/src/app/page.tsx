import Link from "next/link";

export default function Home() {
  return (
    <main className="component-home">
      <span className="eyebrow muted">LiquidGlass / Local preview</span>
      <h1>
        One component.
        <br />
        Your interface.
      </h1>
      <p>
        The component generator will live here. Explore the working showcase
        while it takes shape.
      </p>
      <Link className="primary-button" href="/showcase">
        Open showcase <span aria-hidden="true">↗</span>
      </Link>
    </main>
  );
}
