# Steady Volume

**Hear every word. Skip the jolts.** Films are mixed for cinemas, not living rooms: you turn it up to hear the dialogue, then an explosion blasts out. Steady Volume brings whispers up and explosions down, automatically.

This repository holds:

| | What | Where |
|---|---|---|
| **Browser extension** | Works on every site in Chrome, Edge, Firefox and more | `src/`, `popup/`, `welcome/` |
| **Website** | Free TV setup guide plus a demand test for the Steady Box | `site/` ([README](site/README.md)) |
| **TV plan** | How to bring it to the TV, competitors, next steps | [docs/tv-options.md](docs/tv-options.md) |
| **Testing guide** | Step-by-step checks on your own PC | [docs/TESTING.md](docs/TESTING.md) |

<p>
  <img src="docs/popup-light.png" width="280" alt="Steady Volume popup: large On switch, a live graph of the film's volume against what you hear, and Gentle, Balanced or Night">
  <img src="docs/popup-dark.png" width="280" alt="The same popup in dark mode">
</p>

## How it works

Every video and audio player is routed through a broadcast-style loudness chain:

| Stage | What it does | Why it matters |
|---|---|---|
| Rumble cut | Removes deep sub-bass | Takes the physical "thump" out of explosions |
| Dialogue lift | Gentle boost around 2.5 kHz | Clearer consonants, which older ears lose first |
| Leveler | Slowly raises quiet scenes, lowers loud ones | Holds still in silence, so hiss isn't pumped up |
| Compressor | Reacts in milliseconds | Catches a whisper turning into a shout |
| Limiter | Hard ceiling | Nothing gets past it |

The player's own volume slider is undone on the way in and reapplied on the way out, so turning a video down always works and the leveler never fights it.

Measured on a test soundtrack (whisper, explosion, dialogue, jump-scare, quiet dialogue):

| | Gap between quietest and loudest scene |
|---|---|
| Original | **39 dB** (about 15× louder, as heard) |
| Gentle | 18 dB |
| Balanced (default) | 12 dB |
| Night | **9 dB** |

### Copy-protected sites (Netflix, Disney+, Prime Video, Spotify…)

Chrome, Edge and Safari give extensions **silence** instead of sound for copy-protected media, and there's no undoing it without a reload. So Steady Volume never touches those players directly:

- **Chrome / Edge: tab mode.** The popup offers **"Turn on for this tab"**. Chrome hands over the tab's finished sound and Steady Volume processes that instead. It's one click per tab, and a small sharing icon shows on the tab while it's on.
- **Firefox:** processes protected media directly, so it's automatic everywhere.
- **Safari:** protected sites aren't supported yet.

Protection is detected from the player itself, from a list of known services, and from any site that turns out to be protected (remembered automatically). If a site switches to protected video mid-playback, a small notice offers a one-click reload.

## Browser support

| Browser | Package | Status |
|---|---|---|
| Chrome, Edge, Brave, Opera, Vivaldi | `dist/chromium` | Automated tests pass in a real Chrome |
| Firefox (desktop and Android) | `dist/firefox` | Passes Mozilla's `web-ext lint`; not yet run by hand |
| Safari (Mac, iPhone, iPad) | `dist/safari` | Needs a Mac to wrap and submit; not yet run by hand |

## Try it

See **[docs/TESTING.md](docs/TESTING.md)** for the full walkthrough. In short:

1. `npm install && npm run build` (or use a release zip).
2. Chrome: `chrome://extensions` › **Developer mode** › **Load unpacked** › `dist/chromium`.
3. Firefox: `about:debugging#/runtime/this-firefox` › **Load Temporary Add-on** › `dist/firefox/manifest.json`.
4. Safari (Mac): `xcrun safari-web-extension-converter dist/safari --app-name "Steady Volume"`, then run the Xcode project.

## Develop

```sh
npm install
npm run build     # per-browser packages and zips in dist/
npm test          # everything below
npm run site      # preview the website at http://localhost:4173
npm run icons     # re-render icons/icon.svg to PNGs
```

`npm test` runs, in order:

1. **Build** of all three browser packages.
2. **Firefox lint** with Mozilla's official checker.
3. **Offline audio tests:** a synthetic soundtrack through every preset, checking loudness gaps, peak ceilings and the volume slider.
4. **Extension tests** in a real Chrome (a virtual display is used automatically on Linux without one): capture, cross-origin safety, protected media, tab mode with real audio, popup controls, settings persistence.
5. **Website tests:** every TV guide, form validation, sign-up delivery, failure handling, phone layout, no-JavaScript fallback.

| File | Purpose |
|---|---|
| `src/engine.js` | The audio chain and presets. Plain Web Audio, no dependencies. |
| `src/content.js` | Runs on every page; finds players and routes them through the engine safely. |
| `src/sites.js` | Known copy-protected services. |
| `src/background.js` | Welcome page on install; runs tab mode on Chrome and Edge. |
| `src/offscreen.*` | Hidden page that processes a tab's sound in tab mode. |
| `popup/` | Toolbar popup: switch, live graph, strength, tab mode. |
| `welcome/` | First-run page; grants site access where the browser requires it. |
| `tools/build.mjs` | Builds the Chromium, Firefox and Safari packages from one source. |

## Known limits

- **Cross-origin players without CORS are skipped**, because the browser would otherwise mute them. Big services use Media Source streams, which work.
- **The first sound on a page may play unprocessed** until you click or press a key; browsers don't let audio processing start earlier. Pressing play counts.
- **Sites that already run their own Web Audio on the player** are left alone.
- **Tabs opened before install** need a reload.
- **Tab mode lip-sync** hasn't been measured on real hardware yet; it's the top item in the testing guide.

## Roadmap

1. Hands-on test on your PC ([docs/TESTING.md](docs/TESTING.md)), then with 2–3 people from the target group.
2. Connect the website's sign-up backend and run the demand test ([site/README.md](site/README.md)).
3. Store listings: Chrome Web Store, Edge Add-ons, Firefox Add-ons.
4. "Off on this site" option.
5. Safari build and App Store submission.
6. The Steady Box, if the demand test says yes ([docs/tv-options.md](docs/tv-options.md)).
