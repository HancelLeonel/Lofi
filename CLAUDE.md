# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Lofi Café: a static, dependency-free web page (like lofi.cafe) that plays YouTube livestreams as audio only. Vanilla HTML/CSS/JS, no build step, no tests, no package manager. Deployed to GitHub Pages from `main` (repo root); remote is `HancelLeonel/Lofi`, so pushing to `main` publishes at https://hancelleonel.github.io/Lofi/ (all asset paths are relative so the `/Lofi/` subpath works).

## Running locally

Serve over HTTP; do not open `index.html` via `file://`. The YouTube IFrame API rejects embeds without an origin (errors 150/153).

```
python -m http.server 8000   # then open http://localhost:8000
```

## Architecture

Scripts load in this order in `index.html`: `streams.js` → `app.js` → YouTube IFrame API (which calls the global `window.onYouTubeIframeAPIReady` defined in `app.js`).

- `streams.js` defines the global `STREAMS` array. It is only the **seed list**: used on first visit and by the "Restaurar lista" button. Editing it does not affect browsers that already have saved stations.
- `app.js` holds all state in the `stations` array (`{ id, title, name }`) persisted to `localStorage` under `lofi-cafe-stations`. `title` is fetched from YouTube's oEmbed endpoint (no API key); `name` is an optional user override that takes priority (see `label()`). Current station is tracked by video `id`, not by index.
- The UI has a normal mode and an edit mode (`body.editing` class toggles edit-only controls via CSS). `render()` rebuilds the whole list from `stations`.
- Audio-only is achieved by hiding the player container with CSS (`#player-wrap.hidden`). The IFrame API has no audio-only mode, so video data is still downloaded; hiding does not save bandwidth.
