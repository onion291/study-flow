<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Plan math lives in pure modules `src/lib/planner.ts` and `src/lib/replan.ts` with vitest tests; UI only calls them. Why: the distribution rules must stay testable.
- App data is read/written from the browser Supabase client under RLS (owner-only policies), with signed-in pages under `src/routes/_authenticated/`. Why: all data is per-user and needs no server secrets.
- Dates are `YYYY-MM-DD` strings in Korea time (`todayKST`). Why: avoids timezone drift.
