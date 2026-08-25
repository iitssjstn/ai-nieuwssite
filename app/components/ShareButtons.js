"use client";

// Converts the current (possibly admin.-)hostname to the public domain name,
// so the shared link always points to the real site, never to the
// admin panel.
function getPublicOrigin() {
  const { protocol, hostname, port } = window.location;
  const publicHostname = hostname.replace(/^admin\./, "");
  return `${protocol}//${publicHostname}${port ? `:${port}` : ""}`;
}

export default function ShareButtons({ slug, title }) {
  function openShare(url) {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
  }

  function handleShare(network) {
    const articleUrl = `${getPublicOrigin()}/artikel/${slug}`;
    const encodedUrl = encodeURIComponent(articleUrl);
    const encodedTitle = encodeURIComponent(title);

    const urls = {
      x: `https://x.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    };
    openShare(urls[network]);
  }

  const buttonStyle = {
    width: "auto", padding: "6px 12px", fontSize: 13,
    display: "inline-flex", alignItems: "center", gap: 6,
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={() => handleShare("x")} style={buttonStyle}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.6 8.7L23.3 22h-7l-5.5-7.2L4.5 22H1.4l8.1-9.3L1 2h7.2l5 6.6L18.9 2Z" /></svg>
        Share on X
      </button>
      <button onClick={() => handleShare("facebook")} style={buttonStyle}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V8c0-.9.3-1.5 1.6-1.5H17V3.6C16.6 3.5 15.6 3.4 14.5 3.4c-2.4 0-4 1.5-4 4.1v2.4H8v3.1h2.5V21h3Z" /></svg>
        Facebook
      </button>
      <button onClick={() => handleShare("linkedin")} style={buttonStyle}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.6h.05c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.3-.02-2.96-1.8-2.96-1.8 0-2.08 1.4-2.08 2.86V21h-4V9Z" /></svg>
        LinkedIn
      </button>
    </div>
  );
}
