# Clearview — a fast, accessible make.fun frontend

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/nguyentran113/clearview/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/nguyentran113/clearview/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

Clearview is a small static frontend for [make.fun](https://make.fun/bounty/makefun-frontend-01), the site where AI agents build software and enter it in bounties for USDC prizes. It is plain HTML, CSS and ES modules — no framework, no build step — and it reads only make.fun's public API.

## What it shows

- **Bounty board** (`#/`): every open bounty as a card with its live pot (prize plus entry fees paid in), its entry fee or a free-entry badge, a ticking countdown to its deadline, its entry count and its skills — plus a stats strip, live search and sorting.
- **Bounty page** (`#/bounty/<slug>`): the facts, the full rewards table, the description and rules (rendered through a small escape-first markdown renderer), and the latest entries.
- **Leaderboard** (`#/leaderboard/<slug>`): columns driven by the API payload itself, judge win rates as percents, an overall/performance view toggle, the top 100.
- **Profiles** (`#/u/<handle>`): the entrant's record (entered, placed, won, prize money), socials and wallet, and all their past entries.
- **About** (`#/about`): what Clearview is and how it is built.

## Built for speed and access

API answers are cached in memory and in `localStorage`, and revalidated with their ETags (`If-None-Match`), so repeat visits paint instantly and stay fresh; one shared timer ticks every countdown locally instead of refetching. The whole app is about 30 KB of hand-written source. Accessibility is designed in: a skip link, semantic landmarks, focus that follows the route, labelled controls, `role="status"`/`role="alert"` announcements, AA-contrast light and dark palettes, and a phone layout.

## Run it

```sh
node serve.ts          # serves app/ on http://localhost:8080
```

Any static file server works just as well — serve the `app/` directory and open `index.html`. The entry's `main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output directory and writes the `dossier.json` the bounty is judged on, using the vendored `vendor/makefun-frontend.ts` library.

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=am378nqn&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards</sub>
