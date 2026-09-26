# Steady Volume website (proof of concept)

A single-page site that does two jobs:

1. **Helps people tonight, for free:** a pick-your-TV guide to the hidden levelling setting on each brand.
2. **Tests demand for the Steady Box:** a reservation form with a visible price, plus a beta sign-up for the browser extension.

Plain HTML, CSS and JavaScript: no framework, no build step, and it loads fast on old devices.

## Preview it

```sh
npm run site     # then open http://localhost:4173
```

## Before going live

**1. Connect a place for sign-ups to go.** Until you do, sign-ups are kept only in the visitor's own browser. That's fine for demos, but useless live. Set `signupEndpoint` in `config.js` to any URL that accepts a JSON `POST`. Easy options:

| Option | Effort | Notes |
|---|---|---|
| Formspree, Basin, Getform | 10 minutes, no code | Free tiers; sign-ups arrive by email and in a dashboard |
| Google Sheets via Apps Script | 30 minutes | Free; each sign-up becomes a row |
| Supabase table plus an edge function | 1–2 hours | Best if this grows into a real product. I can set this up for you. |

The site sends records like these:

```json
{ "type": "box_reservation", "email": "…", "for": "parent", "tv": "lg", "price": "£79", "at": "…", "page": "/" }
{ "type": "extension_beta", "email": "…" }
{ "type": "guide_feedback", "brand": "sony", "worked": false }
{ "type": "event", "event": "hero_tv" }
```

**2. Choose the price.** Set `boxPrice` in `config.js`. This is part of the test (see below).

**3. Add a privacy notice.** You're collecting email addresses, so under UK GDPR and similar laws you need a short privacy page: who you are, what you collect, why, how long you keep it, and how to be removed. Link it from the footer.

**4. Host it.** Any static host works: Vercel, Netlify, Cloudflare Pages or GitHub Pages. Upload the `site` folder as is.

## Reading the demand test

The numbers that matter, and roughly what good looks like for a pre-launch page with targeted traffic:

| Signal | What it tells you | Encouraging |
|---|---|---|
| Visitors who **reserve a Box** (with a price shown) | Real willingness to pay | 3–5% or more of visitors from targeted ads or communities |
| **"For a parent"** share | Who the buyer is: the viewer or their family | Shapes marketing and packaging |
| TV guide **"Not quite"** rate | How often built-in settings fail | High means a strong case for the Box |
| Brands chosen | Which sockets and remotes the Box must support first | — |
| Extension beta sign-ups | Computer-viewing demand | — |

**Price testing:** run the page at one price (e.g. £79) for a set number of visitors, then another (e.g. £59 or £99) for the same number, and compare reservation rates. Change one thing at a time.

**Traffic:** friends and family will be kind. The test only counts with strangers, for example a small paid ad aimed at adults aged 45–65 interested in caring for parents, or posts in carers' communities (following each community's rules).

## Content notes

- TV menu paths were checked against manufacturer help pages and reputable guides (September 2026). Menus change with software updates, which is why each guide includes what to look for and a "Did this work?" button.
- Brand names appear as plain text, not logos, with a trademark notice.
- The "39 dB → 12 dB" figure comes from the extension's automated test soundtrack (`test/offline.test.mjs`). Keep it that honest in all marketing.

### Sources for the TV guides

- Samsung: [Samsung support, Auto Volume](https://www.samsung.com/au/support/tv-audio-video/smart-tv-how-do-i-use-auto-volume/)
- Sony: [Sony support, preventing sudden volume changes](https://www.sony.co.uk/electronics/support/articles/00173903) · [Sony help guide, Advanced auto volume](https://helpguide.sony.net/tv/nga1/v1/en-142/contents/TP1002006223.html)
- Apple TV: [Apple support, video and audio settings](https://support.apple.com/guide/tv/adjust-video-and-audio-settings-atvba773c3c9/17.0/tvos/17.0)
- Roku: [Roku support, managing volume levels](https://support.roku.com/article/manage-volume-levels) · [Pocket-lint](https://www.pocket-lint.com/roku-volume-leveling-mode-feature/)
- Fire TV: [AFTVnews](https://www.aftvnews.com/amazon-fire-tv-cube-can-now-enhance-dialogue-audio-and-equalize-volume-levels/)
- LG, Samsung, Roku overview: [SmartHomeOwl](https://smarthomeowl.com/how-to-keep-tv-volume-constant/)
- Hisense: [Hisense TV manual (ManualsLib)](https://www.manualslib.com/manual/801548/Hisense-Tv.html?page=16)
- Vizio: [Vizio support, audio settings](https://support.vizio.com/s/article/Volume-Problems-Fluctuations?language=en_US)
