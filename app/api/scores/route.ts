import { NextResponse } from "next/server";
import type { Match, MatchTeam } from "@/components/ScoreCard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_SECONDS = Number(process.env.SCORES_CACHE_TTL_SECONDS ?? "30");

interface CacheEntry {
  at: number;
  payload: ScoresResponse;
}
const cache = new Map<string, CacheEntry>();

interface ScoresResponse {
  query: string;
  fetchedAt: string;
  matches: Match[];
  source: string;
  raw?: string;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "cricket score").trim().slice(0, 120);

  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "SERPAPI_KEY is not set on the server." },
      { status: 500 },
    );
  }

  // Cache tier — protects free SerpAPI quota and speeds repeat queries.
  const now = Date.now();
  const hit = cache.get(q);
  if (hit && now - hit.at < TTL_SECONDS * 1000) {
    return NextResponse.json(hit.payload);
  }

  // Force cricket-context if user typed something too generic.
  const enhanced = /cricket|test|odi|t20|ipl|ashes|world cup/i.test(q)
    ? q
    : `${q} cricket score`;

  const params = new URLSearchParams({
    engine: "google",
    q: enhanced,
    api_key: apiKey,
    hl: "en",
    gl: "us",
    num: "10",
  });
  const serpUrl = `https://serpapi.com/search.json?${params.toString()}`;

  let serp: Record<string, unknown>;
  try {
    const r = await fetch(serpUrl, { cache: "no-store" });
    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json(
        { error: `SerpAPI returned ${r.status}: ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }
    serp = (await r.json()) as Record<string, unknown>;
  } catch (err) {
    return NextResponse.json(
      { error: `Network error contacting SerpAPI: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const matches = parseGoogleSports(serp);

  const payload: ScoresResponse = {
    query: q,
    fetchedAt: new Date().toISOString(),
    matches,
    source: "google_sports_results",
    raw: matches.length === 0 ? "Google didn't return a sports card for this query — try a more specific team, tournament, or match." : undefined,
  };

  cache.set(q, { at: now, payload });
  return NextResponse.json(payload);
}

/**
 * SerpAPI exposes Google's sports cards in a few possible shapes depending on
 * the query (single-match card vs. fixtures list vs. tournament group). This
 * normalizes whatever shows up into a flat Match[].
 */
function parseGoogleSports(serp: Record<string, unknown>): Match[] {
  const out: Match[] = [];
  const sports = serp["sports_results"] as Record<string, unknown> | undefined;
  if (!sports) return out;

  // Shape 1: a primary "game_spotlight"
  const spotlight = sports["game_spotlight"] as Record<string, unknown> | undefined;
  if (spotlight) {
    const m = mapSpotlight(spotlight);
    if (m) out.push(m);
  }

  // Shape 2: list of "games"
  const games = sports["games"];
  if (Array.isArray(games)) {
    for (const g of games) {
      const m = mapSpotlight(g as Record<string, unknown>);
      if (m) out.push(m);
    }
  }

  // Shape 3: tournaments / fixtures lists
  const fixtures = sports["fixtures"];
  if (Array.isArray(fixtures)) {
    for (const f of fixtures) {
      const m = mapSpotlight(f as Record<string, unknown>);
      if (m) out.push(m);
    }
  }

  // De-duplicate by team-pair + date
  const seen = new Set<string>();
  return out.filter((m) => {
    const key = `${m.teams[0]?.name ?? ""}|${m.teams[1]?.name ?? ""}|${m.date ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapSpotlight(g: Record<string, unknown>): Match | null {
  const teams: MatchTeam[] = [];
  // teams may be at "teams" (array) or split as "home_team"/"away_team"
  const teamArr = g["teams"];
  if (Array.isArray(teamArr)) {
    for (const t of teamArr) {
      const team = t as Record<string, unknown>;
      teams.push({
        name: stringOf(team["name"]) ?? "Unknown",
        score: stringOf(team["score"]),
        thumbnail: stringOf(team["thumbnail"]),
      });
    }
  } else {
    const home = g["home_team"] as Record<string, unknown> | undefined;
    const away = g["away_team"] as Record<string, unknown> | undefined;
    if (home) {
      teams.push({
        name: stringOf(home["name"]) ?? "Home",
        score: stringOf(home["score"]),
        thumbnail: stringOf(home["thumbnail"]),
      });
    }
    if (away) {
      teams.push({
        name: stringOf(away["name"]) ?? "Away",
        score: stringOf(away["score"]),
        thumbnail: stringOf(away["thumbnail"]),
      });
    }
  }
  if (teams.length === 0) return null;

  return {
    tournament: stringOf(g["tournament"]) ?? stringOf(g["league"]),
    stage: stringOf(g["stage"]) ?? stringOf(g["round"]),
    status: stringOf(g["status"]) ?? stringOf(g["game_status"]),
    date: stringOf(g["date"]) ?? stringOf(g["start_time"]),
    venue: stringOf(g["venue"]) ?? stringOf(g["stadium"]),
    detail:
      stringOf(g["snippet"]) ??
      stringOf(g["details"]) ??
      stringOf(g["summary"]) ??
      stringOf(g["spotlight_text"]),
    teams,
  };
}

function stringOf(v: unknown): string | undefined {
  if (typeof v === "string" && v.length) return v;
  if (typeof v === "number") return String(v);
  return undefined;
}
