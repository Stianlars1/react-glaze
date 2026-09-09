import type { Metadata } from "next";
import { PlaygroundLoader } from "@/components/playground/PlaygroundLoader";

export const metadata: Metadata = {
  title: "Playground | React Glaze",
  description:
    "Explore liquid glass materials, shape and lighting, then copy the React code for your configuration.",
};

export default function PlaygroundPage() {
  return <PlaygroundLoader />;
}
