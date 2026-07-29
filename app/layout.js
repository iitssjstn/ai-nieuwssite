import "./globals.css";

export const metadata = {
  title: "Dagblad",
  description: "Nieuws, samengesteld met AI en gecontroleerd door de redactie.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
