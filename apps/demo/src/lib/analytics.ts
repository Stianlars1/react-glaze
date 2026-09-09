import { track, type BeforeSendEvent } from "@vercel/analytics";

export const analyticsEnabled =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

export function redactAnalyticsUrl(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  url.searchParams.delete("config");
  url.hash = "";
  return { ...event, url: url.toString() };
}

type DemoEvent =
  | { name: "install_command_copied" }
  | { name: "playground_code_copied"; properties: { format: "jsx" | "json" } }
  | {
      name: "resource_link_clicked";
      properties: { destination: "github" | "documentation" };
    };

export function trackDemoEvent(event: DemoEvent) {
  if (!analyticsEnabled) return;
  track(event.name, "properties" in event ? event.properties : undefined);
}
