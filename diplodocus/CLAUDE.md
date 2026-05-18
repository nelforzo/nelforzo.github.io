# Diplodocus — agent notes

## Publishing to GitHub Pages

This repo is the **source of truth**. The live site is served from the parent monorepo:

| Role | Path |
|---|---|
| Development (this repo) | `/Users/frank/Developer/diplodocus` |
| GitHub Pages deploy target | `/Users/frank/Developer/nelforzo.github.io/diplodocus` |

Public URL: `https://nelforzo.github.io/diplodocus/`

After meaningful changes here, sync into the parent project, then commit and push **from the parent repo** (`nelforzo.github.io`), not from this repo.

### 1. Sync files

```bash
rsync -av \
  --exclude='.git' \
  --exclude='.claude' \
  /Users/frank/Developer/diplodocus/ \
  /Users/frank/Developer/nelforzo.github.io/diplodocus/
```

Review what changed:

```bash
cd /Users/frank/Developer/nelforzo.github.io
git status
git diff diplodocus/
```

### 2. Commit and push (parent repo)

```bash
cd /Users/frank/Developer/nelforzo.github.io
git add diplodocus/
git commit -m "Deploy Diplodocus: <short summary of changes>"
git push
```

Use commit messages in the same style as other deploys in that repo (e.g. `Deploy Diplodocus: restore EPUB on re-import`).

Do not commit `.DS_Store` or other junk from the parent repo root.

### Notes

- Only `diplodocus/` under the parent repo is updated; the homepage and other apps (`memoria`, `radio-memo`, etc.) are unchanged.
- GitHub Pages rebuilds automatically after push to `main` on `nelforzo/nelforzo.github.io`.
