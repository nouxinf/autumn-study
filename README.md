# autumn-study

This repository contains a small Pomodoro productivity web app. I split the original single-file app into separate assets for easier maintenance.

Files added/changed:

- `index.html` — now links to external CSS and JS (module-based).
- `styles.css` — extracted styles.
- `js/timer.js` — timer logic.
- `js/tasks.js` — tasks/notes persistence and helpers.
- `js/app.js` — app wiring and UI logic (module entrypoint).

How to run:

1. Open `index.html` in a browser that supports ES modules (modern Chrome/Edge/Firefox).
2. For local development, prefer serving the folder over HTTP (e.g., `npx http-server` or `python -m http.server`) to avoid module/file protocol issues.
