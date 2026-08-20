# EveryWare Website — Design Framework & Master Prompt
*Researched against Stripe, Linear, Apple, Revolut, Cash App, Notion, Arc — built for a consumer home-service app, not a B2B tool.*

---

## Part 1 — The story (read this before the prompt)

Here's the thing that has to drive every decision on this site: **the person landing on getveryware... err, geteveryware.com is not evaluating software. They're a homeowner whose washing machine just died, or a genuinely stressed-out person thinking about the last time a "technician" ghosted them.** They're not comparing feature matrices. They're asking one question, over and over, as they scroll: *can I trust this?*

That reframes the whole design brief. It's not "make it look premium like Stripe." It's "make it feel like the calmest, most competent person in the room walked in and said *I've got this.*"

So here's the story the page has to tell, in order:

1. **"Your home just broke something."** (Hero — acknowledge the problem in one breath, don't dwell on it)
2. **"Here's how little effort this takes you."** (One-tap booking demo, immediately, above/near the fold — the product IS the pitch)
3. **"Here's what happens the second you tap."** (Live tracking, AI Copilot — the invisible machinery made visible)
4. **"Here's why you won't get burned."** (Verified technicians, verified spares, transparent pricing — this is the section that actually converts skeptics)
5. **"Here's proof it's not just us saying this."** (Social proof / brand partners / stats)
6. **"Here's what it actually feels like once it's fixed."** (Appliance health, lifecycle, the peace-of-mind payoff)
7. **"Any last doubts?"** (FAQ — kill the remaining objections by name)
8. **"Okay, get it."** (Final CTA + footer)

Every section below maps to a beat in that story. Nothing is decorative — if a section doesn't move the "can I trust this" needle, cut it.

---

## Part 2 — The aesthetic verdict

I looked at where the best-performing sites of 2026 sit, and they cluster into two camps:

- **Techno-futurist** (Stripe, Linear, Vercel, Ramp): black canvases, glowing mesh gradients, monospace accents. Built to signal "engineered by serious technical people" — this is a B2B-developer trust signal.
- **Editorial/warm** (Apple, Cash App, Revolut's light bands, Notion): bright surfaces, huge rounded type, product shown in real human context, generous air. Built to signal "this is calm and made for you" — a consumer trust signal.

**EveryWare belongs entirely in the second camp.** A dark, glowing, "engineered" homepage would work against you here — it reads corporate-cold exactly when the visitor needs warmth.

**On glass/liquid morphism specifically:** it's graduated from Dribbble trend to actual OS infrastructure (Apple's Liquid Glass ships across iOS 26/macOS now, Microsoft Fluent does similar). But every credible 2026 source agrees on the same rule: **use it selectively, never as the global surface.** Full-page frosted glass kills contrast and looks dated within a year. The winning move — and what I'd bet on for EveryWare — is:

> **"Calm Glass": 90% flat, bright, rounded-card minimalism (Apple/Cash App direction) + liquid-glass treatment reserved for exactly three places: the sticky nav bar, the hero phone-mockup frame/glow, and modals/dropdowns.**

That gives you the premium, alive, of-the-moment feel of liquid glass in the spots where it earns its keep (it literally represents *transparency and clarity* — thematically perfect for a trust brand) without ever compromising legibility on the parts of the page doing the persuading.

**Cards: rounded, not sharp.** Icy blue/cyan brand + rounded-corner cards (16–24px radius) + soft ambient shadows (not hard drop shadows) is the visual grammar of "friendly and safe," which is exactly the emotional register you want. Sharp corners + high-saturation contrast reads fintech-aggressive (Revolut's black/cobalt system); that's wrong for a "someone is coming into your home" brand.

**Contrast: bright and airy base, with ONE punch color.** Base palette should be light — off-white and icy blue — because darkness reads "hide something," and this brand's entire pitch is transparency. Reserve a single warm, high-contrast accent (coral/amber) purely for CTAs and status/urgency moments, so the eye always knows exactly where to tap next.

---

## Part 3 — Design system

### Color tokens
```
--canvas-base:      #F7FBFC   (near-white, faint icy tint)
--canvas-mint:       #A9E3E0   (brand teal — hero bands, section dividers)
--canvas-deep:       #0E2A2E   (deep teal-charcoal — used ONLY for one high-contrast
                                 "trust/stats" band and the footer, never the whole page)
--surface-card:      #FFFFFF
--surface-glass:     rgba(255,255,255,0.55) + backdrop-blur(20px) + 1px rgba(255,255,255,0.4) border
--text-primary:      #1E2229   (charcoal, matches the app icon mark)
--text-muted:        #5B6670
--accent-coral:      #FF6A4D   (CTAs, urgency states, "book now" — the one warm color)
--accent-sky:        #4AA8E0   (secondary accent — links, in-progress states)
--accent-success:    #34B37A
--border-hairline:   rgba(30,34,41,0.08)
```

### Typography
- **Display/headlines:** a rounded-geometric grotesk — Sonora AI or Manrope/General Sans as accessible free stand-ins for the brand's rounded logotype feel (Apple SF Pro Rounded is the reference target if you have access to it). Bold, tight tracking, large sizes (56–88px desktop H1).
- **Body:** Inter or General Sans, regular/medium, generous 1.6 line-height — this is a site people read while stressed, legibility beats personality here.
- **Numerals/stats:** tabular, slightly condensed, for the trust-stats band.

### Shape & elevation
```
Buttons:        fully pill-shaped (border-radius: 999px)
Feature cards:  20–24px radius, soft multi-layer shadow (0 20px 40px rgba(20,60,60,.08))
Phone mockups:  iPhone-style bezel, 40px radius
Glass surfaces: 20px blur, 55–70% opacity white, 1px semi-transparent border, subtle
                inner highlight top edge (this is what sells "glass" over flat translucency)
Spacing scale:  4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128 (section rhythm: 96–128px)
```

### Motion principles
- Scroll-triggered fade-up + 4% scale-in on section entry (subtle, ~400ms, ease-out) — nothing bouncy, this is a calm-competence brand, not a playful toy.
- Hero phone mockup: gentle parallax float (2–4px drift) on scroll, not spin/3D.
- Buttons: 150ms scale-down on press (0.97), color deepen on hover — tactile, not flashy.
- Live-tracking / AI copilot demo sections: looping short auto-play UI animations (map pin moving, chat bubble typing) so the product sells itself without requiring a click.

---

## Part 4 — Section-by-section architecture

### 1. Navigation (glass)
Sticky, liquid-glass pill bar floating with margin from the top edge (not full-bleed) — logo mark left, 4–5 links center/right, one coral pill CTA ("Get Early Access" or "Book a Repair"). Blurs/frosts content scrolling beneath it. This is glass treatment #1.

### 2. Hero
Two-line headline that names the problem and resolves it in the same breath — something like **"Your home breaks. We fix it in one tap."** Subhead: one sentence on trust (verified, tracked, guaranteed). Primary CTA (coral pill) + secondary ("See how it works" — scroll link). Right side or background: the phone mockup showing the actual booking UI, sitting inside a soft glass-glow card (glass treatment #2) on the icy-mint gradient canvas. This is the single most important pixel on the page — it must look like a real, working product, not a stock illustration.

### 3. Trust strip
Thin horizontal band directly under the hero: small grayscale logos or a line like "Powering after-sales for leading appliance brands" — social proof before you've even asked for anything. Low visual weight, just enough to plant credibility early.

### 4. Feature narrative (the core of the page)
4 alternating left/right rows, each pairing a short punchy claim + 2-line explanation with a real UI screenshot in a phone/card frame:
- **One-tap booking** — the ease story
- **Live technician tracking** — the anxiety-killer (map + ETA)
- **AI Copilot chat** — the "someone's actually listening" story
- **Appliance health dashboard** — the forward-looking payoff (prevent, don't just react)

Each row's screenshot card has a soft ambient shadow, rounded 24px frame, subtle scroll-parallax. Alternate mint and white section backgrounds to create rhythm without needing hard dividers.

### 5. Trust/verification band (deep teal, high contrast — glass treatment optional here as accent chips)
This is the section that overcomes the actual objection ("will they scam me/send a stranger/overcharge me"). Four-icon grid: Verified Technicians · Verified Spares · Transparent Pricing · Service Guarantee. Use the deep-teal `--canvas-deep` background here deliberately — it's the one moment of contrast-drama on the page, signaling "we take this seriously," right when it matters most.

### 6. Stats/proof band
3–4 large tabular-numeral stats (e.g., "Under 90 min average response," "4.9★ average CSAT," "10,000+ repairs completed") in a clean row — no cards needed, just scale and whitespace doing the work.

### 7. Testimonials
2–3 real-feeling quote cards (rounded, soft shadow, small circular avatar) — keep short, conversational, specific ("The technician called before he even left" beats generic praise).

### 8. Download/CTA band
Full-width mint or glass-panel section: "Better service is just a tap away." + App Store/Play Store badges + QR code for desktop visitors. This is the emotional bookend to the hero.

### 9. FAQ
Accordion, rounded-card rows, one open at a time, generous tap targets (mobile-first — plenty of your traffic here will be on a phone in a moment of mild crisis). Cover the real objections, e.g.:
- How fast can a technician actually arrive?
- Are technicians background-checked?
- What if the part needs replacing — do you use genuine spares?
- Is pricing shown before I confirm, or after?
- What if I'm not happy with the repair?
- Which cities/appliances do you currently cover?

### 10. Footer
Deep teal or charcoal, matches the trust band for a bookended dark moment. Logo + tagline, link columns (Product, Company, Legal, Social), app store badges repeated, small print. Keep it calm and organized — this is not the place for more selling, just wayfinding.

---

## Part 5 — The master prompt

Paste this directly into a design tool, AI website builder (v0, Lovable, Framer AI), or hand to a designer as the creative brief:

```
Design a marketing website for "EveryWare," a consumer home-appliance repair
app (book verified technicians in one tap, track them live, chat with an AI
copilot to diagnose issues, and monitor appliance health over time).

AESTHETIC DIRECTION: Warm, editorial consumer-trust design in the lineage of
Apple.com and Cash App's marketing site — NOT the dark techno-futurist SaaS
look (avoid Stripe/Linear-style black canvases and glowing mesh gradients).
Bright, airy, rounded, calm and competent, never corporate-cold.

COLOR: Icy blue/cyan brand palette. Base canvas is near-white (#F7FBFC) with
soft mint-teal gradient bands (#A9E3E0). One deep teal-charcoal section
(#0E2A2E) reserved for the trust/verification band and footer only — this is
the sole high-contrast dark moment on the page. One warm coral accent
(#FF6A4D) used exclusively for CTAs and urgency states so it always stands
out against the cool palette. Text is charcoal (#1E2229), never pure black.

MATERIAL/GLASS: Use liquid-glass (frosted, translucent, blurred, soft top-edge
highlight) ONLY on: the sticky nav bar, the hero phone-mockup frame/glow, and
dropdowns/modals. Every other surface is flat, opaque, and high-legibility —
do not apply glass globally.

SHAPE LANGUAGE: Fully rounded — pill-shaped buttons, 20-24px radius on
feature cards, 40px radius on phone mockups. Soft, multi-layer ambient
shadows (never hard drop shadows). No sharp corners anywhere.

TYPOGRAPHY: Bold, rounded-geometric display font (Manrope/General Sans
weight 700-800) for headlines at 56-88px; clean readable sans (Inter/General
Sans regular) for body copy at 16-18px with 1.6 line-height. Tabular
numerals for stats.

LAYOUT STORY (in this order): (1) hero that names the problem and resolves
it in one breath, with a real product-UI phone mockup, not illustration —
(2) thin social-proof logo strip — (3) four alternating feature rows (one-tap
booking, live tracking, AI copilot chat, appliance health) each paired with
an actual UI screenshot in a rounded frame — (4) high-contrast deep-teal
trust band with four verification pillars (verified technicians, verified
spares, transparent pricing, service guarantee) — (5) stat proof row with
large tabular numerals — (6) two to three short real-feeling testimonial
cards — (7) full-width download CTA band with app store badges and QR code
— (8) FAQ accordion answering real trust objections — (9) deep-teal footer
matching the trust band, with link columns and repeated app badges.

MOTION: Subtle scroll-triggered fade-up + 4% scale-in per section (~400ms
ease-out), gentle parallax float on the hero phone mockup, tactile 150ms
button press-scale, and looping auto-playing micro-animations inside the
live-tracking and AI-copilot feature screenshots (moving map pin, typing
chat bubble) so the product visibly works without requiring a click.

MOBILE-FIRST: Design mobile breakpoints first — a large share of visitors
will land here mid-crisis on a phone. Generous tap targets, single-column
stacking, sticky bottom CTA on mobile.

Brand mark: a circular swirl-smiley icon (dark charcoal linework on mint
circle) — use as a recurring small trust/mascot motif near testimonials
and the FAQ header, echoing the app icon identity.
```

---

## Part 6 — Sites to screenshot for the moodboard
- **Apple.com** (product page rhythm, restrained motion, whitespace confidence)
- **Cash App / Revolut light-mode bands** (bright-to-dark section alternation, pill buttons, rounded card language)
- **Arc Browser (arc.net)** (warm gradient bands, human/approachable SaaS tone)
- **Linear/Stripe** — reference only for *what to avoid* (too cold/technical for this audience)
- **Notion.so** (modular card-based feature storytelling, alternating layout rows)

This gives you a page that feels premium and current without borrowing the wrong brand's emotional register — EveryWare should feel like the calmest, most competent person who ever showed up to fix your fridge, rendered in pixels.
