# Packwise — weather-smart trip packing

A single-page app for multi-stop trips: real forecasts (Open-Meteo, no API key),
a packing list generated from weather + activities + trip length, a laundry toggle
that compacts quantities, and a closet you pack from by tapping your own clothes.

## Files
```
packwise/
├── index.html                 the whole app (demo mode works with no setup)
├── manifest.webmanifest       home-screen / PWA metadata
├── apple-touch-icon.png       home-screen icon (iOS)
├── icon-192.png / 512 / 1024  app icons
├── netlify.toml               Netlify build/functions config
└── netlify/functions/
    └── airtable.js            optional secure proxy (only for Airtable mode)
```

## Move between iPhone, iPad, and Mac (no account needed)
Setup tab → **Export backup** downloads a `.json` file containing your trip,
closet (photos included), packing list, and outfits. Save it to **iCloud Drive**
(or AirDrop it) and on the other device use **Import backup**. That's your sync.

## Add to Home Screen
Open the deployed site in Safari → Share → **Add to Home Screen**. It installs
as "Packwise" with the suitcase icon and launches full-screen like an app.


## Quick start (no setup)
Open `index.html` in a browser. It boots in Demo mode with a sample trip and
closet, saved in your browser's localStorage. Everything works except writing
to Airtable.

## Deploy to Netlify (Live mode)

1. **Create the Airtable base** with three tables (field names matter):
   - **Closet** — `Name` (text), `Category` (single select), `Color` (text),
     `Warmth` (number 1–5), `Tags` (multi-select), `Photo` (attachment)
   - **Trips** — `Name` (text), `StartDate` (date), `Destinations` (long text)
   - **Packing** — `TripName` (text), `Text` (text), `Category` (text),
     `Qty` (number), `Packed` (checkbox), `Reason` (text)

2. **Get an Airtable personal access token** (airtable.com → Builder hub →
   Personal access tokens) with `data.records:read` + `data.records:write`
   scopes, granted to this base. Copy your Base ID (`app…`) from the API docs.

3. **Push this folder to a Git repo** (GitHub/GitLab) and create a new Netlify
   site from it — or drag the folder into Netlify's "deploy manually" box.

4. **Add the token as an environment variable** in Netlify:
   Site settings → Environment variables → `AIRTABLE_PAT` = your token.
   The token stays on the server; the browser never sees it.

5. **Open the deployed site**, go to the **Setup** tab, paste your **Base ID**,
   and switch the toggle (top right) to **Live**. Add closet photos in Airtable
   (or via the in-app "+ Add closet item"), and they'll load automatically.

## Notes
- Forecasts are live up to ~16 days out; beyond that the app shows typical
  conditions for that time of year (same dates, prior year) and labels it.
- Demo data lives only in your browser; "Reset demo data" is on the Setup tab.
- No keys are needed for weather — Open-Meteo is open and free.
