import { redirect } from "next/navigation";
import { redirectToComponents, type RouteSearchParams } from "@/lib/components-navigation";

export default async function PlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<RouteSearchParams>;
}) {
  redirect(redirectToComponents(await searchParams));
}
