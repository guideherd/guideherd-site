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
| Documents land in the firm's own Google Drive (Aug 2026) | VALIDATED, 2026-08-09 | GitLab #302 closure and `docs/operations/google-drive-storage-activation.md` § Live evidence: owner-executed production run 2026-08-09 — Workspace authentication, Drive storage configured, a document request issued from the Operations Center, the caller-facing secure upload accepted, and the PDF persisted into the configured Google **Shared Drive** in the expected booking folder. PASS. Confirmed again by the 2026-08-10 truth audit (#317) as backed. Supporting: #230 (the adapter), #193/ADR-0031 (the Document Storage Contract). **Qualifiers:** a Shared Drive the firm controls is required (a service account has no storage quota of its own); GuideHerd's access is bounded by Shared Drive membership plus the configured root folder. Replay (`already-placed`) and removal were not separately recorded in that run — the adapter suite is their evidence, and the public copy claims neither. The copy must not imply any wider Google Workspace access: the workload holds the Drive scope alone and reads nothing else. **Public month is Aug 2026, not Sep** — the evidence date rules, and this row is a backfill of a capability that was validated in August and simply never published. |
| Client email delivered through Gmail (Aug 2026) | VALIDATED, 2026-08-09 | GitLab #307 closure and `docs/operations/gmail-delivery-activation.md` § Live evidence: owner-executed production delivery 2026-08-09 19:32 — a GuideHerd-generated consultation summary sent through the Gmail provider and verified in the recipient's mailbox (receipt from `gmailapi.google.com`, Message-ID assigned, "Delivered after 0 seconds", rendered correctly). PASS. Confirmed by the 2026-08-10 truth audit (#317) as backed. Supporting: #115 (the provider), #109 (the delivery-provider conformance suite), ADR-0011 (the Notification Contract — providers deliver, Core owns recipients, timing and content). **Qualifiers:** exactly ONE notification type was exercised live (the consultation summary); the appointment-lifecycle ICS path and the revoked-delegation error shapes rest on the conformance suite, so the copy names the summary rather than promising every kind of message. Provider selection is per firm (`notifications/provider`, default `graph-email`). The sending address is the deployment's delegated Workspace mailbox — per-firm branding is subject/body copy only (ADR-0011) — so no copy may say a firm's email leaves from the firm's own mailbox on this path. **Public month is Aug 2026, not Sep**, per the evidence date; a backfill, like the Drive row above. |
| Google Calendar, validated end to end (Aug 2026) | PRODUCTION, 2026-08-09 | GitLab #114 ledger addendum: service-account credentials live in Railway; owner end-to-end demo including the Google Calendar path; the public claim first shipped in guideherd-site PR #3. Pre-existing row, carried into the chronology unchanged. |
| Structured intake, typed or on paper (Aug 2026) | VALIDATED, 2026-08-16 | Digital intake vertical merged 2026-08-01; validated under production conditions in the #342 certification run (26 scripted steps, customer posture, 2026-08-16) and #340's live walk-through (first live cloud OCR proposal per #194; explicit human attestation; server-side verification of the recorded values). Cloud OCR is a per-firm approved workflow, dark elsewhere — the copy claims the capability and the human gate, not availability. |
| From intake to client and matter records (Aug 2026) | VALIDATED, 2026-08-16/17 | GitLab #220 and #130 (matter opening, conflict pre-check — closed 2026-08-02); #342 matrix: intake → client → matter PASS under production conditions (final disposition READY 2026-08-23); #341 (workflow navigation, re-verified live 2026-08-17). External practice-management creation is deliberately NOT claimed (approval-gated; #338 open). |
| GuideHerd Academy, live on subscription (Aug 2026) | PRODUCTION, 2026-08-17→22 | Live commerce (Stripe + D1) probed in production 2026-08-17; #344 closed 2026-08-22: dedicated deployment verified against production (domain serving, checkout behaves, data preserved). Known open wrinkle: #348 (modern Stripe subscription schema field). |
| Guided onboarding for implementation partners, validated (Aug 2026) | VALIDATED, 2026-08-22 | GitLab #246 (operator onboards without code changes, closed 2026-08-16); #360 (guided onboarding wizard: full journey 15/15 against a production-shaped composition with a synthetic tenant; production wizard deployed, smoke-verified read-only). The "synthetic second tenant" qualifier is pinned (test/claims.test.js) — dropping it would turn the claim into unsupported adoption. #289 (configuration portability, merged + completeness-gated) is supporting evidence, not a standalone claim. |
| Privacy Policy and Terms of Use, published (Aug 2026) | PRODUCTION | Pre-existing row; the documents are live. |
| Trust and security, published (Aug 2026) | PRODUCTION | Pre-existing row (GitLab #357); the page is live. |
| A firm can leave, and take its data with it (Sep 2026) | VALIDATED, 2026-09-13 (production deployment same day) | GitLab #496 closure: a synthetic firm driven through all eight transitions (provision → configure → validate → activate → suspend → export → offboard → delete, plus resume) in one automated operator-CLI run on staging, `hf-synthetic-09132230`, 2026-09-13 22:30 UTC, every transition recorded with its own evidence and the tenancy ending in `deleted`; the export produced the #492 archive (manifest digest `8d44c8b2…`, 11 classes) and the deletion recorded the proof-of-absence and named the remainder. Legal-hold and precondition refusals proven in the end-to-end API test (`offboard`/`delete` under an active hold → refused). Deployed to production the same day: revision `3533568`, Promote run 34787516674, production verification 9 pass / 0 fail, release-health judge healthy. Supporting: #492 (tenant export and its proving import, legal holds, erasure ledger and proof-of-absence, closed 2026-09-13). **Qualifiers, all load-bearing:** the end-to-end run was a SYNTHETIC firm on staging — no real firm has been offboarded, and the copy must keep "against a synthetic firm" (pinned in test/claims.test.js). The clean run's tenant never took traffic, so every data class counted zero; export/import manifest equality is proven on a synthetic tenant only and has not been run against a PostgreSQL-backed environment (#492 AC4, recorded there). Copy therefore claims the recorded path and the hand-back, never a completed customer exit. |

## Deliberately absent

Recorded so their absence is a decision, not an oversight (owner approval,
2026-08-23): no named Lex milestone (dark by default; enabled experience out
of the current demonstration posture by recorded owner decision); no Orion
matter-creation entry (write never executed; #338 open); no cancellation
self-service entry (merged, no live-validation record — publish only after
one exists); no Filevine entry (dead-ended on trial rate limits); no
Microsoft sign-in claim (dark, unvalidated, pinned against); no multi-tenant
provisioning entry separate from guided onboarding (same customer story).

### September 2026 sweep (recorded 2026-09-13)

The September audit read GuideHerd.ai `main` and the GitLab record for
everything that closed between 2026-08-25 and 2026-09-13. One row came out
of it (the lifecycle entry above). Everything below was examined and left
off, with the reason:

- **Intake export and restore (#511).** Merged to `main` 2026-09-13 (PR
  guideherd/GuideHerd.ai#432, `d4a6382`) — a firm's intake data can now
  leave in the tenant export and be restored, and an erasure survives the
  round trip. The ISSUE IS STILL OPEN and carries no closure evidence, no
  staging demonstration and no production record. Merged is not validated:
  it publishes only once a dated end-to-end record exists. Until then the
  lifecycle row's wording stays on the export-and-hand-back path it can
  actually prove, and must not be read as "every class comes back".
- **Data governance controls (#492).** Real, closed 2026-09-13, and the
  export/legal-hold/erasure machinery the lifecycle row rests on. Not a
  standalone row: same customer story, and its own AC4 records that
  export→import equality has been proven on a synthetic tenant only,
  never against a PostgreSQL-backed environment.
- **Progressive rollout (#493), integration adapter contracts (#494),
  tenant isolation (#487), domain boundaries (#486), durable jobs (#489),
  database modernization (#488), observability and SLOs (#479/#480/#491),
  automated rollback (#482), DR restore drills (#483), IaC and the
  multi-environment promotion flow (#448–#478), the credential register
  (#495), supply-chain baseline (#476), policy-as-code (#474).** All
  internal engineering. They support public capabilities; none of them IS
  one. Excluded by the standing rule, not for want of evidence.
- **Lex work (#490, #503–#505, and the #404–#425 series).** No named Lex
  milestone, per the standing owner decision above. Nothing in September
  changes that posture.
- **Clara post-call handoff (#439/#440).** Internal support routing — mail
  between GuideHerd's own mailboxes. Not a customer capability, and the
  September change to it is a fix, not a release.
- **Orion (#444) and Filevine.** Unchanged: the Orion write path is still
  unexecuted (#338 open) and Filevine is still dead-ended. September work
  touched the runbooks, not the evidence.
- **Intake Review shell and kiosk affordances (#512), intake release
  visibility (#508), intake metrics and alerts (#509), intake domain
  boundaries (#510), intake gate tests (#513).** Interface and internal
  plumbing on a capability already published in August; no new customer
  capability, no separate validation record.
- **Provisioning engagement grant (#436).** Removes the last shell step at
  the start of an engagement — the same customer story as the August
  guided-onboarding row, which already carries it.

Two backfills, not September rows: **Gmail delivery** and **Google Drive
document storage** were both live-validated 2026-08-09 and are published
under **Aug 2026**. They are new to the page and old in the evidence; dating
them September would have been the exact error rule 4 below exists to
prevent.

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
