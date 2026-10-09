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


## 2026-10-09 — NEW COUPLE COUCH RESULT, urgent regression fixes

Supabase request ID: `41026cb5-e38c-462d-ae95-81b71acc7c04`. User examined latest generated photo after production e77fe44.

USER-VERIFIED IMPROVEMENTS: Dominic's face/large shirt graphic/tattoos were closer; couple position and laughter felt less artificially posed. THIS IS NOT VISUAL APPROVAL.

USER-VERIFIED FAILURES (ALL MUST REMAIN REGISTERED): Alloah's face became a DIFFERENT woman (priority P0); printed sentence on her CURRENT actual shirt disappeared; Alloah gained tattoos she does not have; historical accessories/jewelry were copied into the picture; a pair of shoes became mismatched (wrong color/shoe on one foot) and overemphasized; sofa and furniture location invented again; fake music-credit/date/website writing was printed at the bottom of image; framing too wide, showcasing entire clothes/shoes despite desire for natural, close personal photos.

USER'S EXPLICIT DESIGN DECISION: For ALL future Photo Engine generations, send the REAL PHOTO OF THE ACTIVE ROOM and **DO NOT SEND the apartment floor-plan image**. The floor-plan asset may continue existing elsewhere in the app; simply remove its inclusion from model references, selection budget and prompt language. One room photo saves one scarce 14-reference slot for actual identity.

NEW GLOBAL PHOTO REQUIREMENTS:
- Both people's actual recognizable faces are indispensable; Alloah's face should have at least the priority Dominic's receives. Quality feedback `face_alloah` should weight her verified face anchor references (never use screenshots of poor generated photos as identity canon).
- Copy garment prints and wording from current saved top images; NEVER invent a different print or erase readable original text.
- Preserve exactly one matched, correct pair of shoes per person; shoes may fall naturally OUTSIDE a closer camera crop. Never invent or swap shoes or add extra feet.
- Never invent tattoos on Alloah, extra necklaces, or other accessories from historical photos.
- A final PHOTO contains no generated caption, copyright notice, music credit, watermark, URL, date or decorative text. Genuine saved T-shirt lettering is the only exception.
- Style "Natural iPhone" should be natural IN THE ACTUAL PIXELS, not just the name of a 14-ref prompt. Do not randomize medium-wide/full-body for ordinary couple couch scenes. A newly added CAMERA FRAMING setting (automatic, close-up, head/shoulders, chest-up, waist-up, three-quarter, full-body, room-wide) must affect BOTH free preflight and paid photo request; explicit full-body is still honored.
- No more paid image generation in testing without the user's express approval. Compiler/unit-tests/preflight can establish wiring and reference selection, but CANNOT guarantee Seedream correctly reproduces exact faces, room, clothes and pose.
- Before next deploy, check **last actual Vercel production SHA**, current GitHub main and feature branch, and last successful CI. The last known published baseline was `e77fe44b4b1782d399a649976d8920e3148f2734`. Never overwrite later changes or auto-deploy an old SHA.


## 2026-10-09 — Chat UX, explicit user correction (screenshot IMG_5459)

**User request:** The large permanent "DOMINIC · LITTLE MOMENTS" panel under conversation and above the text input must disappear. Do NOT leave a card on screen saying "Some moments are worth keeping" or "Suggest a moment (free)" when Dominic has not initiated anything. Photo initiatives should appear **only inside the scrolling chat conversation when Dominic has a real pending photo idea**; otherwise absolutely NO UI occupies vertical composer space.

**Implemented in branch:** `src/components/diario-chat.tsx` moves `SpontaneousPhotoOpportunity` from `live-composer-wrap` to `ConversationContent`, and adds `SpontaneousPhotoPreferencesPanel` to existing `Customize chat` sheet (palette icon). `src/components/spontaneous-photo-opportunity.tsx` now returns null in chat/message mode unless a valid pending spontaneous idea exists. That idea renders a small personal conversational bubble with "See the idea", "Save" and "Not now"; it never prints engineering scene instructions. The only permanent user-facing controls are under Customize chat (enabled, frequency, co-presence, saved location context, background opt-in, notifications opt-in and saved ideas). Existing Supabase settings persist; do not reset them. `src/components/spontaneous-photo-opportunity.css` supplies compact left-aligned bubble styling and mobile-scrollable preferences sheet.

**Non-negotiable:** No automatic paid generation, no claim that the suggestion is already a real photograph, no invisible photographer, no arbitrary suggestion card pasted over the chat input. Actual photo generation remains separately user-approved in Photo Engine.

**Verification:** Chat input visible and usable without permanent photo panel; absence of pending idea renders no new chat block; a genuine pending idea appears as a bubble **within** messages and disappears on Save/Not now/Review; settings accessible in Customize chat even without pending ideas; when user changes permissions the chat reacts without a full reload. CI + exact preview READY and latest production SHA must be verified before release. Earlier queued photo fidelity fix (commit `8e89c33`) is still needed too; do not accidentally release only the UI change or deploy an older production SHA.


## 2026-10-09 — Dates and changing clothes: user-reported missing autonomy

User found **no autonomous dates**, **no autonomous wardrobe change**, and Chat exchanges such as "What if we go out today?" / Dominic replying "I'll take you somewhere" did NOT create the Date object in Dates. This is a PRODUCT-LEVEL BUG, not solved by Dominic merely saying romantic dialogue.

Investigation on Supabase: 23 active real Dominic garment records (9 tops, 7 bottoms, 3 shoes, 4 outerwear); no saved Looks, no `dominic_wardrobe_autonomy` settings marker; zero Date objects in `diario_items` and `dates`. The existing client selector only executed on `getting_dressed` or `getting_ready`, activities rarely persisted, and the Chat read path used `loadDominicState` rather than the wardrobe-autonomy sync path.

Implemented in feature branch:
- `src/lib/dominic-wardrobe-autonomy.ts`: consider a single everyday outfit selection per São Paulo local day at home while awake, even if the short 'getting dressed' state was skipped. Preserve saved real items and complete clothing categories; do not invent garments. Never churn the outfit throughout a day or change it while sleeping, showering, driving, performing or working. Prefer a different outfit from the previous day.
- `src/lib/dominic-state.ts`: the Chat state loading path now invokes this once-daily wardrobe sync BEFORE reading Currently Wearing, so a user reopening Chat can see the changed selection.
- `src/lib/date-proposal-server.ts` and `src/routes/api.dominic-actions.ts`: recognize a genuine Dominic invitation as `propose_date`, persist it in `diario_items` as a **Date Idea**, not a planned booking; create a linked existing `shared_item` chat entry so the invitation opens the actual Dates object. Deduplicate repeated ideas. The server removes the new action type from the old client action consumer to avoid unsupported dispatch.
- The original `create_date` action remains reserved for a real mutual agreement with an actual date and location. Do NOT fabricate a place, hour, user acceptance or actual reservation based on mere flirting.
- New free test sources `tests/dominic-daily-outfits.test.ts` and `tests/dominic-date-invitations.test.ts` exist. Github workflow was not yet expanded to run these directly, although build and the existing suite passed for the source code. They require independent test execution before full feature acceptance.

Remaining VALIDATION/IMPLEMENTATION (do not overclaim):
1. Confirm the Date Idea appears as a clickable chat shared item, and in Dates > Ideas; verify no duplicate invitations across repeated chats; explicit user acceptance must transition the **same object** to planned when agreement is settled, rather than silently creating a duplicate. Currently old `create_date` can still create a separate date, so this transition needs integration/testing.
2. Verify the outfit changes on real app reload and the header / Photo Engine uses the latest Currently Wearing; preserve user manual clothes for the remainder of the day, and never create new visual items. **Current daily sync depends on client Chat/home state load; background wardrobe decisions while app CLOSED are NOT yet proven or implemented in Supabase life-loop.** Do not claim true offline autonomy until actual service-side integration exists.
3. Proactive-brain runs on Supabase but previous evidence shows no successful autonomous message sends; dates proposed directly from an off-screen initiative still need durable Date-object linkage. Respect existing AI budget and user opt-in; do not increase spend or generate unsolicited photos.
4. Production was still on `e77fe44` when this work began; main was `8e89c33`, feature branch later. On next release, inspect actual production alias + main and feature head, CI and latest preview, and NEVER roll back Photo Engine and Little Moments work.


## 2026-10-09 — Wardrobe PNG + Wearing category regression

The user observed that automatic PNG background cleanup often doesn't work; when tapping Wear on a new top/bottom/shoe, older photos remain marked Wearing and the Photo Engine may use both. The Wearing screen had only a global Clear, no per-piece X. The Closet needed navigable category tabs (top / bottom / shoes / etc).

Fixes in feature branch:
- `src/lib/wardrobe-selection.ts`: shared deterministic, testable selection model. Tops, bottoms, shoes, dresses, outerwear and bags have one active item per slot; dress replaces top+bottom and vice versa. Multiple deliberately chosen accessories may remain. Last-selected item wins for previously accumulated duplicate arrays.
- `src/components/wardrobe-screen.tsx`: the actual Wear handler re-reads latest saved selection and replaces the same category, rather than append blindly. Wearing now has an accessible remove (X) on EACH item, preserving the other pieces; original Clear still exists. Closet now has horizontally scrollable category tabs with item counts for All, Tops, Bottoms, Shoes, Outerwear, Dresses, Bags, Accessories and Other; filters actual inventory without deleting images.
- `src/lib/wardrobe-context.ts`: DB save normalizes category collisions, saved Looks are normalized when applied, and Photo Engine reads only one active real piece per slot even from legacy selections with multiple shoes.
- `src/components/wardrobe-wearing.css`: mobile category tabs and 35px single-item X buttons.
- Automatic PNG cleanup remains LOCAL and FREE. It now recognizes PNGs that already contain meaningful alpha transparency and relaxes excessive borderline restrictions for simple product-photo backdrops. Original saved image is not overwritten until the user reviews and explicitly accepts the preview. White/cream clothing on white backgrounds and complex backgrounds may still need manual Refine cutout; NEVER call this AI segmentation or promise it works for all backgrounds.
- `tests/wardrobe-selection.test.ts` verifies shoe replacement, clothing independence, dress conflicts, individual X removal, legacy duplicate normalization, and accessories. CI workflow now executes that test plus pre-existing dates/daily outfits tests and full build.

Important follow-ups: visually test automatic cutout on user's real problem garment, including iOS browser, BEFORE claiming PNG removal fully solved; inspect whether foreground cloth was preserved and Photo Engine gets correct chosen outfit board after clothing swaps. Never alter stored original garment image programmatically. Daily Dominic wardrobe chooser must not overwrite a manual selection on the same São Paulo local day; its latest function now respects `current.updatedAt`. Confirm browser re-open and Supabase persisted settings after deploy.

Always compare latest Vercel READY production SHA and alias with the CURRENT GitHub branch head and CI; never publish an older cached preview.
