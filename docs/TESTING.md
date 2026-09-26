# Testing Steady Volume on your PC

About 45 minutes. You need Chrome or Edge. Firefox is a bonus round at the end.

---

## 1. Install (5 minutes)

1. Download **`steady-volume-chromium-0.2.0.zip`**.
2. Unzip it somewhere it will **stay**, for example `Documents\Steady Volume`. Don't use your Downloads folder: if the folder is deleted or moved, the extension stops working.
3. In Chrome, go to `chrome://extensions` (Edge: `edge://extensions`).
4. Turn on **Developer mode** (top right in Chrome, left sidebar in Edge).
5. Click **Load unpacked** and select the folder that **directly contains `manifest.json`**. Picking the folder above it is the most common mistake.
6. A welcome page should open saying **"You're all set"**.
7. Click the puzzle-piece icon in the toolbar and **pin** Steady Volume so its icon is always visible.

> Chrome may show a "Disable developer mode extensions" warning at start-up. That's normal for extensions not installed from the store; click to keep it.

---

## 2. The checks

Keep your **computer's volume the same throughout**, so you're judging the extension and not the volume knob.

### A. Does it start by itself? (YouTube)

- [ ] Play any YouTube video. Click the Steady Volume icon.
- [ ] The pill in the top right says **Working**, and the graph is moving.
- [ ] The grey area (**Film**) jumps around; the teal line (**You hear**) stays much flatter.

### B. The real test: whisper then bang

Use a film you know has quiet talking followed by something loud. **A Quiet Place** is ideal (whispers and jump-scares), as are **Tenet**, **Dunkirk** or **Oppenheimer**. Pick one scene of about 3 minutes.

- [ ] Watch it with Steady Volume **Off** (click the big switch). Note how often you'd reach for the volume.
- [ ] Rewind and watch the same scene **On** (Balanced).
- [ ] Try it again on **Night**.

Rate each: *could you hear the quiet parts? did the loud parts make you jump?*

### C. Netflix, Disney+ or Prime Video (the most important check)

These sites are copy-protected, so they work differently. You switch them on with one click per tab.

- [ ] Open the site and start a film. Click the Steady Volume icon.
- [ ] It should say **"netflix.com needs one click"**. Click **Turn on for this tab**.
- [ ] A small sharing/recording icon appears on the tab. That's expected.
- [ ] The pill says **Working** and the graph moves.
- [ ] **Sound never cuts out** at any point (before, during or after switching on).
- [ ] **Lip-sync:** watch someone talking close-up for a minute. Do the words match the lips? *This is the one thing I couldn't measure in testing, so your answer really matters.*
- [ ] Repeat scene B here if the film is available.

### D. Controls behave

- [ ] Turn **YouTube's own volume slider** down to about 20%. The sound gets quieter and **stays** quieter; Steady Volume must not push it back up.
- [ ] Switch Off/On while playing. The change is instant and there are no pops or clicks.
- [ ] Switch between Gentle, Balanced and Night while playing. The change is smooth.
- [ ] Pause, skip forward, go fullscreen, move to the next episode. Nothing breaks.

### E. Everyday sites

Try 2–3 sites you actually use: BBC iPlayer, a news site, Facebook videos, Spotify, a podcast site…

- [ ] Sound always plays. **Any silence at all is a critical bug**, so please report it straight away (see below).
- [ ] Note what the popup says on each.

### F. Firefox (bonus)

1. Go to `about:debugging#/runtime/this-firefox` › **Load Temporary Add-on** › select `manifest.json` from the unzipped **firefox** zip.
2. In Firefox, Netflix and similar sites should work **automatically**, with no "one click" needed.
3. Firefox removes temporary add-ons when it closes; that's normal for testing.

---

## 3. If something goes wrong

| What happened | What to do |
|---|---|
| A video is silent | Switch Steady Volume **Off**, reload the page. Then send me the site and what you clicked. |
| Popup says "Reload it once" | The page was open before you installed. Reload it. |
| Popup says "Click anywhere on the page" | Chrome waits for a click before it allows audio processing. Click the page once. |
| "Couldn't switch on for this tab" | Reload the page and try again. Tell me which site it was. |

---

## 4. What to send back

Copy this and fill it in. Short answers are fine.

```
Browser + version:
Speakers or headphones:

A. YouTube starts by itself?            yes / no
B. Film + scene used:
   Off:      quiet parts audible? __  loud parts made me jump? __
   Balanced: quiet parts audible? __  loud parts made me jump? __
   Night:    quiet parts audible? __  loud parts made me jump? __
C. Streaming site used:
   Tab mode switched on OK?              yes / no
   Sound ever cut out?                   yes / no
   Lip-sync OK?                          yes / slightly off / clearly off
D. Volume slider respected?              yes / no
   Any pops/clicks when switching?       yes / no
E. Sites tried + anything odd:
Best preset for me:
Would I leave it on all the time?        yes / no / why:
Anything that looked or felt unpolished:
```

Once you're happy, the next step is the same test with **2–3 people from the target group**. Watch them use it rather than explaining it; where they hesitate is your next design fix.
