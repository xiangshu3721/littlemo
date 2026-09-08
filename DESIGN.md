# Design

<!-- impeccable:design-schema 1 -->

## World

Two rooms, same companion. Day is a clean paper journal on a pale desk: white sheets, soft grey wash, strong type, a muted sage send seal. Night is ink-dark Zen: charcoal ground, cream writing, a thin gold thread `#c4a574`. Grain stays in the sheet. System Chinese faces first so the page still reads when webfonts never arrive.

## Surfaces

- `/` companion chat + composer
- `/stats` week/month calendar of episodes
- `/insight` long-range patterns as notebook chapters
- `/me` profile form
- `/settings` local-data notes + appearance
- `/trash` soft-deleted notes
- left drawer from avatar

## Appearance

Modes: `light` | `dark` | `system` (跟随时间). Stored in `localStorage` key `suisuinian.theme`. Manual day/night stops following the clock until 跟随时间 is chosen again.

Auto window (device local clock, same hours as Asia/Shanghai wall time): light `06:00–18:59`, dark `19:00–05:59`. Documented on `/settings`. Toggle lives in the header, the drawer, and settings.

`data-theme="light|dark"` on `:root` drives every color. Honor `prefers-reduced-motion`. Theme color shifts stay inside 160ms.

## Tokens

Shared:

- radius 20px sheets, 20px/6px organic bubbles, full-pill send
- type body: PingFang SC / Hiragino Sans GB / Noto Sans SC / Microsoft YaHei / system-ui
- type display: Songti SC / Noto Serif SC / STSong / Source Han Serif SC / SimSun
- icons: 1.4px line marks only (no filled glyph sets)

Day「干净手账」

- desk `#e8e8e6` paper `#f7f7f7` surface `#ffffff` wash `#f0f0ee`
- user bubble `#f3f3f1` coach `#ffffff` bubble-border `#e5e5e5`
- ink `#1a1a1a` / `#4a4a4a` / `#999999`
- line `#e5e5e5` accent `#5f6f52` seal `#8a4a42`

Night「墨夜金线」

- desk `#050505` paper `#0a0a0a` surface `#0c0c0c` wash `#161616`
- bubbles near-black, gold thread border `#c4a574`
- cream ink `#f5f1e6` / `#d8cbb6` / gold `#c4a574`
- accent `#c4a574` seal gold, not vermilion, not neon

## Motion

160ms send, drawer, and theme color only (`cubic-bezier(0.22, 1, 0.36, 1)`). No page-load choreography. Honor `prefers-reduced-motion`.
