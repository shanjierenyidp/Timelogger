# Time Logger

A tiny private daily tracker for:

- daily working hours
- daily weight in kg

Open `index.html` in a browser, enter a date plus one or both numbers, and click **Save day**. Entries are stored in this browser's `localStorage` and plotted as two lines over time.

## Data

The app keeps data on the device/browser where you enter it. Use **Export** to download a JSON backup, and **Import** to restore that JSON in another browser.

## GitHub Pages privacy

This app is static HTML, CSS, and JavaScript, so it can be hosted with GitHub Pages. GitHub's docs say Pages works from private repositories on paid plans, but true private Pages access control is for GitHub Enterprise Cloud organization project sites. A private repository alone does not necessarily mean the published Pages site is visible only to you.

For personal private data, the safest current setup is:

1. Keep the repository private.
2. Host only the app shell on Pages.
3. Keep the actual logs in browser storage and exported JSON backups.

If you later want the same data synced across devices, add an authenticated backend instead of committing the log data into the site.
