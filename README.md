# Cricket Live Scores

A small Next.js 14 web app that shows the **latest cricket scores from Google**, fetched server-side via SerpAPI's Google Search engine. Auto-refreshes every 30 seconds.

![stack](https://img.shields.io/badge/Next.js-14-black) ![lang](https://img.shields.io/badge/TypeScript-5-blue) ![deploy](https://img.shields.io/badge/Vercel-ready-000)

## How it works

```
Browser  ->  /api/scores?q=...  ->  SerpAPI (engine=google)  ->  Google's sports card  ->  parsed Match[] JSON
```

The browser never talks to Google directly — your `SERPAPI_KEY` stays on the server, and the API route caches each query for 30 s to protect your quota.

## Local setup

```powershell
cd c:\Code\cricketlookup
npm install
Copy-Item .env.example .env.local
# edit .env.local and set SERPAPI_KEY
npm run dev
# open http://localhost:3000
```

Get a free SerpAPI key at https://serpapi.com (100 searches / month free, no card required).

## Deploy to Vercel

### One-shot from your machine
```powershell
npm install -g vercel
vercel login
vercel              # creates project + preview URL
vercel env add SERPAPI_KEY production
vercel env add SERPAPI_KEY preview
vercel env add SERPAPI_KEY development
vercel --prod       # promote to production
```

### From GitLab (CI/CD)

The included [.gitlab-ci.yml](./.gitlab-ci.yml) auto-deploys:
- **non-default branches** → Vercel preview
- **default branch (main)** → Vercel production

#### One-time setup

1. **Create the Vercel project locally first** so `.vercel/project.json` is generated:
   ```powershell
   vercel link
   Get-Content .vercel\project.json
   ```
   Note `orgId` and `projectId` from that file.

2. **Set GitLab CI/CD variables** at *Settings → CI/CD → Variables*:
   | Name | Value | Flags |
   |---|---|---|
   | `VERCEL_TOKEN` | Token from https://vercel.com/account/tokens | masked, protected |
   | `VERCEL_ORG_ID` | from `.vercel/project.json` | |
   | `VERCEL_PROJECT_ID` | from `.vercel/project.json` | |

3. **Set `SERPAPI_KEY` directly in Vercel** (Project → Settings → Environment Variables). Don't put it in GitLab — Vercel handles secrets per environment.

## Push to GitLab

```powershell
cd c:\Code\cricketlookup
git init
git add .
git commit -m "feat: initial cricket lookup app"
git branch -M main
git remote add origin git@gitlab.com:<your-username-or-group>/cricketlookup.git
git push -u origin main
```

GitLab will run the pipeline (install → lint → typecheck → build → deploy:production) and post the production URL in the pipeline output.

## Project layout

```
cricketlookup/
├─ app/
│  ├─ layout.tsx, page.tsx, globals.css     UI: search bar, quick chips, auto-refresh, score cards
│  └─ api/scores/route.ts                   server endpoint: SerpAPI -> normalized Match[]
├─ components/ScoreCard.tsx                 single match card with status pill + team rows
├─ vercel.json                              function memory/duration + security headers
├─ next.config.mjs
├─ .gitlab-ci.yml                           preview on branches, prod on main
├─ .env.example
└─ README.md
```

## Customize

- **Cache TTL** — change `SCORES_CACHE_TTL_SECONDS` in `.env.local` (default 30 s).
- **Default query** — edit `useState("cricket score")` in [`app/page.tsx`](./app/page.tsx).
- **Quick-search chips** — edit `QUICK_QUERIES` in [`app/page.tsx`](./app/page.tsx).
- **Auto-refresh interval** — change `30_000` in the same file.

## Notes & limits

- **SerpAPI free tier**: 100 searches/month. Each unique query counts; the 30 s server cache prevents the auto-refresh from burning your quota on a single open tab.
- **No data of your own is sent to Google** — the app only forwards your search query as a Google search.
- **Empty results** — Google only shows a sports card for queries it recognizes as sport-related. If a query returns no card, the UI prompts to refine it.
- **Rate limit** — for higher volume, consider adding [Upstash Ratelimit](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) at the `/api/scores` route.

## License

MIT.
