import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jakiens · Sala de producción",
  description: "Intranet de producción audiovisual de Jakiens",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
