# AG-GS

AG-GS is now set up as a static GitHub Pages dashboard for the nation roleplay sheets and automation scripts.

## Website

- Open `index.html` locally to preview the dashboard.
- GitHub Pages can publish this repo at `https://azraeel.github.io/AG-GS/`.
- The included workflow deploys the root of the repo when changes are pushed to `main`.
- The website now runs as an operational browser app: edit nation data, recalculate systems, advance years, reset to baseline, and export updated JSON or `data.js`.

## Data Accuracy

The website dataset is imported from `Event Creator Tracker.xlsx` provided on 2026-05-27. Workbook values are treated as the source of truth; populated trade and budget outputs include imported adjustment offsets so recalculating the current year preserves the workbook baseline. Blank workbook cells are stored as unknown until edited. Use the Audit view on the site to see which nations are missing values from each dataset.

Browser edits are stored in local storage. They do not write back to GitHub automatically; use the export controls in the Simulation tab when you want to preserve an updated dataset.

## Pages Setup

1. In GitHub, open **Settings -> Pages**.
2. Set **Build and deployment** to **GitHub Actions**.
3. Push to `main` or run the **Deploy GitHub Pages** workflow manually.

For an owner-level `.io` site later, rename or create the repository as `Azraeel.github.io`. For this repository, the Pages URL is the project site path above.

If GitHub reports that the current plan does not support Pages for this repository, the repo must either be made public or moved to a GitHub plan that supports Pages from private repositories.
