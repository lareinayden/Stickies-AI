# Stickies AI — Long-Term Product Vision

## Vision Statement

**Stickies AI is the place where capture meets follow-through.** It turns whatever you say or type—tasks, concepts, or news—into interactive stickies, then helps you actually do and remember them through smart recall, habits, and light-touch rewards.

Long-term, we want Stickies to feel like a **single, calm surface** for:

- **Capture** — Voice or text, anytime; AI structures it into tasks, learning cards, or digests.
- **Recall** — The right sticky shows up when it’s useful (today’s tasks, due reviews, personalized digests).
- **Reinforcement** — Effort and consistency are visible and rewarded (heatmaps, streaks, unlocks), without turning the product into a game.

---

## Product Pillars

### 1. Capture is frictionless

- **Voice-first, text-always**: Speak to capture; typing is always available. Same flow on web and mobile.
- **One place**: Tasks, learning topics, and (later) news or reading all start from one “what’s on your mind?” entry point.
- **AI does the structuring**: Raw note → extracted tasks (with due dates/priorities) or learning stickies (concept/definition, by domain). No manual tagging required for the happy path.

### 2. Stickies are the unit of work and learning

- **Task stickies**: Clear title, description, due date, priority; complete with one tap; feed into effort and rewards.
- **Learning stickies**: Flip cards (concept ↔ definition), grouped by topic/domain; “Learned” / “Needs review” drive spaced recall and rewards.
- **News / digest stickies** (future): Summarized articles or digests by domain; skim and dismiss or save for later.

All stickies can live in a **unified feed** (Home) and in dedicated views (Tasks, Learning, Rewards).

### 3. Recall is automatic and contextual

- **Today and upcoming**: Tasks surface by due date; learning reviews surface when due (spaced repetition).
- **Notifications**: Adaptive timing (e.g. 30 min before the user’s peak window), not just fixed daily pings. Optional digests (e.g. “3 tasks due today, 2 learning reviews”).
- **Unified home**: One feed that mixes tasks and learning (and later news) so the user sees “what’s next” without opening three apps.

### 4. Reinforcement is proof-of-effort, not pressure

- **Effort over accuracy**: Heatmaps and stats reflect “did something” (tasks completed, reviews done), not punitive streak logic. Grace days and comeback mechanics can soften streaks later.
- **Milestones and unlocks**: Clear, positive rewards (e.g. 7-day streak → theme unlock). More milestones over time (volume, consistency, mastery by domain).
- **Insight, not guilt**: “You’re more active in the evening” or “Your best day this week was Tuesday” — personalized insight from real activity, not shame.

### 5. One account, multiple surfaces

- **iOS app**: Primary mobile experience—capture on the go, review learning, check rewards.
- **Web**: Dashboard, full task/learning management, rewards and debug views, API for integrations.
- **Shared backend**: One auth (Supabase), one API, one event/rewards model so behavior is consistent everywhere.

---

## Long-Term Roadmap (Directional)

### Current (today)

- **iOS**: Sign up/sign in, onboarding tour, add note (voice + type), extract tasks or create learning topic, tasks list with complete, learning stickies with flip and Learned/Needs review, Rewards (heatmap, weekly recap, highlights, badges), Account.
- **Web**: Auth, API (tasks, voice/Whisper, summarization, events, rewards), DB (Postgres: tasks, events, daily_stats, streaks, unlocks), rewards debug page.
- **Rewards**: Event-driven (`task_completed`, `sticky_reviewed`), effort score, streaks, 7-day theme unlock.

### Near-term (next 6–12 months)

- **Polish and user testing**: Single polished E2E journey (see `user-testing-e2e-experience.md`), clear empty/error states, facilitator script.
- **Productivity pipeline**: Peak window detection, adaptive push timing (e.g. 30 min before peak), productivity insight on Rewards; optional local or server-sent notifications.
- **Recall UX**: “Review due” learning stickies on Home or a dedicated cue; optional daily digest notification.
- **Reinforcement**: Grace days for streaks, more milestones (e.g. comeback, volume), reward-style preferences in UI.
- **Web as a first-class surface**: Logged-in dashboard with feed, task list, learning and rewards (not just API + debug page).

### Medium-term (1–2 years)

- **News / digest stickies**: Ingest from configured domains (or APIs), LLM summarization, “News” or “Digest” tab; optional “save as learning” or “turn into task”.
- **Spaced repetition**: Proper scheduling for learning stickies (e.g. by domain), “due today” and “review later” buckets.
- **Richer capture**: Inline due date/priority from natural language; multi-item voice (“add three tasks”) with one recording.
- **Integrations**: Calendar or task sync (read-only or two-way), optional export (e.g. markdown, CSV).

### Long-term (2+ years)

- **Multi-device and offline**: Sync across devices; offline capture with sync when back online.
- **More LLM providers**: Anthropic, Gemini, etc., behind a single abstraction; model choice or auto-routing for cost/quality.
- **Communities or sharing**: Optional shared workspaces, shared learning decks, or read-only “progress” sharing.
- **Monetization**: Freemium (e.g. limits on stickies or voice minutes) or premium features (more domains, advanced insights, export).

---

## Success Metrics (Directional)

- **Capture**: DAU/MAU that add at least one note (voice or text) per week.
- **Follow-through**: Share of captured tasks completed; share of learning stickies reviewed when due.
- **Retention**: D1/D7/D30 return after signup; correlation with “completed first task” and “first reward milestone.”
- **Reinforcement**: Usage of Rewards tab; unlock redemption (e.g. theme); qualitative feedback on “feels encouraging, not stressful.”

---

## Out of scope (for now)

- **Accuracy-based gamification**: No points for “correct” answers; effort and consistency only.
- **Social features**: No feeds of other people’s stickies or public profiles in the core product.
- **Full calendar app**: Tasks have due dates and “today” focus, but we are not replacing Google Calendar or Fantastical.
- **Generic “notes” app**: We optimize for structured outcomes (tasks, learning, digests), not unbounded rich documents.

---

## References

- **Current E2E for user testing**: `_plans/user-testing-e2e-experience.md`
- **Rewards implementation**: `_plans/rewards-reinforcement-implementation.md`
- **Productivity pipeline**: `_plans/productivity-pipeline-and-notifications.md`
- **Project standards**: `.cursor/rules/project-standards.mdc`
- **README**: Repository root `README.md`

This vision doc should be updated as the product and strategy evolve; treat it as the single source of long-term direction for prioritization and planning.
