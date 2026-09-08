# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + TypeScript + Tailwind. User chose Next.js. API Key will later live on Tencent Cloud; this version uses a Next.js route as the same proxy shape (`/api/analyze`, `/api/period`) so the client never holds the key.

## Users

People who want to dump feelings in the moment, usually on a phone, without turning it into a diary assignment. Primary job: get the feeling out. Secondary job: look back and understand patterns.

## Product Purpose

碎碎念 is an AI emotion coach you can open anytime. You talk. It stays with one feeling until you decide it is finished. Success is: you feel accompanied, you see yourself more clearly, and later you can look back at both the raw moment and a folded insight.

## Positioning

Not an auto-slicing diary and not a comfort bot. Chat is companion mode. Calendar is the life record of finished episodes. Slicing stays in the background; the user almost never manages entries.

## Product Principles

1. 用户主动结束 > AI 判断结束 > AI 自动切分. Default: do not cut.
2. Chat is not a list of records. Topic, person, time, childhood, or mood shift is not a new episode.
3. 「就聊到这」is the real end: companion mode → deep insight, authorized by the user.
4. Each reply uses professional coaching: client's words, one powerful question, no diagnosis and no full paraphrase. Insight belongs to the user.
5. Original transcript and deep insight are two objects, linked by the same episode id. Insight never overwrites the raw record.
6. Local data is the source of truth until a cloud account exists.
7. Safety overrides recording. No diagnosis, no questionnaires, no gamification.

## Operating Context

Mobile-first web, used in short bursts. Data stays on this device (IndexedDB). AI is optional: without a configured DeepSeek key the chat still works. Assumed: inferred from the brief, labeled here.

## Capabilities and Constraints

- Companion chat: text, optional image, coach replies that name feeling and go one layer deeper.
- User-authorized deep insight after 「就聊到这」: original transcript stays; insight is a separate folded object on the same episode.
- Calendar of finished episodes; weekly and monthly reports.
- Local-first: messages, sessions, profile, trash. No account system in this version.
- DeepSeek via server proxy. Key: env now, Tencent Cloud later. User confirmed.
- Open: voice input shown on one wireframe is out of scope for this web pass.

## Brand Commitments

Name: 碎碎念. Binding UI: the two provided interaction drafts (WeChat-like thread, left drawer, profile form, mood stats). Light, quiet, plenty of air. Chinese UI copy.

## Evidence on Hand

Two UI drafts in the request. No real user data. Demo notes in the empty-state path must be authored by the user, not fabricated as usage proof.
