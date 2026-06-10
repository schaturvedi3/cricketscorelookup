"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ScoreCard, { type Match } from "@/components/ScoreCard";

const QUICK_QUERIES = [
  "cricket score",
  "India cricket",
  "Australia cricket",
  "England cricket",
  "Pakistan cricket",
  "IPL",
  "T20 World Cup",
  "Test match cricket",
];

interface ScoresResponse {
  query: string;
  fetchedAt: string;
  matches: Match[];
  source: string;
  raw?: string;
}

export default function Home() {
  const [query, setQuery] = useState("cricket score");
  const [data, setData] = useState<ScoresResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchScores = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/scores?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as ScoresResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial + on-query-submit fetch
  useEffect(() => {
    fetchScores(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh every 30s when enabled
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (!autoRefresh) return;
    timer.current = setInterval(() => fetchScores(query), 30_000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [autoRefresh, query, fetchScores]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    fetchScores(query);
  }

  function pickQuick(q: string) {
    setQuery(q);
    fetchScores(q);
  }

  return (
    <main className="container">
      <div className="header">
        <h1>Cricket Live Scores</h1>
        <span className="badge">Live from Google</span>
      </div>
      <p className="subtitle">
        Search for any team, tournament, or match — scores are fetched server-side from
        Google&apos;s live sports cards.
      </p>

      <form className="search-row" onSubmit={onSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Try "India vs Australia" or "Ashes" or "IPL final"'
          aria-label="Search cricket scores"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Loading…" : "Search"}
        </button>
      </form>

      <div className="chips" role="group" aria-label="Quick searches">
        {QUICK_QUERIES.map((q) => (
          <button key={q} className="chip" onClick={() => pickQuick(q)} type="button">
            {q}
          </button>
        ))}
      </div>

      <div className="controls">
        <label className="toggle">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto-refresh every 30s
        </label>
        <span>
          {loading && <span className="spinner" aria-hidden />}
          {data?.fetchedAt && (
            <>Last updated {new Date(data.fetchedAt).toLocaleTimeString()}</>
          )}
        </span>
      </div>

      {error && <div className="error">⚠ {error}</div>}

      {!error && data && data.matches.length === 0 && (
        <div className="empty">
          No live or recent matches found for &ldquo;{data.query}&rdquo;.
          {data.raw && (
            <>
              <br />
              <small>{data.raw}</small>
            </>
          )}
        </div>
      )}

      <div className="match-list">
        {data?.matches.map((m, i) => (
          <ScoreCard key={`${m.id ?? i}-${m.tournament ?? ""}`} match={m} />
        ))}
      </div>

      <div className="footer">
        Powered by{" "}
        <a href="https://serpapi.com" target="_blank" rel="noreferrer">
          SerpAPI
        </a>{" "}
        · scores sourced from Google search results · refreshed every 30s
      </div>
    </main>
  );
}
