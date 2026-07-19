# Rio — website

Static site for rio.trade (v3 redesign). No build step required.

## Publish with GitHub Pages

1. Create a new repository on GitHub (e.g. `rio-website`).
2. Upload everything in this folder to the repository root
   (drag and drop works: Add file → Upload files). Keep the
   `assets/` folder structure intact.
3. In the repository: Settings → Pages → under "Build and
   deployment", set Source to "Deploy from a branch", pick
   `main` and `/ (root)`, then Save.
4. Wait a minute or two. The site goes live at
   `https://<your-username>.github.io/<repo-name>/`

Notes
- `index.html` must sit at the repository root.
- `.nojekyll` tells GitHub to serve the files as-is.
- To use a custom domain later: Settings → Pages → Custom domain.
