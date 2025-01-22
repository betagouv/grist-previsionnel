import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
        <Script
          src="https://grist.numerique.gouv.fr/grist-plugin-api.js"
          strategy="beforeInteractive"
          async=""
        />
      </body>
    </Html>
  );
}
