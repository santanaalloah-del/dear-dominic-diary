# Dear Dominic Diary — Photo Engine & Little Moments release ledger

**Last consolidated:** 2026-10-09, after Alloah's review of the solo couch result.
**Primary rule:** This is a GLOBAL quality requirement for *all* photos — couples, solo, kitchen, bedroom, living room, outdoor, selfies, memories and spontaneous moments — not a one-off prompt fix.
**Do not erase/rewrite user canon or weaken face fidelity while fixing scene fidelity.**

## Source-of-truth and deployment safety

- GitHub repository: `santanaalloah-del/dear-dominic-diary`; working branch `dominic-spontaneous-photo-initiative-controls-20261009`; draft PR #6.
- At this record's creation the public production alias `dear-dominic-diary.vercel.app` pointed to READY Vercel deployment `dpl_Gkp4xPpdijE5ipKADEKW9p6CthSw` from feature-branch commit `fca945a67308e0b75ec102542f33ee167e1f2dba`.
- The `main` branch was still at `88cea60069d9ffc056b9a7bb606f958338eb793a`, which is **older than the promoted production build**. NEVER redeploy `main` blindly or rewrite any promoted updates; inspect Vercel alias + actual production SHA first.
- Before adding this ledger, branch HEAD was `fea034529122dc72f8f25c04c3ee9c7517d08418`; this file commit changes HEAD again. Always recheck dynamically, never deploy a memorized SHA.
- Some builds created through GitHub actions succeeded; Vercel API attempts to create new deployments were rejected with `402 api-deployments-free-per-day` (100/day). Rejected deployments do not exist in Vercel or wait in a Vercel queue. An existing READY deployment can be promoted, but that **does not include later branch commits**.
- There is already a scheduled condition-watch for the release, but that is separate from the Vercel deployment UI. Release only tested, validated code; do not auto-generate paid photos.
- Confirm Supabase `upsert_spontaneous_photo_state(uuid,jsonb)`, permissions/RLS, background cron, Edge Function `photo-background-worker`, Gallery metadata and actual signed refs before release.
- On release: validate the *exact* feature-branch HEAD with GitHub CI + available Vercel preview; verify target team/project, production alias and production SHA; safely sync `main` with all already-promoted fixes, no force-push, then ship and verify final READY + alias. If preview quota blocks, keep the existing live deployment and retry later; never claim completed.

## What the user actually observed (do not minimize)

**Solo Dominic living-room photo, 2026-10-09, screenshot IMG_5448 (conversation attachment)**:
- **PASS (user-confirmed)**: Dominic's *face* resembles him. Tattoos look approximately right at distance. Red Samba sneakers were copied well.
- **FAIL (user-confirmed)**: Stiff, artificial straight-on pose: sitting upright, legs apart, passive hands, staring at camera. Looks like an instructed portrait, not a self-sent spontaneous snapshot.
- **FAIL (user-confirmed)**: photo showed almost his entire body and emphasized the shoes excessively. The generation's stored variation plan had `relaxed_seated / slightly_below / three_quarter / focused / soft_room_lighting / foreground_obstruction`, yet visually it was almost head-to-toe. The camera crop MUST be obeyed in final pixels, not merely in the free preview.
- **FAIL (user-confirmed)**: Real living room, sofa and background were **not** reproduced. Preflight said `Real room images: 1; Real floor plans: 1; light reference 1100` but the generated room and sofa were invented. Having refs selected does **not** prove the provider followed them.
- **FAIL (user-confirmed)**: Saved white shirt has a large actual graphic; generated shirt replaced it with a tiny fabricated emblem/patch and extra button-like detail. White jeans lost some of their real oversized/baggy fit. Shoes were faithful but incorrectly became the visual subject.
- **FAIL (user-confirmed)**: unrequested accessories and unexplained lighter/blond portion in Dominic's hair. DO NOT invent jewelry, graphics, buttons, new hair color, highlights or outfit layers from historical identity refs.
- User explicitly considers this better than the first kitchen attempt, **but unacceptable as final natural photo quality**.
- Related database record: `photo_generation_requests.id = deb1594f-ccbc-4816-9598-a0b8e045b0ce`. Reviewed as `wardrobe,framing,realism,pose,connection` in `context_snapshot.photo_quality_review`. Preserve 'face looks correct' separately rather than categorizing identity as failing.

**Couple coffee in kitchen photo, 2026-10-09, screenshot in conversation**:
- Kitchen approximately resembled real kitchen; nevertheless lighting was overly clean/bright/editorial, both partners symmetrical and apparently presenting coffee equipment, like a commercial.
- Despite `close_up` being selected in stored variation plan, output was head-to-toe. This is an actual generator compliance failure.
- Alloah's real shirt text/image disappeared; Dominic's garment gained an unrelated chest motif resembling tattoo art. Face/tattoo refs must NEVER be transferred to textile designs.
- Database record `42abf47a-358d-4787-95c0-ce50531c11e9` has review issues `wardrobe,ink_on_fabric,realism,framing,lighting,pose,connection`.
- Model had 14/14 image reference slots incl home room photo/floor plan and correct garment boards; references were prepared, not necessarily obeyed.

**Other couple sofa trials**: lying atop partner, shared prop, natural contact, proper room geometry, realistic human anatomy/hands. Do not substitute seated-lap arrangement for horizontal reclining. Preserve exact user-described spatial relationships.

## Existing coding progress — NOT visual acceptance

The working branch already contains many fixes:
- `src/lib/photo-scene-intent.ts`: action parser for coffee, couch relationships and explicit framing/selfie.
- `src/lib/photo-variation-plan.ts`: limits casual full-body defaults, specific room angles, hard framing contracts, solo quiet-moment close crop / lounging pose; explicit full-body/wide user requests still win.
- `src/lib/spontaneous-photo.ts`: saved opportunities, opt-in preferences, real co-presence, privacy, app-closed checks, quiet solo self-taken photos.
- `src/lib/photo-provider.ts`: wardrobe boards, live home photo + plan, tattoo covered-skin restrictions, identity/canon prioritization, feedback categories.
- `src/lib/photo-wardrobe-reference-board.ts`: larger top image on 3-piece board to preserve visible print.
- `src/routes/api.photo-engine.ts`: more explicit scene/camera/crop/material priorities.
- `src/lib/photo-tattoo-boundaries.ts`: tattoo-on-skin-only logic and coverage test.
- `src/components/photo-quality-feedback.tsx`: categories incl `framing` and `ink_on_fabric`.
- Three free test files `tests/photo-scene-intent.test.ts`, `tests/photo-variation-plan.test.ts`, `tests/photo-tattoo-boundaries.test.ts` and GitHub Actions CI.
- **No evidence yet that a paid-generated image from the latest branch visually meets these requirements.** Preview and build success are necessary, not sufficient.

## Mandatory GLOBAL quality gates

### 1. Identity, hair and accessories (priority P0)
- Keep already convincing face/identity and accurate permanent markings.
- Default haircut + hair color come only from saved identity canon unless a Current Look hair change is saved. Never create unexplained blond streaks/highlights.
- Jewelry, chains, watches, piercings, patches, buttons and layers may ONLY reflect relevant current saved items/visible permanent identity features or explicit user instruction. Don't copy random accessories from older identity reference outfits.
- Preserve correct side and anatomical location of exposed real tattoos.

### 2. Wardrobe authority (P0)
- The real garment **image**, not the generic name ('white tshirt', 'babytee'), determines print/text placement, size, silhouette, material and color.
- Plain stays plain; graphic tee keeps actual graphic. Never move tattoos onto a shirt or invent a new tiny patch, sticker, shirt button, logo, design, or clothing accessory.
- White jeans retain true oversized/baggy leg width and silhouette; sneakers retain exact shape/color but need not be displayed when crop excludes shoes.
- Shoe reference is NOT permission to move camera back or center shoes. Crop/action > revealing whole outfit.
- Do not auto-spend credits improving garment photos; free audit must show the actual board.

### 3. Physical action and lived-in naturalness (P0)
- The subject's real activity determines pose. Lazing on couch != `hands_busy` or front-facing catalog sit. Coffee-making != two people posed presenting equipment.
- Favor asymmetric weight/posture, slight slouch, credible contact, mid-action gesture, ordinary gaze direction, believable physical constraints, phone-photo imperfections. No robotic hands or staged symmetrical partner poses.
- Different body languages for different activities. Don't just randomize synonyms for 'natural'.
- Self-sent solo moments require a plausible phone viewpoint (actual held selfie/mirror shot; documented timer placement only when sensible). No invisible third-person photographer. If user explicitly requests candid third-person, respect it.
- Alloah at Work + Dominic at home => solo suggestion; two-person photo only when actual co-presence/context supports together, unless user manually requests an imagined photo.

### 4. Framing, camera and lighting (P0)
- Select and obey crops: close-up, head/shoulders, chest-up, waist-up, three-quarter; full-body/environmental wide only when requested or scene truly requires it.
- **Check the final pixels**, not just plan labels. If 'chest-up' includes feet or 'three-quarter' shows complete shoes, FAIL, even if logs say plan correct.
- Do not use foreground blur or lens angle as a theatrical trick to camouflage catalog posing.
- Honor camera reach, photographer position, gravity, plausible selfie lens optics, focus, unfiltered natural shadows and authentic exposure. No professional HDR/fill glow or artificial daytime brightness.
- Source real room's selected time variant: e.g. 1100 room reference; actual windows and interior light must match, not invented studio/cinematic light.

### 5. Real HOME fidelity (P0)
- Photo of room and floor plan are fixed physical evidence: preserve actual sofa model, sofa-to-wall separation, shelves, windows, objects, flooring, walls and circulation. Move ONLY imagined camera within plausible positions.
- Preflight '1 actual room + 1 floorplan' is NOT enough. Final output must match reference geometry and furniture, including bedroom/kitchen/living (when canon is supplied).
- If selected home source is unsuitable or missing, report that; do not invent confident room details.

### 6. Little Moments product experience (P1)
- Dominic's chat card should read like a short spontaneous, personal thought rather than exposing engineering instructions ('Context detail:', 'keep actual layout', technical angle/crop).
- Keep technical prompt **internally** in Photo Engine; user may view/edit with clear disclosure but shouldn't see debugging prose as Dominic's voice.
- 'Review photo' correctly opens Photo Engine prefilled and FREE checks; no paid automatic generation without a separate explicit opt-in and hard budget safeguards. Do not claim suggestion == photo produced.
- 'Another idea' should generate a genuinely distinct, believable concept/camera style, not the same couch photo rewritten. 'Save for later' must persist, and reviewing must not accidentally delete saved idea.
- Honor location/presence/privacy, frequency/day caps, app-closed opt-in, push opt-in, current outfits/hair/room/time, Gallery/Memory links and anti-repetition.
- Do not silently fabricate togetherness, a third-party photographer, real-world activity or location.

### 7. Feedback and learning (P1)
- Persist and reuse issues across **similar future scenes**, not just a single request: `wardrobe`, `ink_on_fabric`, `framing`, `realism`, `pose`, `connection`, `room`, `lighting`, `hair`, `accessories`, `fit`, `crop_compliance`.
- 'Looks like him' is **separate** from 'room wrong', 'pose wrong' or 'clothes wrong'. Never penalize good face anchors for staging or garment mistakes.
- Avoid treating provider compliance as guaranteed by a prompt. If recurring, consider better image-ref hierarchy, staged crops/subject-specific routing, explicit rejection/review before more paid retries. Don't change model/provider or spend credits without user approval.

## Release checks, in order

1. Re-read last chat notes, this ledger, latest GitHub main/feature HEAD and Vercel alias/prod commit. Ensure no conflicting newer code. Do not deploy `main` if behind production.
2. Confirm Supabase schema, privacy rules and storage, no destructive migrations; verify Gallery metadata and real background suggestions.
3. Run bun tests and build for exact HEAD; verify successful GitHub Action. Add tests for solo self-taken couch, active coffee, close vs full-body override, unposed couples, covered tattoos, known room, wardrobe print preservation, saved queue, and settings.
4. Build one Vercel preview **only if platform accepts new deployments**; first check 402 quota. A Vercel 402 is a rejected API action, *not a queued deployment*. No paid image inference during CI or preflight.
5. Verify UX on the preview: correct existing chat, correct prefilled Little Moments scene, no leaking tech text, photo boards, location privacy and no gallery duplicates.
6. When approved, release without clobbering promoted work; verify prod READY, production alias exact SHA and that GitHub `main` can no longer roll back to an older SHA. Only notify 'published' after verification.
7. After release, review new free preflights: (A) solo Dominic taking couch selfie at Work/at-home split, (B) couple making coffee, (C) couple cuddling horizontally on sofa, (D) precise wide shot only on request, (E) wardrobe/tattoo. User approval BEFORE any paid test photo.
8. **Never claim '100% perfect' without user-confirmed final photo quality across scenes.** Mark each gate as 'code prepared', 'preflight verified', 'visually verified', or 'blocked by deploy quota' accurately.

## Do not forget
The user's priority is authenticity across the WHOLE APP. Face resemblance in the last Dominic solo photo is a partial win, NOT permission to ignore invented background, hair/accessories, garment shape/graphics or robotic body pose. Do not ask the user to repair generic engine failures through long hand-written prompts.
