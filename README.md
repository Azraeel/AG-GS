# AG-GS

AG-GS is now set up as a static GitHub Pages dashboard for the nation roleplay sheets and automation scripts.

## Website

- Open `index.html` locally to preview the dashboard.
- GitHub Pages publishes this repo at `https://azraeel.github.io/AG-GS/` and the custom domain `https://aggsworld.net/`.
- The included workflow deploys the root of the repo when changes are pushed to `main`.
- The public website is a read-only Global Ledger. The admin workspace lives at `/admin/` and contains the editor, simulation controls, reset tools, and exports.

## Data Accuracy

The website uses the 2026-05-27 operating baseline from `Event Creator Tracker.xlsx`. Populated trade and budget outputs include adjustment offsets so recalculating the current year preserves the baseline. Blank cells are stored as unknown until edited. Use the Audit view on the site to see which active nations are missing values from each dataset.

Browser edits are cached in local storage. With the Cloudflare Worker deployed, admin edits also publish to the shared live ledger. They do not write back to GitHub automatically; use the export controls in the Simulation tab when you want to preserve an updated dataset in the repo.

## Admin Access

Protect `https://aggsworld.net/admin` and `https://aggsworld.net/admin/*` with Cloudflare Access so only approved users can open the editor and simulation workspace. The static app does not include an in-page password system; access control should happen before the page is served.

## Live Sync

The browser app can use a Cloudflare Worker and KV namespace for shared live state. Public pages poll `https://aggsworld.net/api/state` for read-only updates. The admin workspace publishes through `https://aggsworld.net/admin/api/state`, which should remain covered by the existing `/admin/*` Cloudflare Access policy.

1. Create a Workers KV namespace named `AGGS_LEDGER`.
2. Copy `wrangler.example.toml` to `wrangler.toml`.
3. Replace `REPLACE_WITH_KV_NAMESPACE_ID` with the namespace ID.
4. Deploy the Worker with Wrangler.
5. In the admin Simulation view, click **Publish Live State** once to seed the shared ledger.

After that, admin edits publish to KV and open public pages refresh from the shared state every few seconds. If the Worker is not deployed, the website stays usable in local browser fallback mode.

## Pages Setup

1. In GitHub, open **Settings -> Pages**.
2. Set **Build and deployment** to **GitHub Actions**.
3. Push to `main` or run the **Deploy GitHub Pages** workflow manually.

The `CNAME` file points GitHub Pages to `aggsworld.net`.

If GitHub reports that the current plan does not support Pages for this repository, the repo must either be made public or moved to a GitHub plan that supports Pages from private repositories.
