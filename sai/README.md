# サイコロ (Hiragana Dice)

A single-page HTML/CSS/vanilla JS app for toddlers. Tap anywhere to spin three dice; after a short animation they land on a random three-kana word from a kid-friendly list.

## Run locally

Service workers require HTTP (not `file://`):

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) in landscape orientation.

## Offline use

After the first load over HTTP, the service worker caches the app shell. You can roll the dice without an active network connection.

## Files

- `index.html` — app shell and dice markup
- `styles.css` — landscape layout and spin animation
- `app.js` — tap handling, word selection, animation timing
- `words.js` — toddler-friendly 3-kana word list
- `sw.js` — offline cache
