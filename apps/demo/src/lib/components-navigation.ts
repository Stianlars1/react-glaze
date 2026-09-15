export const componentViews = ["actions", "menu", "glass"] as const;

export type ComponentView = (typeof componentViews)[number];

export type RouteSearchParams = Record<string, string | string[] | undefined>;

export function isComponentView(value: string | null): value is ComponentView {
  return value !== null && componentViews.includes(value as ComponentView);
}

export function selectedComponent(search: Pick<URLSearchParams, "get" | "has">): ComponentView {
  const requested = search.get("component");
  if (isComponentView(requested)) return requested;
  return search.has("config") ? "glass" : "actions";
}

export function componentsHref(
  search: URLSearchParams,
  component: ComponentView,
  hash = "",
): string {
  const next = new URLSearchParams(search);
  next.set("component", component);
  return `/components?${next.toString()}${hash}`;
}

export function redirectToComponents(
  search: RouteSearchParams,
  component: ComponentView = "glass",
): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (Array.isArray(value)) {
      for (const item of value) next.append(key, item);
    } else if (value !== undefined) {
      next.append(key, value);
    }
  }
  return componentsHref(next, component);
}
