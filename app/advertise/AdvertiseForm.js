"use client";

import { useState } from "react";
import { AD_SLOT_DEFINITIONS } from "@/lib/ad-slots";

export default function AdvertiseForm() {
  const [slot, setSlot] = useState(AD_SLOT_DEFINITIONS[0].id);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageDims, setImageDims] = useState(null);
  const [destinationUrl, setDestinationUrl] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const slotDef = AD_SLOT_DEFINITIONS.find((s) => s.id === slot);
  const dimsMatch = imageDims && slotDef && imageDims.width === slotDef.width && imageDims.height === slotDef.height;

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setImageUrl(null);
    setImageDims(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/ad-uploads", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

      // Meet de daadwerkelijke afbeeldingsafmetingen in de browser, zodat
      // de adverteerder DIRECT te horen krijgt of het bestand wel/niet aan
      // de vereiste resolutie voldoet — niet pas nadat wij het handmatig
      // beoordeeld hebben.
      const dims = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error("Could not read the image"));
        img.src = uploadData.url;
      });

      setImageUrl(uploadData.url);
      setImageDims(dims);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!imageUrl) {
      setError("Please upload a banner image first.");
      return;
    }
    if (!dimsMatch) {
      setError(`The uploaded image is ${imageDims.width}×${imageDims.height}px, but this placement requires exactly ${slotDef.width}×${slotDef.height}px.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ad-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot,
          image_url: imageUrl,
          destination_url: destinationUrl,
          advertiser_name: name,
          advertiser_email: email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 24, textAlign: "center" }}>
        <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Thanks — your ad has been submitted!</p>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          We'll review it and, once approved, it goes live on the site right away. We'll reach out
          by email if we have any questions.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 20 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Placement</label>
      <select
        value={slot}
        onChange={(e) => { setSlot(e.target.value); setImageDims(null); setImageUrl(null); }}
        style={{ width: "100%", marginBottom: 4 }}
      >
        {AD_SLOT_DEFINITIONS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label} — requires exactly {s.width}×{s.height}px
          </option>
        ))}
      </select>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
        Required size for this placement: <strong>{slotDef.width}×{slotDef.height}px</strong> exactly.
      </p>

      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Banner image</label>
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} disabled={uploading} style={{ marginBottom: 8 }} />
      {uploading && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Uploading...</p>}
      {imageUrl && imageDims && (
        <div style={{ margin: "8px 0 16px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Uploaded banner preview" style={{ maxWidth: "100%", display: "block", marginBottom: 6, borderRadius: 6 }} />
          <p style={{ fontSize: 12, color: dimsMatch ? "var(--success-text)" : "var(--danger-text)" }}>
            {dimsMatch
              ? `✓ ${imageDims.width}×${imageDims.height}px — matches the required size.`
              : `✗ This image is ${imageDims.width}×${imageDims.height}px, but ${slotDef.width}×${slotDef.height}px is required. Please upload one at the exact size.`}
          </p>
        </div>
      )}

      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Destination URL</label>
      <input
        type="url"
        placeholder="https://your-website.com"
        value={destinationUrl}
        onChange={(e) => setDestinationUrl(e.target.value)}
        required
        style={{ width: "100%", marginBottom: 16 }}
      />

      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Your name or company</label>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: "100%", marginBottom: 16 }} />

      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Email</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", marginBottom: 20 }} />

      {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <button type="submit" className="primary" disabled={submitting || uploading} style={{ width: "auto", padding: "10px 20px" }}>
        {submitting ? "Submitting..." : "Submit for review"}
      </button>
    </form>
  );
}
