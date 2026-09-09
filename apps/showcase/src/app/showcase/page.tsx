import type { Metadata } from "next";
import { Planner } from "@/components/showcase/planner";

export const metadata: Metadata = {
  title: "Faroe Islands | Roam",
  description: "A weekend, your way. An interactive LiquidGlass showcase.",
};
export default function ShowcasePage() {
  return <Planner />;
}
