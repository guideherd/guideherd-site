# Release-log provenance (GitLab #372)

Internal only — this file is deliberately absent from `scripts/build-site.sh`'s
allowlist and never ships. It exists so a future maintainer can determine why
GuideHerd is allowed to make each claim on the /resources release log, and so
a new entry cannot be an arbitrary marketing edit: **a release-note row lands
only with its evidence recorded here in the same PR.**

Dates on the public page are month + year. The dates below are the exact
evidence dates. Status vocabulary: VALIDATED (demonstrated end to end with a
dated record) / PRODUCTION (evidence it operated on a production surface).
Public copy always rests on the earliest defensible VALIDATED or PRODUCTION
date — never a first implementation commit.

## The rows

| Public entry (month) | Status basis | Evidence |
|---|---|---|
| Voice scheduling on Microsoft 365 (Jul 2026) | PRODUCTION, 2026-07-28 | GitLab #96 (controlled cutover, closed on the production validation call, no observed defect); #337 (closed 2026-08-11 on the filed 2026-07-28 evidence package: durable sequence conversation.prepared → connected → booking.confirmed → notification.sent → conversation.completed → notification.sent → intake.recorded); #95 (live Microsoft Graph end-to-end proof, same session, IDs on record); #127 (structured intake record). Claim pinned: dated-entry-only + grounding (test/claims.test.js #372 pins). |
| Sign in with Google Workspace (Aug 2026) | PRODUCTION, 2026-08-02 | GitLab #119 closure: OAuth client configured, real production staff sign-in with telemetry (authentication.login, provider google-workspace, timestamped). Microsoft/Entra sign-in remains dark and unclaimable (existing pins). |
| Clio, validated end to end (Aug 2026) | VALIDATED, 2026-08-06 | GitLab #129 closure: rung-3 live validation against the Clio trial tenant; OAuth grant lifecycle; dark by default behind the Level-4 approval path. Public copy reuses the pinned phrase "validated end to end against a Clio tenant"; rungs 4–5 (a customer's own Clio) remain open — never imply them. |
| Client documents, scanned before staff open them (Aug 2026) | PRODUCTION, 2026-08-08 | GitLab #193 (upload pipeline, merged 2026-08-01); #229 (production malware-scanner adapter, activated and live-validated for the pilot firm); #245 (durable production document store). The firm is never named publicly. |
| Google Calendar, validated end to end (Aug 2026) | PRODUCTION, 2026-08-09 | GitLab #114 ledger addendum: service-account credentials live in Railway; owner end-to-end demo including the Google Calendar path; the public claim first shipped in guideherd-site PR #3. Pre-existing row, carried into the chronology unchanged. |
| Structured intake, typed or on paper (Aug 2026) | VALIDATED, 2026-08-16 | Digital intake vertical merged 2026-08-01; validated under production conditions in the #342 certification run (26 scripted steps, customer posture, 2026-08-16) and #340's live walk-through (first live cloud OCR proposal per #194; explicit human attestation; server-side verification of the recorded values). Cloud OCR is a per-firm approved workflow, dark elsewhere — the copy claims the capability and the human gate, not availability. |
| From intake to client and matter records (Aug 2026) | VALIDATED, 2026-08-16/17 | GitLab #220 and #130 (matter opening, conflict pre-check — closed 2026-08-02); #342 matrix: intake → client → matter PASS under production conditions (final disposition READY 2026-08-23); #341 (workflow navigation, re-verified live 2026-08-17). External practice-management creation is deliberately NOT claimed (approval-gated; #338 open). |
| GuideHerd Academy, live on subscription (Aug 2026) | PRODUCTION, 2026-08-17→22 | Live commerce (Stripe + D1) probed in production 2026-08-17; #344 closed 2026-08-22: dedicated deployment verified against production (domain serving, checkout behaves, data preserved). Known open wrinkle: #348 (modern Stripe subscription schema field). |
| Guided onboarding for implementation partners, validated (Aug 2026) | VALIDATED, 2026-08-22 | GitLab #246 (operator onboards without code changes, closed 2026-08-16); #360 (guided onboarding wizard: full journey 15/15 against a production-shaped composition with a synthetic tenant; production wizard deployed, smoke-verified read-only). The "synthetic second tenant" qualifier is pinned (test/claims.test.js) — dropping it would turn the claim into unsupported adoption. #289 (configuration portability, merged + completeness-gated) is supporting evidence, not a standalone claim. |
| Privacy Policy and Terms of Use, published (Aug 2026) | PRODUCTION | Pre-existing row; the documents are live. |
| Trust and security, published (Aug 2026) | PRODUCTION | Pre-existing row (GitLab #357); the page is live. |

## Deliberately absent

Recorded so their absence is a decision, not an oversight (owner approval,
2026-08-23): no named Lex milestone (dark by default; enabled experience out
of the current demonstration posture by recorded owner decision); no Orion
matter-creation entry (write never executed; #338 open); no cancellation
self-service entry (merged, no live-validation record — publish only after
one exists); no Filevine entry (dead-ended on trial rate limits); no
Microsoft sign-in claim (dark, unvalidated, pinned against); no multi-tenant
provisioning entry separate from guided onboarding (same customer story).

## How a new entry lands

1. One PR: the row on /resources **and** its evidence appended to the table
   above. A row without evidence here does not merge.
2. If the row first names a capability or integration, the same PR adds a
   claims pin (test/claims.test.js) that keeps future copy inside the
   evidence — the #294/#372 pattern.
3. The guards already enforce: every row dated (Mon YYYY), the row count
   never silently shrinks, no certification/compliance vocabulary anywhere
   public (#332), and the standing truth-audit sweep (#317 pattern) includes
   this page like any other public claim surface.
4. Month + year publicly; exact dates here. The public date is the earliest
   defensible VALIDATED/PRODUCTION date.
