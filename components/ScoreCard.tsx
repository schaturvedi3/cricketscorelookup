export interface MatchTeam {
  name: string;
  score?: string;
  thumbnail?: string;
}

export interface Match {
  id?: string;
  tournament?: string;
  status?: string;
  stage?: string;
  date?: string;
  venue?: string;
  teams: MatchTeam[];
  /** Free-form details line: "India needs 42 runs in 28 balls" etc. */
  detail?: string;
  /** Inferred bucket for styling: live | done | upcoming. */
  bucket?: "live" | "done" | "upcoming";
}

function classify(status?: string): "live" | "done" | "upcoming" {
  const s = (status ?? "").toLowerCase();
  if (/live|in progress|stumps|innings/.test(s)) return "live";
  if (/won|finish|result|drawn|tie|abandoned|complete/.test(s)) return "done";
  if (/start|upcoming|preview|scheduled|tomorrow|today/.test(s)) return "upcoming";
  if (/\b\d+\/\d+\b/.test(status ?? "")) return "live";
  return "upcoming";
}

export default function ScoreCard({ match }: { match: Match }) {
  const bucket = match.bucket ?? classify(match.status);
  const a = match.teams[0];
  const b = match.teams[1];
  const aHasScore = !!a?.score;
  const bHasScore = !!b?.score;

  return (
    <article className="card">
      <div className="top">
        <span>
          {match.tournament ?? "Cricket match"}
          {match.stage ? ` · ${match.stage}` : ""}
        </span>
        <span className={`status ${bucket}`}>{match.status ?? bucket}</span>
      </div>

      <div className="teams">
        {a && (
          <div className={`team ${bucket === "done" && !aHasScore ? "dim" : ""}`}>
            <span className="name">{a.name}</span>
            <span className="score">{a.score ?? "—"}</span>
          </div>
        )}
        {b && (
          <div className={`team ${bucket === "done" && !bHasScore ? "dim" : ""}`}>
            <span className="name">{b.name}</span>
            <span className="score">{b.score ?? "—"}</span>
          </div>
        )}
      </div>

      {(match.detail || match.venue || match.date) && (
        <div className="detail">
          {match.detail ?? ""}
          {match.detail && (match.venue || match.date) ? " · " : ""}
          {match.venue ?? ""}
          {match.venue && match.date ? " · " : ""}
          {match.date ?? ""}
        </div>
      )}
    </article>
  );
}
