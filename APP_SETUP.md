# Vehicle Maintenance Tracker App Setup

This repository already has the core parts of a browser app:

- **Markup (HTML):** `body.html` (main vehicle screen), `entries.html` (saved maintenance log)
- **Styling (CSS):** `style.css`
- **Scripting (JavaScript):** `script.js`
- **Data:** `vehicles.json`

## 1) Organize files as a simple web app

For a clean app structure, use this layout:

```text
Maintenance-Log/
  index.html           # rename from body.html
  entries.html
  assets/
    css/
      style.css
    js/
      script.js
    data/
      vehicles.json
```

If you keep the current flat structure, it still works; this organization is optional but recommended.

## 2) Update file references if you reorganize

In `index.html` and `entries.html`, update paths:

- CSS: `href="assets/css/style.css"`
- JS: `src="assets/js/script.js"`
- JSON fetch in JS: `fetch('assets/data/vehicles.json')`

## 3) Use one HTML entrypoint for the main page

Rename `body.html` to `index.html` so browsers/hosts serve it by default.

- In `entries.html`, change home link from `body.html` to `index.html`.

## 4) Run with a local server (important)

Because JavaScript loads `vehicles.json`, open with an HTTP server (not `file://`).

### Python

```bash
python3 -m http.server 5500
```

Then open:

- `http://localhost:5500/index.html`
- `http://localhost:5500/entries.html`

## 5) Current app behavior to keep in mind

- Vehicle list loads from `vehicles.json`.
- Maintenance updates are stored in `localStorage` key `maintenanceLog`.
- Entries page groups records by week and supports:
  - remove selected entries
  - download log as TXT

## 6) Suggested next improvements

- Move inline `<script>` in `entries.html` into `entries.js`.
- Add form validation and user-friendly empty-state messaging.
- Add `npm` tooling later (Vite/Parcel) only if you want modules, bundling, tests, or deployment pipelines.

## 7) Minimal production deployment options

For this static app, easy hosting options:

- GitHub Pages
- Netlify
- Vercel (static)

No backend is required for current features since data persistence is browser-local.
