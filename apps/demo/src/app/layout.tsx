import { serializeJsonLd, siteMetadata, siteStructuredData } from "@/lib/seo";
import { DemoAnalytics } from "@/components/analytics/DemoAnalytics";
import "./globals.css";

export const metadata = siteMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(siteStructuredData) }}
        />
        {children}
        <DemoAnalytics />
      </body>
    </html>
  );
}
