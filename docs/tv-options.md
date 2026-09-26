# Steady Volume on the TV: options review

**Question:** Most of the people who complain about whisper-then-bang audio watch on a TV, not a laptop. How do we get Steady Volume there, in a way they'd actually use and pay for?

**Short answer:** Build a small box that sits on the TV's **audio output**, not its video input. It connects by **HDMI ARC** (with optical and headphone-jack fallbacks), runs the same audio chain as the browser extension, and is controlled with the TV remote the person already has. Before building it, validate demand cheaply.

---

## 1. Why the TV's built-in setting isn't enough

Most TVs already have some form of levelling:

| Platform | Where the setting lives |
|---|---|
| Roku | Star button › Sound Settings › Sound Mode › Customize Sound Mode › Volume Leveling |
| Samsung | Settings › Sound › Expert Settings › Auto Volume |
| LG (webOS 6+) | Settings › All Settings › Sound › Advanced Custom Settings › Auto Volume Control |

That's four or five menus deep, named differently on each brand. Much of it was designed for **loud adverts between programmes**, not **loud scenes within a film**, so it's often weak at the whisper-to-explosion problem. That fits what you're hearing: people complain, and nobody has found the setting.

**Our angle:** it works the moment it's plugged in. There's no menu, and it's tuned for films rather than adverts.

---

## 2. How audio leaves a TV

The TV decodes every app, channel and HDMI device into one audio stream, then sends it to its speakers or out of a socket. If we take the sound from that socket, **we cover everything the TV plays**: Netflix, cable, DVD, the grandchildren's games console. Most TVs have one or more of these sockets:

| Socket | What it is | Pros | Cons |
|---|---|---|---|
| **HDMI ARC / eARC** | The HDMI port labelled "ARC" | Universal on TVs from about 2012 on. **The TV remote's volume buttons control the box** (via HDMI-CEC). The box can tell the TV "send me plain stereo", so no Dolby licence is needed. | Most expensive to build (HDMI licensing and chips). |
| **Optical (Toslink)** | Small square socket with a red light | Very common, cheap to build. | The TV remote often **can't** change the volume. The TV may send Dolby-encoded audio unless someone changes a setting to "PCM". |
| **3.5 mm headphone jack** (the "MP3 jack") | Same socket as on headphones | Cheapest and simplest. Plain analogue sound, no formats to worry about. | **Many newer TVs no longer have one.** On some TVs, plugging in mutes the TV speakers, and the volume can be fixed or variable depending on the model. |
| Bluetooth | Wireless | No cable. | Lip-sync delay, pairing is fiddly for the target user, and it's not on every TV. |

**Your 3.5 mm idea works**, but only on some TVs. A product that relies on it will fail in a lot of homes. Support ARC first, and add optical and 3.5 mm as fallbacks so it works with any TV.

---

## 3. The options

### Option A: Audio box on the TV's output (recommended)

```
                     HDMI ARC / optical / 3.5 mm
   ┌────────┐       ─────────────────────────────▶  ┌──────────────┐        ┌───────────────┐
   │   TV   │                                        │ Steady box   │ ─────▶ │ Speaker       │
   │ (all   │  ◀──── HDMI-CEC: TV remote volume ──── │ (the same    │        │ (built in, or │
   │  apps) │                                        │  audio chain)│        │  their        │
   └────────┘                                        └──────────────┘        │  soundbar)    │
                                                                             └───────────────┘
```

When audio goes out of the socket, the TV normally mutes its own speakers. So the box has to play the sound somewhere. That gives two products:

| | **A1: Steady Speaker** | **A2: Steady Box (inline)** |
|---|---|---|
| For | Homes using TV speakers (most older viewers) | Homes that already have a soundbar or speakers |
| What it is | A small speaker with the processing built in | A box between the TV and their existing soundbar |
| Competition | ZVOX AccuVoice (see below), $100–$300 | Very little, which makes it the more distinctive product |
| Rough price point | $129–$199 | $59–$99 |

**Strengths:** covers every app and source, works on any TV brand, needs no TV software and no store approval.
**Weaknesses:** it's hardware: manufacturing, safety certification (FCC/CE/UKCA), stock, returns and support.

### Option B: Box between the streaming stick and the TV (not recommended)

HDMI in, HDMI out, with the box processing the audio as it passes through. Only one input is covered, not cable or DVD. The box also has to pass 4K HDR video untouched, handle HDCP copy protection, and decode Dolby Digital+ and Atmos, which needs Dolby licences. It's far harder than Option A for less coverage.

### Option C: A TV app (not feasible today)

TV operating systems don't let one app change another app's sound.
- **Roku, Samsung Tizen, LG webOS, Apple TV:** closed. There's no way to process other apps' audio.
- **Android TV / Google TV / Fire TV:** Android used to allow global audio effects, but that's deprecated and unreliable across devices. Not a foundation for a product.

The only software route is persuading a platform (Roku, Google, Amazon) to improve its own feature, which is a partnership or licensing pitch, not a product.

### Option D: "Turn it on for me" guide (do this first, it's nearly free)

A simple website or phone page: "What TV do you have?" › picture-by-picture steps to turn on that brand's levelling setting. It could also be a printed card or a family-member setup service.

This won't match a dedicated box on quality, but it:
- **tests demand** within weeks (traffic, completion rate, "did it help?" feedback),
- builds the email list you'll sell the box to later,
- teaches you which TVs your users actually own, which decides the box's sockets.

---

## 4. Competition to beat

| Product | What it does | Gap we can exploit |
|---|---|---|
| **ZVOX AccuVoice** (AV120/AV157/AV355, roughly $100–$300) | TV speaker with voice boost; some models have "Output Leveling" | Closest competitor, marketed to people with hearing loss. It's a whole speaker you have to replace your sound with; levelling is only on some models and is a button to find. |
| TV/soundbar Auto Volume and Night Mode | Built-in levelling | Buried in menus, named differently per brand, tuned for adverts. |
| TV headphones (Sennheiser etc.) | Personal listening | Only helps the wearer, and doesn't stop the scares. |
| Streaming-app settings | Per-app "reduce loud sounds" | Per app, per device, and people don't know they exist. |

**Honest read:** ZVOX shows people will pay $100–$300 for "TV sound for older ears", and that the category is real. It also means we need a clear reason to pick ours. The best candidates are **"no setup, uses your TV remote"** and **"keeps your existing soundbar"** (A2).

---

## 5. What's inside the box

The processing is the same five stages as the browser extension (rumble cut, dialogue lift, leveler, compressor, limiter).

| Stage | Prototype (weeks, around $150) | Production (rough BOM) |
|---|---|---|
| Input | USB/HAT receiver with optical, ARC and 3.5 mm inputs | HDMI ARC receiver with CEC, plus a Toslink receiver and an ADC for 3.5 mm |
| Processing | Raspberry Pi running CamillaDSP, or an ADAU1701 SigmaDSP board, with our chain ported | Low-cost audio DSP chip or microcontroller |
| Output | DAC plus a small amplifier and speaker (A1), or optical out (A2) | Same |
| Controls | One light, one button (Off / Gentle / Balanced / Night) | Same, plus TV remote via CEC |
| Rough BOM | — | About $15–$30 for optical/3.5 mm only, more with HDMI ARC. **Estimate, to be confirmed with a hardware partner.** |

**Key design decisions:**
- **Say "stereo only" over ARC**, so the TV sends plain audio automatically. No Dolby licence and no setting to change.
- **TV remote controls the volume** via CEC. For the target user, a second remote is a deal-breaker.
- **On by default, no app needed.** Plug in, and it works. The button is for family members, not the viewer.

---

## 6. Suggested plan

| Step | What | Answers the question | Cost |
|---|---|---|---|
| 1 | Ship the browser extension (done) and gather feedback | Does the processing itself please people? | Nearly free |
| 2 | "Turn it on for me" guide (Option D) plus a **"Notify me / pre-order" page for the box**, shared in communities where adult children look after older parents | Will people **pay**, and at what price? Which TVs and sockets do they have? | A few days |
| 3 | Prototype box (Pi + optical/ARC) in 3–5 real living rooms | Does it work in real homes? What breaks during setup? | About $150 per unit |
| 4 | Decide A1 vs A2 from the data; find a hardware design partner; certification | Can we make it at a profitable price? | Serious money; only after step 2 shows demand |

**The decision to make now is only step 2.** Everything after it depends on whether strangers, not friends, pre-order.

**Hurdles to plan for:**
- **Patents:** levelling and compression are decades old, but ZVOX holds patents on its voice-isolation method. Get a freedom-to-operate check before production.
- **Certification:** FCC (US), UKCA/CE (UK/EU), plus the environmental rules for electronics (RoHS and WEEE).
- **HDMI licensing:** needed to use the HDMI name or logo and to build ARC.

---

### Sources

- [ZVOX AccuVoice AV157](https://zvox.com/products/accuvoice-av157-tv-speaker-with-twelve-levels-of-voice-boost) · [AV120 (Output Leveling)](https://zvox.com/products/zvox-av120) · [ZVOX dialogue-clarifying range](https://zvox.com/collections/zvox-dialogue-clarifying-speakers-soundbars) · [TechHive AV157 review](https://www.techhive.com/article/578903/zvox-accuvoice-av157-review.html)
- [Roku: manage volume levels](https://support.roku.com/article/manage-volume-levels) · [Pocket-lint: Roku volume leveling](https://www.pocket-lint.com/roku-volume-leveling-mode-feature/)
- [Techlicious: stopping loud streaming ads](https://www.techlicious.com/tip/how-to-stop-loud-ads-on-streaming-video-services-right-now/) · [SmartHomeOwl: keeping TV volume constant](https://smarthomeowl.com/how-to-keep-tv-volume-constant/) · [TCL soundbar volume leveling](https://support.tcl.com/us-soundbars-troubleshooting/volume-leveling-issues)
