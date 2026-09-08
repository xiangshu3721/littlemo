# Design

<!-- impeccable:design-schema 1 -->

## World

Pressed rice-paper phone on a dusk linen desk. Iron-gall ink, a clay-teal send seal, vermilion only for the picked day. Grain lives in the sheet. System Chinese faces first so the page still reads when webfonts never arrive.

## Surfaces

- `/` companion chat + composer
- `/stats` week/month calendar of episodes
- `/insight` long-range patterns as notebook chapters
- `/me` profile form
- `/settings` local-data notes
- `/trash` soft-deleted notes
- left drawer from avatar

## Tokens

- desk `#9a9186` paper `#f6f0e3` wash `#ebe3d2`
- user bubble `#f1e6cf` coach `#fffcf6`
- ink `#1f1914` / `#5a4d41` / `#8a7b6d`
- line `#d8ccb8` accent `#345e67` seal `#7c4034`
- radius 20px sheets, 20px/6px organic bubbles, full-pill send
- type body: PingFang SC / Hiragino Sans GB / Noto Sans SC / Microsoft YaHei / system-ui
- type display: Songti SC / Noto Serif SC / STSong / Source Han Serif SC / SimSun
- icons: 1.4px ink line marks only (no filled glyph sets)

## Motion

160ms send and drawer only (`cubic-bezier(0.22, 1, 0.36, 1)`). No page-load choreography. Honor `prefers-reduced-motion`.
