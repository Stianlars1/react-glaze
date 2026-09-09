import type { ResolvingMetadata } from "next";
import { Planner } from "@/components/showcase/planner";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(_props: unknown, parent: ResolvingMetadata) {
  return pageMetadata("/showcase", await parent);
}
export default function ShowcasePage() {
  return <Planner />;
}
