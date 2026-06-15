# Maxim

A quiet personal console — not a to-do app, not a habit tracker.

The problem it solves isn't "make me more efficient." It's: *I have a lot of thoughts, principles, reminders, constraints and small tasks in my head — I need somewhere to catch them, set them down, and see the right ones at the right time.* Opening Maxim shouldn't feel like being chased. It should feel like a clear panel of your current life.

## Principles (the app's own)

1. **Catching is instant.** A thought goes into the Inbox in one line — no asking for type, date, or priority first.
2. **Sorting is low-pressure.** The Inbox can stay messy. Nothing nags you about unsorted items.
3. **Principles are not tasks.** They're standing precepts that sit there, quietly visible — never "did you do it today?", no streak, no check-in.
4. **Only deadlines create urgency.** Things without a deadline don't pretend to be urgent.
5. **The app never interrupts.** No push, no badges, no anxiety pings. It only lays things out when you open it.

## Five kinds of content

- **原则 (Principles)** — standing self-rules. Status is just 开启中 / 暂停中. Optional note for *why*. Never completed.
- **Todo** — quick one-off things. Check it off; it goes to the archive.
- **Project** — a longer effort with subtasks and a "next step", no hard deadline.
- **Assignment** — the *same thing as a Project*, just with a deadline. Add a deadline → it becomes an Assignment; remove it → back to a Project.
- **有空做 (Someday)** — a low-pressure pool. "今天做" turns it into a Todo; "做成 Project" promotes it. Otherwise it just waits, quietly.

Above all of it: the **Inbox** + the global **＋**. Catch first, sort later.

## Screens (4 tabs)

- **首页 (Home)** — answers "what should I remember right now?": a quiet painting hero, your 原则, 留意 (nearest deadlines), Todo, 正在推进 (active projects + next step), and a light 有空做 suggestion. Surfaces a little, not everything.
- **Inbox** — caught thoughts as cards with classify chips, plus a one-at-a-time "理一理" sort flow.
- **事项 (Items)** — full management of all five kinds, each with an add-row. Tap a project/principle for its detail sheet.
- **归档 (Archive)** — finished or put-away things; "拿回来" to restore.

## Design

Quiet, restrained, clear, low-friction — not loud or gamified. A light fog-white surface, white cards with hairline borders, soft depth, a thread of horizon gold for accents only. The palette and the single painting hero (Friedrich's *Wanderer above the Sea of Fog*) are the calm anchor. Tone of copy is gentle and adult on purpose (放进 Inbox 了 / 留意 / 暂时放着 / 拿回来), never pushy.

## Run it

No build step. Open `index.html` in a browser. State persists in `localStorage` (key `maxim.console.v1`).

## Deliberately NOT here (v0.6)

Habit check-ins / streaks · push notifications · AI auto-sorting · priority matrices · calendar/timeline view · stats & charts · points/achievements. They'd turn a quiet container into another productivity machine.

## Project layout

```
codex/
├─ index.html            shell: 4 .view tabs + overlays (capture / detail / sort) + ＋
├─ styles.css            base (palette, shell, tabbar, overlay) + one block per page
├─ app.js                CORE (state, all data actions, helpers, dispatcher) + one render block per page
├─ README.md             this file
├─ DEVLOG.md             the running record of decisions
├─ design-studies/       rendered previews — screen-{home,inbox,items,capture,detail,archive}.png
├─ assets/friedrich.jpg  Wanderer above the Sea of Fog (1818), Wikimedia Commons
└─ legacy-v0.5/          the earlier time-blocking / streaks build, kept for reference
```

> The folder is still named `codex/` from the first working title. The product is **Maxim**.

## How v0.6 was built

The shared **core** of `app.js` (state model + every data action + helpers + render dispatcher) was written first as the contract; then **four subagents built the four pages' view layers + CSS in parallel** against that core, and the results were integrated and verified by rendering every screen. See DEVLOG.
