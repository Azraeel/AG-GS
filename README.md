# AG-GS

AG-GS is now set up as a static GitHub Pages dashboard for the nation roleplay sheets and automation scripts.

## Website

- Open `index.html` locally to preview the dashboard.
- GitHub Pages publishes this repo at `https://azraeel.github.io/AG-GS/` and the custom domain `https://aggsworld.net/`.
- The included workflow deploys the root of the repo when changes are pushed to `main`.
- The public website is a read-only Global Ledger. The admin workspace lives at `/admin/` and contains the editor, simulation controls, reset tools, and exports.

## Data Accuracy

The website uses the 2026-05-27 operating baseline from `Event Creator Tracker.xlsx`. Populated trade and budget outputs include adjustment offsets so recalculating the current year preserves the baseline. Blank cells are stored as unknown until edited. Use the Audit view on the site to see which active nations are missing values from each dataset.

Browser edits are stored in local storage. They do not write back to GitHub automatically; use the export controls in the Simulation tab when you want to preserve an updated dataset.

## Admin Access

Protect `https://aggsworld.net/admin` and `https://aggsworld.net/admin/*` with Cloudflare Access so only approved users can open the editor and simulation workspace. The static app does not include an in-page password system; access control should happen before the page is served.

## Pages Setup

1. In GitHub, open **Settings -> Pages**.
2. Set **Build and deployment** to **GitHub Actions**.
3. Push to `main` or run the **Deploy GitHub Pages** workflow manually.

The `CNAME` file points GitHub Pages to `aggsworld.net`.

If GitHub reports that the current plan does not support Pages for this repository, the repo must either be made public or moved to a GitHub plan that supports Pages from private repositories.
