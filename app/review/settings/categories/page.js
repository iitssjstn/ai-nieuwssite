"use client";

import { useEffect, useState } from "react";
import { useConfirmDialog } from "../../../components/ConfirmDialog";

export default function CategoriesPage() {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [categories, setCategories] = useState([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#0c447c");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  async function load() {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data.categories || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(updated) {
    setError(null);
    setSaved(false);
    setBusy(true);
    const res = await fetch("/api/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories: updated }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories);
      setSaved(true);
    } else {
      const data = await res.json();
      setError(data.error || "Opslaan mislukt");
      await load(); // terugzetten naar de laatst geldige staat
    }
  }

  function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    save([...categories, { name: newName.trim(), color: newColor }]);
    setNewName("");
    setNewColor("#0c447c");
  }

  function updateColor(name, color) {
    save(categories.map((c) => (c.name === name ? { ...c, color } : c)));
  }

  function updateName(oldName, newName) {
    save(categories.map((c) => (c.name === oldName ? { ...c, name: newName } : c)));
  }

  async function remove(name) {
    if (categories.length <= 1) {
      alert("Er moet minstens één categorie overblijven.");
      return;
    }
    if (!(await confirm(`Categorie "${name}" verwijderen? Bestaande artikelen behouden deze naam als tekst, maar de categorie verdwijnt uit de keuzelijsten en navigatie.`))) return;
    save(categories.filter((c) => c.name !== name));
  }

  return (
    <>
      {ConfirmDialog}
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Categorieën</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Deze categorieën gebruikt de AI om artikelen in te delen, en ze bepalen de navigatie op
        de publieke site. Elke categorie heeft een eigen kleur voor de badges. Wijzigingen zijn
        direct actief.
      </p>

      {error && <p style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
      {saved && <p style={{ color: "var(--success-text)", fontSize: 13, marginBottom: 12 }}>Opgeslagen.</p>}

      {categories.map((c) => (
        <div key={c.name} className="pending-item" style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          <span className="badge" style={{ background: c.color + "22", color: c.color, flexShrink: 0 }}>
            {c.name}
          </span>
          <button onClick={() => remove(c.name)} className="danger" disabled={busy} style={{ width: "auto", padding: "6px 12px", fontSize: 13, flexShrink: 0 }}>
            Verwijderen
          </button>
        </div>
      ))}

      <form onSubmit={handleAdd} style={{ background: "var(--surface-1)", borderRadius: 12, padding: 16, marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          style={{ width: 36, height: 36, padding: 0, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer" }}
        />
        <input
          type="text"
          placeholder="Naam van de nieuwe categorie"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="primary" disabled={busy} style={{ width: "auto", padding: "8px 16px", flexShrink: 0 }}>
          Toevoegen
        </button>
      </form>
    </>
  );
}
