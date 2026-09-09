import type { ResolvingMetadata } from "next";
import { PlaygroundLoader } from "@/components/playground/PlaygroundLoader";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(_props: unknown, parent: ResolvingMetadata) {
  return pageMetadata("/playground", await parent);
}

export default function PlaygroundPage() {
  return <PlaygroundLoader />;
}
