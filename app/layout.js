import Script from "next/script";
import "./globals.css";

export const metadata = {
  title: "Dagblad",
  description: "Nieuws, samengesteld met AI en gecontroleerd door de redactie.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>
        {children}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9993499505706431"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
