# Time Logger

A tiny private daily tracker for:

- daily working hours
- daily weight in kg

Open `index.html` in a browser. On first use, set a local access code. After unlocking, enter a date plus one or both numbers, and click **Save day**. Entries are stored in this browser's `localStorage` and plotted as two lines over time.

## Data

The app keeps data on the device/browser where you enter it. Use **Export** to download a JSON backup, and **Import** to restore that JSON in another browser.

The access code is also local to the browser. If you forget it, you can reset the app by clearing this site's browser storage, but that will also remove entries that were not exported.

## GitHub Pages privacy

This app is static HTML, CSS, and JavaScript, so it can be hosted with GitHub Pages. If the repository is public, everyone can read the app code. Do not put a secret access code directly in the source files.

The current lock protects your local browser view with a salted hash saved in `localStorage`; it does not create real server-side authentication for the public website. That is okay as long as your personal log data stays in browser storage and exported backups, not committed into the repository.

GitHub's docs say Pages works from private repositories on paid plans, but true private Pages access control is for GitHub Enterprise Cloud organization project sites. A private repository alone does not necessarily mean the published Pages site is visible only to you.

For a public repository setup:

1. Host only the app shell on Pages.
2. Keep the actual logs in browser storage and exported JSON backups.
3. Do not commit exported log data to the public repository.

If you later want the same data synced across devices, add an authenticated backend instead of committing the log data into the site.
