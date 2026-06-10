import "./globals.css";

export const metadata = {
  title: "Cricket Live Scores",
  description: "Latest cricket scores fetched from Google.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
