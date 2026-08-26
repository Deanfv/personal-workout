# Personal Workout

Tour-level dumbbell and kettlebell golf strength. Open the GitHub Pages site and Add to Home Screen on your phone.

**Live site:** https://deanfv.github.io/personal-workout/

This repo is a static GitHub Pages app. `index.html` is the app. `personal-workout.html` only redirects to it so a local/bookmark name cannot drift from what Pages serves.

## What was broken

On 25 Aug 2026, `index.html` on `main` was replaced with 15 lines of visible text (no HTML, no buttons, no JavaScript). Pages deploys from `main` `/`, so the live site showed the self-screen copy including “Skip self-screen” with nothing tappable.

The last working app (commit `7740152`) is restored here, then fixed.

## Self-screen / Skip

Skipped or unanswered checks used to be treated as failures. `lockedIds()` used `if (!screen.balance)` and the same for overhead and hinge. In JavaScript, `!null` is `true`, so Skip or a saved `{balance:null,...}` locked the same lifts as an explicit No.

That over-locked Workout A/B (RDL, half-kneeling press, pull-up, hang, swing, single-leg work). Unlock only appeared after three answers, and a Skip control was not wired in the last good GitHub file.

Now:

- Only an explicit **No** locks lifts.
- **Skip** enters the app and does not lock the pool.
- Unlock appears after all three answers and is sticky at the bottom.
- Saved screens that are incomplete stay on the self-screen instead of auto-entering with null flags.

## Function Health

Function Health does not publish a public API. This page will not log in, scrape `my.functionhealth.com`, or store a password.

There is a **manual import** on the main screen: paste JSON or lines from your dashboard (Documents / biomarker export). Imported markers are stored only in this browser’s `localStorage` (`pw_labs`) and change the next session:

| Marker | Typical trigger | Session effect |
| --- | --- | --- |
| Ferritin | &lt; 30 | Load × 0.85, drop KB swing |
| Hemoglobin | &lt; 13 | Load × 0.8, drop KB swing |
| hs-CRP | ≥ 3 | Load × 0.8, drop KB swing |
| Vitamin D | &lt; 20 | Load × 0.9 |
| Testosterone | &lt; 300 | Load × 0.9 |
| Fasting glucose | ≥ 126 | Load × 0.9 |
| A1c | ≥ 6.5 | Load × 0.9 |
| TSH | ≥ 4.5 | Load × 0.9 |

Accepted paste shapes: JSON arrays of `{name,value,unit}`, objects like `{"Ferritin":28}`, community exporter `{biomarkers:[...]}` / `{results:[...]}` blobs, CSV with a Biomarker column, or `Name: value` lines.

Not medical advice. Import is optional.

## Tests

```bash
node tests/workout-logic.test.js
```
