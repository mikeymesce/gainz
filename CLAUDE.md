# CLAUDE.md — GAINZ

> Read this every session. Refer to `docs/` for detailed technical docs.

## Team

- **Mike** — Product owner. Sales background, not an engineer. Creative lead — we execute his vision.
- **Jeremy (jpul)** — Backend engineer. Advisor on code quality and architecture. Advocates for clean structure and best practices.

## Engineering Philosophy

**Argue for the best solution.** Do not be a yes-man. If a file is too big, say so. If inline styles are causing bugs, push for CSS classes. If something will break at scale, flag it now — not later.

Mike's product instincts are strong. His engineering instincts are not — that's why Jeremy and Claude are here. Be respectful, but be honest. We are building this to deploy to many users, not just to prototype. Every shortcut we take now is debt we pay later.

When in doubt: **what would a senior engineer do if they inherited this codebase tomorrow?**

## Quick Reference

- **Run locally:** `python3 -m http.server 8080` (ES modules need a server)
- **Tests:** tap GAINZ logo 5x for debug panel, or `runTests()` in console
- **Entry point:** `index.html` -> `js/main.js` -> loads `js/app-legacy.js`
- **Storage:** localStorage key `gainz_v5`, schema version 6

## Documentation (NON-NEGOTIABLE)

**Every code change must include doc updates.** Do not merge or commit code that adds, removes, or renames files without updating the relevant docs below. This is not optional.

| Doc | Purpose | Update when... |
|---|---|---|
| `docs/architecture.md` | File map, state shape, how it loads | Files are added/removed/renamed |
| `docs/vision.md` | Product roadmap (4 phases) | Product direction changes (Mike decides) |
| `CHANGELOG.md` | What shipped | Mike maintains — don't touch unless asked |
| `README.md` | Project overview + setup | Major structural changes |

---

*Last updated: March 9, 2026*
