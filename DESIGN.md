# DESIGN.md

Source of truth for all UI work. This replaces the earlier Webflow-style spec. The design language below (spring-mint, black, white, Titillium Web headlines, pill buttons, very round cards) is the client-supplied system.

## Adaptation for Recon Desk (product UI)

- **Token naming:** the spec's `primary` (spring-mint #00f0a0) is `mint` in code. Our Tailwind `primary` is ink black (#000), because most "primary" classes mean the black CTA fill.
- **Mint band as page background:** the signed-in app sits on `canvas-mint` (#ecffe0) with white cards, so panels lift off the wash. Dense data tables always sit on white.
- **One accent:** mint owns the logo, the active nav item, highlights, the money-at-risk figure on black, and the one signature mint pill, which is **Run matching**. Everything else is black pills, white pills or hairline controls.
- **Status colours are data, not chrome:** finance needs red / amber / blue to mark problems. They appear only as small status badges, difference figures and chart segments, never as buttons, bands or card fills. Soft tint (about 12%) with a darker text variant for AA contrast. Settled uses mint.
- **No claim-type colour cards:** claim types use white feature cards with a mint icon chip.
- **No fabricated social proof:** no testimonials or user counts. The black quote band carries a product principle instead.
- **Typography:** Titillium Web for display and headings (700), Inter for everything else. Numbers use tabular figures; money is right-aligned.
- **Rules that still apply:** no dead buttons, every list has loading / empty / error states, mobile-first, touch targets >= 44px.

---

## Overview

Jobright is the marketing site of an AI job-hunting platform, and its design radiates startup energy. The system is anchored by a single electric accent — a spring-mint green (`primary` #00f0a0) — set against crisp black (`ink`) and white (`canvas`). The signature move is a pale-mint section band (`canvas-mint` #ecffe0) that carries most of the page: heroes, feature blocks, FAQ, and the closing CTA all sit on this soft green wash, punctuated by full-black bands for the scrolling ticker and a featured quote.

The type system pairs a bold, slightly condensed Titillium Web (`display`) for big confident headlines with a clean Inter (`body-md`) for UI and body copy. Headlines run large and heavy; body stays light and readable. The overall feel is friendly and high-energy rather than corporate — rounded product-mockup cards and generous whitespace keep it approachable.

The CTA system is built on high-contrast pill buttons. Primary actions use a **black pill** (ink fill, white label) at a large 28px radius; the brand's signature accent button is a **mint-green pill** (primary fill, black label, thin black border) at a rounder 36px. Product features are demonstrated in white mockup cards with pronounced 40px asymmetric corners, floating over the mint bands. Elevation is light — a hairline or a whisper-soft shadow, never heavy blur.

**Key characteristics**
- A single electric accent: spring-mint owns the logo, links, the signature green pill, and every highlight.
- Pale-mint section bands carry the page rhythm, alternating with white and full-black bands.
- Dual pill-button system: black pills for primary CTAs, a mint-green pill for the signature accent action.
- Bold Titillium Web display type over a light, clean Inter body.
- Rounded product-mockup cards with a distinctive 40px asymmetric corner, floating over the mint bands.
- Page rhythm (marketing): mint hero → mint stats → white content → black ticker → alternating mint feature bands → black featured quote → mint FAQ → mint CTA → white footer.

## Colors

### Brand & accent
- **Spring Mint** (`primary` #00f0a0): logo mark, links, the signature green pill, score highlights, inline emphasis.
- **On-Primary** (#000000): black label on top of the mint button.

### Surface
- **Canvas** #ffffff: default page and card background.
- **Mint Canvas** `canvas-mint` #ecffe0: the dominant section surface. Warm spring-mint; never cool or blue-shift it.
- **Soft Surface** `surface-soft` #f2f4f5: inset panels and inputs.
- **Hairline** #e5e7eb: 1px card and divider borders.

### Text
- **Ink** #000000: headings, body text, fill of every black pill and dark band.
- **Muted** `muted` #86909c: secondary text, captions, footer links.
- **On Dark** #ffffff: text on black bands.

## Typography

Two families: **Titillium Web** (bold, slightly condensed) for every display headline and section title; **Inter** for body, UI labels, buttons and captions. Both are open-source Google fonts.

| Token | Size | Weight | Line height | Letter spacing | Use |
|---|---|---|---|---|---|
| `display` | 80px | 700 | 1.05 | -1px | Largest hero / section headline (Titillium Web) |
| `heading-1` | 60px | 700 | 1.1 | -0.5px | Primary section headings |
| `heading-2` | 48px | 700 | 1.15 | 0 | Feature-band headings |
| `heading-3` | 38px | 700 | 1.2 | 0 | Stat numbers, sub-headings |
| `heading-4` | 32px | 600 | 1.25 | 0 | Card titles, quotes |
| `body-lg` | 18px | 300 | 1.6 | 0 | Lead paragraphs (Inter light) |
| `body-md` | 16px | 500 | 1.6 | 0 | Default body (Inter) |
| `body-sm` | 14px | 500 | 1.5 | 0 | Dense body, ticker, footer |
| `button` | 16px | 600 | 1 | 0 | Button labels |
| `nav-link` | 14px | 600 | 1.4 | 0 | Nav links |
| `caption` | 13px | 500 | 1.4 | 0 | Fine print, metadata |

Headlines are big, heavy and condensed; body copy stays light and roomy. Never set body copy in Titillium Web or headlines in Inter.

## Layout

- Base unit 8px. Spacing tokens: xxs 4 · xs 8 · sm 12 · md 16 · lg 24 · xl 32 · xxl 48 · section 96.
- Content is centred in a ~1200px container. Feature blocks run as two-column rows (copy + CTA / mockup card), alternating sides and stacking on narrow screens.
- Breakpoints: Mobile < 576 (single column, hamburger, pills full-width) · Tablet 576–991 · Laptop 992–1199 · Desktop >= 1200.
- Whitespace is generous and band-driven.

## Elevation

| Level | Treatment | Use |
|---|---|---|
| 0 Flat | 1px hairline or none | Bands, list rows, inputs |
| 1 Hairline | 0.5px inset rgba(0,0,0,.5) | Bordered chips, outlined controls |
| 2 Soft float | whisper-soft drop shadow | Mockup cards floating over mint bands |

No gradient system. Depth comes from band contrast and rounded cards.

## Shapes

| Token | Value | Use |
|---|---|---|
| `sm` | 12px | Square dark button, small chips, inputs |
| `md` | 16px | Cards, tab lists |
| `lg` | 24px | Content cards, panels |
| `pill-lg` | 28px | Primary black CTA pill |
| `pill-nav` | 18px | Compact nav pill |
| `pill` | 36px | Signature mint pill |
| `card` | 40px | Product-mockup feature cards (asymmetric: one sharp corner) |
| `full` | 9999px | Avatars, score rings, badges, search bar |

## Components

- **button-primary:** black pill, white label, 16/600, rounded 28px, wide padding.
- **button-primary-sm:** compact black nav pill ("Sign in"/"Join").
- **button-green:** mint fill, black label, 1px black border, rounded 36px. The one signature accent action.
- **button-dark-square:** black, 12px radius, utility.
- **feature-card:** white, rounded 40px (one sharp corner), padding 24, soft float shadow over mint.
- **testimonial/content card:** white, 1px hairline, rounded 24px, padding 24.
- **score-ring:** white circle, mint value, Titillium 32/600.
- **text-input:** white, 1px hairline, rounded 12px, padding 12/16.
- **nav-bar:** white, ink links 14/600, black pill CTA on the right.
- **hero:** mint band, black display headline, black pill CTA, rounded white mockup.
- **stat-item:** big black Titillium number over a caption.
- **ticker:** full-width black band, white 14/500 text, continuously scrolling, mint marks.
- **feature-band:** mint band, 48px headline, copy + black pill one side, mockup card other side.
- **dark quote band:** black band, white 32/600 quote.
- **faq-item:** on mint, hairline divider, plus/expand toggle.
- **cta-band:** mint band, 48px headline, mint pill.

## Do's and Don'ts

**Do**
- Reserve mint for the logo, links, the signature pill and highlights.
- Carry rhythm on the mint band, alternating with white and black bands.
- Use black pills for primary CTAs and the mint pill for the one signature accent action.
- Pair heavy Titillium headlines with light Inter body.
- Float mockup cards on soft shadows over the mint bands.
- Keep buttons pill-shaped and high-contrast (black-on-mint, white-on-black).

**Don't**
- Don't introduce extra brand colours as chrome. Status colours are for data only (see adaptation).
- Don't fill the everyday primary CTA with mint; the everyday primary is the black pill.
- Don't set body copy in Titillium Web or headlines in Inter.
- Don't put heavy shadows on cards.
- Don't cool or blue-shift the mint bands.
- Don't square off the pills or the mockup cards.
