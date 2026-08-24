"use client";

import { useRef, useEffect } from "react";

export default function RichEditor({ value, onChange }) {
  const ref = useRef(null);
  const fileInputRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (ref.current) ref.current.innerHTML = value || "";
  }, [value]);

  function exec(command, arg) {
    document.execCommand(command, false, arg);
    ref.current?.focus();
    handleInput();
  }

  function handleInput() {
    if (ref.current) onChange(ref.current.innerHTML);
  }

  async function handleImageClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      exec("insertImage", data.url);
    } catch (err) {
      alert("Image upload failed: " + err.message);
    }
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 4, padding: 8, borderBottom: "1px solid var(--border)", background: "var(--surface-1)", flexWrap: "wrap" }}>
        <ToolbarButton onClick={() => exec("bold")} label="Vet"><b>B</b></ToolbarButton>
        <ToolbarButton onClick={() => exec("italic")} label="Cursief"><i>I</i></ToolbarButton>
        <ToolbarButton onClick={() => exec("formatBlock", "h2")} label="Kop">H2</ToolbarButton>
        <ToolbarButton onClick={() => exec("formatBlock", "p")} label="Normale tekst">¶</ToolbarButton>
        <ToolbarButton onClick={() => exec("insertUnorderedList")} label="Opsomming">•</ToolbarButton>
        <ToolbarButton onClick={handleImageClick} label="Afbeelding invoegen">🖼</ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={handleInput}
        className="rich-editor-content"
        style={{ minHeight: 200, padding: 12, fontSize: 14, lineHeight: 1.6, outline: "none" }}
      />
    </div>
  );
}

function ToolbarButton({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{ width: "auto", padding: "4px 10px", fontSize: 13 }}
    >
      {children}
    </button>
  );
}
