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
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Map Overview</h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        All articles with a linked location, regardless of status. The public map at{" "}
        <code>/kaart</code> only shows published articles. Add a location when
        editing an article.
      </p>
      {articles.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No articles with a location yet.</p>
      ) : (
        <NewsMap articles={articles} />
      )}
    </div>
  );
}
