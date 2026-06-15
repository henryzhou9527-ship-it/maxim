# Maxim — development log

A running record of how this project came to be, the decisions made, and what's next. Newest context at the bottom.

## The idea (origin)

Started as a concept the user described as a "Self Bible": an app of personal *principles* you commit to, so that following the principle replaces re-deciding every day and lowers the friction of doing the right thing (the example given: "no snack / no fat is my bottom line"). The insight that became the product: a planner with three kinds of items at different altitudes —

- **Principles / maxims** — standing rules, honoured daily, not completed.
- **Tasks** — deadline-bound.
- **To-dos** — quick, just-do items.

Plus a **Spark** capture for inspiration that gets sorted into one of the three layers later.

Decided early it should be a **phone app**, framed as "a more advanced calendar" — the three layers laid onto time, with the calendar as home.

## Naming

Evolved across the discussion:

- "Self Bible" (original) → felt religious, narrowed appeal.
- "Codex" (first working name) → a personal book of laws; good but generic.
- Options weighed: Keep, Vow, Plumbline, Throughline, Holdfast, Maxim, Tenet, Creed, Covenant.
- **Chosen: Maxim.** A maxim is a short saying that states a rule to live by — which is exactly what the app turns your bottom lines into. The name *is* the concept, and keeps the "personal scripture" spirit of "Self Bible" in one clean word.

## Design direction

Anchored to two real paintings (both public domain), kept as **switchable themes** rather than picking one yet:

- **Friedrich — *Wanderer above the Sea of Fog* (1818).** Matches the philosophy: stand firm on the rock, above the fog of daily decisions. Cool mist + warm gold horizon + dark "rock" cards for maxims. Serious, grounded.
- **Morisot — *Hide and Seek* (1873).** The softer alternative: warm cream light, meadow greens, a rose accent. Gentle, encouraging.

Honesty note from the discussion: the first painting "references" were stylised SVG sketches built from memory, not faithful copies. When challenged, verified the Morisot via web search and corrected it — the woman (the artist's sister Edma) wears a **white dress with a black sash and green scarf**, the child (niece Jeanne) is in **pink and white** (earlier draft wrongly used a dusty-blue dress). The Friedrich composition (lone figure, back turned, walking stick, sea of fog, peaks) is faithful in spirit.

**Resolved (2026-06-15):** the real public-domain scans are now embedded — see the reconstruction section below. The SVG homages are retired.

**Unresolved decision:** Friedrich vs Morisot as the *default/primary* identity. Currently ships with both; Friedrich is default. User to pick when ready.

## Relationship to time-architect

The user first said "DayFlow" but corrected it: the project to integrate is **time-architect** (the user's Android/Capacitor app; DayFlow is an unrelated Windows desktop time-tracker and was a naming mix-up). time-architect is already web + Capacitor → APK, with a calendar / time-block core. Likely smarter to build Maxim's three-layer model **on top of time-architect** than to start a separate native app from scratch. Integration approach TBD.

Side action completed during the discussion: pushed time-architect's 7 local commits (the 2026-06-10 overhaul) to GitHub `henryzhou9527-ship-it/time-architect` at the user's request. (Push ≠ Vercel deploy; cloud-feature deploy still to confirm.)

## Current development (v0.1 — 2026-06-14)

Built a real, runnable foundation (no build step, vanilla JS, persists to localStorage):

- `index.html` / `styles.css` / `app.js`
- Three working layers + spark inbox; add/remove on each
- Maxim tap-cycle (unmarked → held → broke) with streak recomputed from per-day history
- Spark capture sheet → sort into a layer; inline sorting of existing sparks
- Two painting themes via a runtime toggle, persisted
- Live clock, current-week strip
- Original static mockups preserved under `design-studies/`

## Next steps (proposed)

1. Pick the primary theme (Friedrich vs Morisot).
2. Embed the real public-domain painting scans into `assets/` (retry the download outside this sandbox).
3. Second screens: the **Streaks** view (history/calendar of held lines) and the **Layers** view.
4. Decide the build path: extend **time-architect** vs. keep Maxim standalone, then wire shared data / account.
5. Editing (rename a maxim, set a real due date/time on tasks), and notifications for the daily maxim check-in.

## Reconstruction around the paintings (v0.2 — 2026-06-15)

The brief sharpened: *"以那两幅为主题 — 注意不只是 refer，完全是以主题来重构这个 APP"* (use the two paintings **as the theme** — not merely referencing them, but reconstructing the whole app around them). So this pass stops treating the painting as a banner and makes the **canvas the environment itself**.

What changed:

- **Real scans embedded.** Downloaded the public-domain originals from Wikimedia Commons (the earlier failure was a bad URL + the shared-IP rate limit; resolved by querying the Commons API for the true filenames and fetching the full-res file rather than a custom thumbnail size, which Commons now blocks). Downscaled to phone size and saved as `assets/friedrich.jpg` (1300×1665, ~365 KB) and `assets/morisot.jpg` (1300×2313, ~590 KB).
- **The painting is the full-screen backdrop**, not a hero strip. It fills the entire phone screen; the interface floats over it on a **frosted-glass panel** (`backdrop-filter: blur`) that rises like the fog/haze, so the oil keeps glowing through the lists.
- **Composition = layout.** Each painting's own structure becomes the screen: in Friedrich the lone wanderer stands at centre *above* the rising fog-panel of tasks; in Morisot the mother and child sit in the garden above a warm cream haze. The metaphor is literal — your maxims are the **rock you stand on above the fog of daily decisions**.
- **Palette sampled from the actual oil**, replacing the guessed values: Friedrich → cool slate mist, near-black rock cards, a thread of horizon/​hair gold; Morisot → pale grey sky, sage meadow, cream dress, a coral accent from the berries and rooftops.
- Maxim cards are rendered as translucent "rock"/"sage" glass; the greeting and a small painting **credit line** (artist · title · year) sit over the sky; a soft theme-tinted veil keeps the greeting legible over busy brushwork.
- The retired SVG homage constants were deleted from `app.js`; `renderHero()` now just lays the greeting + credit over the CSS-driven painting background.

Verified by rendering both themes in headless Edge — saved as `design-studies/preview-friedrich.png` and `preview-morisot.png`.

## Clarity-first rebuild (v0.3 — 2026-06-15)

Feedback on v0.2 was blunt and correct: *"只要 Friedrich 吧 — 不过这个 design 好丑,看都看不清楚……完全重构 UI 逻辑"* (keep only Friedrich; the design is ugly and unreadable; rebuild the UI logic). The v0.2 mistake was putting the full painting *behind* everything under heavy `backdrop-filter` blur — immersive in theory, muddy and low-contrast in practice.

So v0.3 inverts the rule to **clarity first**:

- **Friedrich only.** Dropped the Morisot theme and the runtime theme switch; removed `assets/morisot.jpg`, the Morisot mockup/preview, and the now-dead `applyTheme()` + switch handler in `app.js`.
- **The painting appears once, as a sharp hero card** — full quality, contained, rounded, with a soft shadow. It is no longer washed behind the content. The greeting sits on the card over a proper dark bottom-scrim in white type, which is always legible (the painting's lower third is the dark rock anyway).
- **Everything else lives on a clean, high-contrast light surface:** a cool fog-white background, white cards, hairline borders, soft depth, generous spacing, refined type. No blur over content.
- **One signature kept:** maxims render as dark "rock" cards (the ground you stand on) against the white cards of the ordinary day — strong hierarchy, on-concept, high contrast. Held = moss seal + left edge; broke = clay.
- Palette still sampled from the oil, but used as *accents on a clean canvas* (slate ink, fog white, horizon gold) rather than a full-bleed wash.

Verified in headless Edge — `design-studies/preview-friedrich.png` (top) and `preview-friedrich-lower.png` (tasks / to-dos / sparks). This is the look to build forward from.

## Navigation / information architecture (v0.4 — 2026-06-15)

Feedback: *"还可以,但是所有功能都堆在第一个界面吗"* (this is okay, but is every function piled onto the first screen?). It was — Today held maxims + tasks + to-dos + sparks all at once, and the tab bar (Today / Layers / Streaks / Me) was decorative; the tabs did nothing.

Fixed by making the tab bar real and splitting the functions across four screens:

- **Today** — the focused daily view. Hero + week + a "N sparks waiting to be sorted →" chip, then only what's live *now*: maxims to hold (with today's held count), open tasks (sorted by urgency), open to-dos. Completed items drop off here and live in Layers.
- **Layers** — the full three-layer library and the place you add/manage: all maxims, all tasks (incl. done), all to-dos, plus the Sparks inbox with sort-into-a-layer buttons. The add-rows live here, not on Today.
- **Streaks** — the loss-aversion mechanic made visible: each maxim shows its current streak (big), a 14-day held/broke dot grid (today outlined), and best + total-kept.
- **Me** — editable name + avatar, four stat tiles (maxims, longest streak, days kept, tasks done), and an About card with the painting credit.

Implementation: each screen is a `.view` section toggled by `applyView()`/`setView()`; the active view persists (`state.view`). Mutations now call a single `render()` that refreshes all views so Today/Layers/Streaks stay in sync. The spark ✦ FAB and capture sheet stay global. Element construction was refactored into shared builders (`buildMaxim`/`buildTask`/`buildTodo`) reused across screens. Previews: `design-studies/screen-{today,layers,streaks,me}.png`.

## time-architect integration (v0.5 — 2026-06-15)

The user asked to fold their other app — **time-architect** (a goal-first weekly time-blocking "cockpit" with NL/AI scheduling, goal contracts, a rich rhythm profile, a draft→confirm flow) — into Maxim *naturally*, "not as a bolted-on module."

**The framing that made it natural:** Maxim governs *what matters* (intent); time-architect governs *when it happens* (time). They're the same stack at different altitudes, and each fills the other's hole — Maxim's tasks had only a fuzzy `due` string and no calendar; time-architect had goals + blocks but no principles/streak layer. So intent flows DOWN into time:

> **principles → goals → tasks → to-dos → blocks on a day**, with principles bending back up as *guards* the schedule must respect.

What shipped (all local — no AI, no cloud, no account):

- **Data model (v2 key)** gained `goals`, `blocks`, and a `profile` (rhythm); tasks gained `est` (minutes) + `goalId`; maxims gained a `guard` ({sleep | protect}).
- **Today became a day timeline.** A 06:00–24:00 grid for the selected day: scheduled blocks (category-coloured), a live now-line, and **principle guard bands** — the "In bed by…" maxim + the rhythm profile render the rest band; "phone face-down while working" tags as a deep-work protector. The week strip is now a day picker driving the timeline.
- **Local "ask → draft → confirm" planner** (time-architect's signature, fast-path only): type "tomorrow 2pm read filings 45m" → a regex parser (EN + some 中文: 今天/明天/后天, weekdays, ISO, HH:MM / 2pm / 下午两点半, 60m/1h/分钟/小时) produces a dashed **draft** block on the timeline + an Apply/Discard bar. No time given → it finds the next free slot avoiding guards & existing blocks.
- **Schedule a task** (⊕ on unscheduled tasks) auto-places it in the next free slot as a draft. Marking a block done completes its linked task, and vice-versa.
- **Goals layer** inserted in Layers between Maxims and Tasks: goal cards with deadline, weeks-left, realistic hours, weekly target, and a **feasibility bar** (capacity × weeks vs hours needed → feasible / tight / over). Tasks can link to a goal (shown as a ◆ tag).
- **Streaks** gained a "Goals this week" section: scheduled/done hours vs weekly target.
- **Me became the rhythm profile** (wake, in-bed, weekly capacity, energy windows) — and it actually drives the timeline guards + goal feasibility. Spark can now sort into a Goal too.

What was deliberately NOT pulled over (yet): the online LLM scheduling, the @all "council" multi-agent mode, cloud sync / accounts, encrypted storage. The seam is built so these can later be an optional toggle on top of the local planner rather than a requirement.

Previews: `design-studies/screen-today.png`, `screen-today-timeline.png` (the centrepiece, with a draft), `screen-layers.png`, `screen-streaks.png`, `screen-me.png`.

## Pivot to "a quiet console" + fan-out build (v0.6 — 2026-06-15)

The user wrote a full product spec, reframing Maxim away from the time-blocking/streak direction (v0.5) toward a **quiet, low-pressure personal console**: catch a thought in an Inbox first (no forced classification), sort it later into one of five content types, and let the Home screen surface only what's worth remembering now. Explicitly dropped: streaks / habit check-ins, push notifications, AI judgement, a calendar/timeline. Principles are NOT a habit tracker — they just sit there, visible. Project and Assignment share ONE structure, told apart only by whether a deadline is set.

Kept the established clean Friedrich aesthetic (light surface, hairline cards, a quiet painting hero on Home, slate/gold accents) — it already matched "安静、克制、清楚". The v0.5 build (timeline/goals/streaks) is preserved under `legacy-v0.5/`.

**Information architecture** — 4 tabs: 首页 / Inbox / 事项 / 归档.
- **首页 (Home):** painting hero, then a calm panel — 原则 (top few, quiet list), 留意 (nearest assignment deadlines), Todo (quick), 正在推进 (active projects + next step), 有空做 (a light suggestion). Answers "what should I remember right now?", not "manage everything".
- **Inbox:** catch-first. Each card has classify chips [原则][Todo][Project][有空做][加 deadline]; a "理一理" one-at-a-time sort flow; the global ＋ opens a capture sheet (save to Inbox, or classify directly).
- **事项 (Items):** full management — five sections (原则 / Todo / Project / Assignment / 有空做), each with an add-row. Project↔Assignment convert by adding/removing a deadline. A detail sheet for projects (subtasks, next step, note, deadline picker, 归档) and principles (status on/paused, note, 归档 — never a completion control).
- **归档 (Archive):** completed / put-away things, each restorable ("拿回来").

**Tone pass:** the user called the old "已接住" toast 弱智; reworked all copy to calm, adult Chinese (放进 Inbox 了 / 先放进 Inbox / 留意 / 暂时放着 / 重新开启 / 拿回来) and banned pushy/gamified words.

**How it was built — fan-out.** At the user's request ("fan out subagents"), I wrote the shared CORE myself (state model + every data action + helpers + render dispatcher + shell), then dispatched **4 parallel subagents**, each building one page's view layer + CSS against the real core API (Home / Inbox+capture+sort / Items+detail / Archive). Returns were integrated, deduped (shared `.empty`), and verified by rendering every screen + overlay in headless Edge. Previews: `design-studies/screen-{home,inbox,items,capture,detail,archive}.png`. Data model key bumped to `maxim.console.v1`.

## Accounts + cloud sync, streak/calendar back, no-scroll Home, ship (v0.7 — 2026-06-15)

A batch of changes + first deploy.

- **Account system (cloud, end-to-end encrypted).** Ported time-architect's proven design: PBKDF2(password,salt,100k)→AES-GCM-256 key, `verifier = base64(SHA-256(raw key))` is the only password-derived thing the server sees and doubles as the bearer proof. Serverless under `api/` (`accounts.js`, `settings.js`, `_shared/accounts.js`) storing ciphertext in Vercel Blob, keyed by username; client crypto/auth/sync in `app.js`. Renamed to Maxim throughout (keys `maxim_*`, headers `X-Maxim-*`, settings key `maxim_state`). The whole `state` syncs as one encrypted blob. Login/register live on the 我 page; logged-out = local-only (plaintext localStorage), logging in switches to encrypted-local + cloud, cloud wins on pull, debounced push (~1.4s) on save, with the wrong-password overwrite guard kept.
- **Usage streak (not principle check-in).** Per the user's choice, the streak counts consecutive days the app is opened (`bumpStreak` on boot) — principles stay non-habit. Shown on Home (chip) and 我.
- **Calendar tab** (week/day). A week strip (today highlighted, due-day pips) + the selected day's agenda of Assignment deadlines on a timeline rail. Taps open the item's detail.
- **Home is now a no-scroll dashboard.** Painting removed; compact: date + brand + streak chip, then 留意 / Todo / 正在推进 / 原则 (each capped). `:has()` disables scrolling on Home.
- **Painting moved to 我** (a framed card with the credit), per request.
- **IA → 5 tabs:** 首页 / 日历 / Inbox / 事项 / 我. 归档 folded into 我.
- **Shipped:** `git init` + first commit; public GitHub repo `henryzhou9527-ship-it/maxim`. Vercel: a static + serverless project; needs a Blob store + `BLOB_READ_WRITE_TOKEN` env var (account features 503 without it; the rest works). `vercel.json` has `cleanUrls`.

Previews refreshed: `design-studies/screen-{home,calendar,inbox,items,capture,detail,me}.png`.

## Unrelated, same session

AhaSpeed (啊哈加速器) wouldn't open. Cleared the leftover zombie process and re-enabled its disabled TAP adapter, but it **crashed on startup repeatedly** (fresh dumps at 20:07–20:11) — beyond the old taskkill fix; likely a corrupted install needing reinstall/vendor update. Parked pending user go-ahead. (Recorded in memory.)
