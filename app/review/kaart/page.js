"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const NewsMap = dynamic(() => import("../../components/NewsMap"), { ssr: false });

export default function AdminKaartPage() {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    fetch("/api/articles")
      .then((r) => r.json())
      .then((all) => setArticles(all.filter((a) => a.location?.lat && a.location?.lng)));
  }, []);

  return (
    <div className="container">
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Kaart-overzicht</h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Alle artikelen met een gekoppelde locatie, ongeacht status. De publieke kaart op{" "}
        <code>/kaart</code> toont alleen gepubliceerde artikelen. Voeg een locatie toe bij het
        bewerken van een artikel.
      </p>
      {articles.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Nog geen artikelen met een locatie.</p>
      ) : (
        <NewsMap articles={articles} />
      )}
    </div>
  );
}
