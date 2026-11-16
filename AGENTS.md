# forgineer.github.io

Personal GitHub Pages landing page, portfolio, and collection of lightweight utility and fun web apps.

## Stack & Hosting
- Pure static site hosted on GitHub Pages — no build step, bundler, or server-side backend.
- Uses vanilla HTML/CSS/JS with self-hosted Bootstrap 5 and Bootstrap Icons in `static/`. Keep dependencies vendored locally rather than relying on external CDNs unless requested.
- Avoid apps that require server-side proxies or fail under browser CORS restrictions unless they work cleanly client-side.

## Project Structure
- `index.html`: Main landing page, navbar, and portfolio links (Projects, Demos, Apps).
- `static/`: Shared CSS, JS, fonts, icons, and images.
- `<app-name>/index.html`: Standalone utility or fun apps. Keep each app self-contained in its own directory while reusing `static/` assets where appropriate.

## Conventions
- Preserve the dark/Matrix aesthetic and responsive Bootstrap layout on the main landing page.
- Keep the navigation bar consistent across `index.html` and all sub-app pages (same links and dropdowns, with relative paths adjusted per directory).
- Use relative paths carefully so both root (`index.html`) and sub-app pages (`<app>/index.html`) resolve `static/` assets cleanly.
- Do not remove commented-out nav or page items unless asked.
