# Daily Todo v1.0

A local-first daily planner for one-off tasks, recurring routines, streaks and quiet history. Data stays in your browser.

## What it is

Daily is a small productivity app with four surfaces:

- **Today** — Morning / Afternoon / Evening lists, filters and a day score
- **Routines** — daily, weekday and weekly repeats with pause/resume and streaks
- **History** — closed-day records and a 7-day consistency view
- **Settings** — theme, default section, business-day start, export/import, reset

There is no account, no cloud sync and no server.

## Install

Requires Node.js 20+.

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`.

```bash
npm run test
npm run lint
```

## Build

```bash
npm run build
npm run preview
```

The production files are written to `dist/`.

## How data is stored

Everything lives in `localStorage` under `daily.todo.v3`.

On first launch the app also looks for older keys (`daily.todo.v2`, `daily.tasks`, `daily.history`) and migrates them.

The business-day key is not midnight unless you set **Day starts at** to `00:00`. If the start time is `04:00`, 03:59 still belongs to the previous day. That same boundary is used for Today, Daily Reset, carry-over, routines, streaks and history.

Incomplete one-off tasks keep their identity and move forward with a `carriedFrom` date. Completed tasks and routine occurrences do not carry over. Routine definitions are separate from a given day's occurrence.

## Export / import

Settings → **Export backup** downloads a JSON file.

**Import backup** validates the file, shows a confirm summary, then replaces local data. A malformed file is rejected and the current data is left untouched.

Reset clears Daily keys in this browser only.

## Deploy on GitHub Pages

Live URL after the first successful deploy:

**https://danpaaku.github.io/daily-todo/**

1. Create a public repo named `daily-todo` under `danpaaku`.
2. Push this project to `main`.
3. In the repo open **Settings → Pages**.
4. Set **Source** to **GitHub Actions**.
5. Open the **Actions** tab and confirm the **Deploy GitHub Pages** workflow is green.

The workflow builds `dist/` and publishes it. After that, install from the HTTPS URL:

- iPhone / iPad: Safari → Share → **Add to Home Screen**
- Android Chrome: menu → **Install app**
- Desktop Chrome / Edge: install icon in the address bar

The app is built with a relative base (`./`), so it works at `/daily-todo/`. The service worker uses network-first navigation so later pushes update the installed app.

## Limits

- Data never leaves the browser unless you export it. Clearing site data deletes it.
- There is no multi-device sync.
- Very large histories still work, but this is a personal daily tool, not a multi-user database.
- Offline works after the first successful load of a given build.
- Custom day-start changes take effect immediately; moving the boundary backward does not invent extra history.
