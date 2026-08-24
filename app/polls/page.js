import Header from "../components/Header";
import Footer from "../components/Footer";
import Link from "next/link";
import { getPolls, getArticles, getSiteSettings } from "@/lib/db";
import { headers } from "next/headers";

function getBaseUrl() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export function generateMetadata() {
  const { site_name } = getSiteSettings();
  return {
    title: `Polls — ${site_name}`,
    description: `All polls from ${site_name}.`,
    alternates: { canonical: `${getBaseUrl()}/polls` },
  };
}

export default function PollsHubPage() {
  const polls = getPolls().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const articles = getArticles({ status: "published" });

  return (
    <div className="container">
      <Header />
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 16 }}>Polls</h1>

      {polls.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No polls yet.</p>
      )}

      {polls.map((poll) => {
        const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
        const linkedArticle = articles.find((a) => a.poll_id === poll.id);
        return (
          <div key={poll.id} className="sidebar-box" style={{ marginBottom: 16 }}>
            <h3>{poll.question}</h3>
            {poll.options.map((o) => {
              const pct = totalVotes > 0 ? Math.round((o.votes / totalVotes) * 100) : 0;
              return (
                <div key={o.id} style={{ margin: "8px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span>{o.text}</span>
                    <span>{pct}%</span>
                  </div>
                  <div style={{ background: "var(--border)", borderRadius: 4, height: 6 }}>
                    <div style={{ background: "var(--accent-text)", borderRadius: 4, height: 6, width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
              {totalVotes} votes
              {linkedArticle && (
                <> · <Link href={`/artikel/${linkedArticle.slug}`} style={{ color: "var(--accent-text)" }}>View article</Link></>
              )}
            </p>
          </div>
        );
      })}

      <Footer />
    </div>
  );
}
