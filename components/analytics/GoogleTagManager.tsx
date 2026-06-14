import Script from 'next/script';

/** Allow only official GTM container id shape — avoids injecting arbitrary URLs. */
function getGtmId(): string | null {
  const id = process.env.NEXT_PUBLIC_GTM_ID?.trim();
  if (!id || !/^GTM-[A-Z0-9]+$/i.test(id)) {
    return null;
  }
  return id;
}

/**
 * Google Tag Manager — main snippet via `next/script` + `afterInteractive` (non-blocking).
 * Set `NEXT_PUBLIC_GTM_ID` (e.g. GTM-XXXX). If unset or invalid, renders nothing.
 */
export function GoogleTagManager() {
  const gtmId = getGtmId();
  if (!gtmId) return null;

  return (
    <Script id="google-tag-manager" strategy="lazyOnload">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
    </Script>
  );
}

/**
 * GTM noscript fallback — place immediately after `<body>` opens (users without JS).
 */
export function GoogleTagManagerNoScript() {
  const gtmId = getGtmId();
  if (!gtmId) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
