"use client";

import { Analytics } from "@vercel/analytics/next";
import { analyticsEnabled, redactAnalyticsUrl } from "@/lib/analytics";

export function DemoAnalytics() {
  if (!analyticsEnabled) return null;
  return <Analytics beforeSend={redactAnalyticsUrl} />;
}
