"use client";

import { useEffect, useState } from "react";
import { useConfirmDialog } from "../../../components/ConfirmDialog";

export default function CategoriesPage() {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [categories, setCategories] = useState([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#0c447c");
  const [newParent, setNewParent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [renamedCount, setRenamedCount] = useState(null);

  async function load() {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data.categories || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(updated, rename) {
    setError(null);
    setSaved(false);
    setRenamedCount(null);
    setBusy(true);
    const res = await fetch("/api/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories: updated, rename }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories);
      setSaved(true);
      if (rename && data.articlesUpdated > 0) setRenamedCount(data.articlesUpdated);
    } else {
      const data = await res.json();
      setError(data.error || "Save failed");
      await load(); // revert to the last valid state
    }
  }

  function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    save([...categories, { name: newName.trim(), color: newColor, parent: newParent || null }]);
    setNewName("");
    setNewColor("#0c447c");
    setNewParent("");
  }

  function updateColor(name, color) {
    save(categories.map((c) => (c.name === name ? { ...c, color } : c)));
  }

  function updateParent(name, parent) {
    save(categories.map((c) => (c.name === name ? { ...c, parent: parent || null } : c)));
  }

  function updateName(oldName, newName) {
    save(
      categories.map((c) => (c.name === oldName ? { ...c, name: newName } : c)),
      { from: oldName, to: newName }
    );
  }

  // Werkt op de weergave-volgorde (hoofdcategorie direct gevolgd door zijn
  // subcategorieën), niet op de ruwe array-index — anders zou omhoog/omlaag
  // verwarrend afwijken van wat er op het scherm staat.
  function move(displayList, name, direction) {
    const pos = displayList.findIndex((c) => c.name === name);
    const targetPos = pos + direction;
    if (targetPos < 0 || targetPos >= displayList.length) return;
    const a = displayList[pos].name;
    const b = displayList[targetPos].name;
    const indexOf = (n) => categories.findIndex((c) => c.name === n);
    const updated = [...categories];
    const iA = indexOf(a);
    const iB = indexOf(b);
    [updated[iA], updated[iB]] = [updated[iB], updated[iA]];
    save(updated);
  }

  async function remove(name) {
    if (categories.length <= 1) {
      alert("At least one category must remain.");
      return;
    }
    const hasChildren = categories.some((c) => c.parent === name);
    const warning = hasChildren
      ? `Delete category "${name}"? Its subcategories become top-level categories. Existing articles keep this name as text, but the category disappears from dropdowns and navigation.`
      : `Delete category "${name}"? Existing articles keep this name as text, but the category disappears from dropdowns and navigation.`;
    if (!(await confirm(warning))) return;
    save(categories.filter((c) => c.name !== name));
  }

  const topLevel = categories.filter((c) => !c.parent);
  const childrenOf = (name) => categories.filter((c) => c.parent === name);
  // Hoofdcategorie direct gevolgd door zijn subcategorieën — dit is zowel
  // de render- als de omhoog/omlaag-volgorde.
  const displayList = topLevel.flatMap((t) => [t, ...childrenOf(t.name)]);

  return (
    <>
      {ConfirmDialog}
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Categories</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        The AI uses these categories to classify articles, and they determine the navigation on
        the public site. Each category has its own color for the badges. The order
        below also determines the order in the navigation bar and footer — move them with the
        arrows. A category can optionally have a parent category (e.g. "Football" under
        "Sports") — its parent's page then automatically also shows its articles, and it gets
        its own filter chip there. Only one level of nesting is supported. Changes take effect
        immediately.
      </p>

      {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
      {saved && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 12 }}>Saved.</p>}
      {renamedCount !== null && (
        <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 12 }}>
          {renamedCount} existing article(s) updated to the new category name.
        </p>
      )}

      {displayList.map((c) => (
        <div
          key={c.name}
          className="pending-item"
          style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: c.parent ? 28 : 0 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => move(displayList, c.name, -1)}
              disabled={busy || displayList[0].name === c.name}
              aria-label="Move up"
              style={{ width: 24, height: 18, padding: 0, fontSize: 11, lineHeight: 1 }}
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => move(displayList, c.name, 1)}
              disabled={busy || displayList[displayList.length - 1].name === c.name}
              aria-label="Move down"
              style={{ width: 24, height: 18, padding: 0, fontSize: 11, lineHeight: 1 }}
            >
              ▼
            </button>
          </div>
          <input
            type="color"
            value={c.color}
            onChange={(e) => updateColor(c.name, e.target.value)}
            disabled={busy}
            style={{ width: 36, height: 36, padding: 0, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer" }}
          />
          <input
            type="text"
            defaultValue={c.name}
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value.trim() !== c.name) {
                updateName(c.name, e.target.value.trim());
              }
            }}
            disabled={busy}
            style={{ flex: 1 }}
          />
          <select
            value={c.parent || ""}
            onChange={(e) => updateParent(c.name, e.target.value)}
            disabled={busy}
            title="Parent category"
            style={{ padding: 8, borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, flexShrink: 0 }}
          >
            <option value="">Top-level</option>
            {topLevel
              .filter((t) => t.name !== c.name) // een categorie kan niet zijn eigen (klein)kind zijn
              .map((t) => (
                <option key={t.name} value={t.name}>
                  Under &quot;{t.name}&quot;
                </option>
              ))}
          </select>
          <span className="badge" style={{ background: c.color + "22", color: c.color, flexShrink: 0 }}>
            {c.name}
          </span>
          <button onClick={() => remove(c.name)} className="danger" disabled={busy} style={{ width: "auto", padding: "6px 12px", fontSize: 13, flexShrink: 0 }}>
            Delete
          </button>
        </div>
      ))}

      <form onSubmit={handleAdd} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          style={{ width: 36, height: 36, padding: 0, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer" }}
        />
        <input
          type="text"
          placeholder="Name of the new category"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ flex: 1, minWidth: 160 }}
        />
        <select
          value={newParent}
          onChange={(e) => setNewParent(e.target.value)}
          style={{ padding: 8, borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }}
        >
          <option value="">Top-level</option>
          {topLevel.map((t) => (
            <option key={t.name} value={t.name}>
              Under &quot;{t.name}&quot;
            </option>
          ))}
        </select>
        <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px", flexShrink: 0 }}>
          Add
        </button>
      </form>
    </>
  );
}
