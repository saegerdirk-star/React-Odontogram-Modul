# Odontogram source-preservation release handoff

Status: incomplete integration checkpoint, 2026-09-10. This is not a release-ready candidate.

## Authorized outcome

Finish Dental Core and React Odontogram source-preserving FHIR export/import end to end, merge/push, and publish the required packages. The user explicitly authorized releases and necessary dependency repairs and requested the latest published pins. Preserve existing clinical meaning: no invented local clinical codes or speculative canal identities. This handoff request authorizes backing up the unfinished code remotely; it does not assert acceptance.

## Locations and ownership

- Consumer: `/Users/malte/code/dental/React-Odontogram-Modul`.
- Worktree: `/Users/malte/code/.worktrees/react-odontogram-modul/odontogram-1sa-fhir-preservation`.
- Branch: `feat/odontogram-1sa/fhir-preservation`.
- Remote: `origin`, `git@github.com:cognovis/React-Odontogram-Modul.git`. Do not publish to the upstream author's repository.
- Consumer bead: `odontogram-1sa`, currently in_progress.
- Core: `/Users/malte/code/fhir/fhir-dental-core`; bead `fdc-8je` closed, main `2725f3d` at inspection.
- Management: `/Users/malte/code/fhir/fhir-management`; repair bead `fmgt-yezy` currently open. Coordinate ownership before touching that repair. A prior broad release-agent delegation did not establish exclusive ownership.
- Read applicable AGENTS.md and installed release/session-close instructions. Canonical consumer has an untracked AGENTS.md; preserve it.

## Verified state

- Core registry latest is 0.7.1. Do not retry missing 0.7.0 or rewrite its tag.
- `@cognovis/fhir-release` latest is 0.2.9. Its downloaded manifest contains Dental Core 0.7.1 and the recorded source carriers/Goal profile.
- Projection 0.2.9 records codegen `0.2.1-canary.20260910034608.795c98b5`. Registry codegen latest is 0.2.3. Check generator compatibility/provenance; do not assume the canary proves a defect or republish immutable bytes.
- Consumer registry latest is 3.2.0; remote main is `55aa90c14280791adc4f80a7007e36d824debb58`; no v3.3.0 tag was found.
- Feature implementation commits: `9819ff4`, review repairs `464a3bd`, docs `0bb0375`.
- Release preparation: `5ff6649`; temporary public audience change `9cac015` corrected to restricted by `9cb3dd0`. Keep restricted audience.

## Incomplete changes preserved in this checkpoint

The previously uncommitted 18-file delta updates codegen to 0.2.3, generator expectations to projection 0.2.9/Core 0.7.1, corresponding tests/docs, and removes the local required-constructor rewrite. It is deliberately preserved as unfinished work, not represented as tested.

CRITICAL: package.json still pins `@cognovis/fhir-release` 0.2.4 while the generator/tests expect 0.2.9. Generated sources have not been proven regenerated against the final published chain. Changelog/translated guides describe the intended final state prematurely. Inspect top-level README consistency too.

## Remaining steps, in order

1. Inspect live remote/registry state and active ownership before continuing; versions above are a snapshot. Resume this linked worktree without overwriting other changes.
2. Align package.json and package-lock.json to the latest appropriate published projection (0.2.9 at inspection) and codegen (0.2.3). Verify its closure actually selects Core 0.7.1 or a newer compatible published version.
3. Install through the repository toolchain and run `npm run fhir:generate` in released-projection mode. Do not pass a local candidate archive for release. Confirm generated contract provenance, archive integrity and profile versions. Check removal of the constructor workaround against actual generated required/optional input behavior.
4. Review generated diff and docs. Keep eleven source field families and root associations, mesial/distal papilla values, explicit/default/absent distinctions, observed/Goal planned context, and strict rejection of ambiguous imports. Do not broaden UI or clinical terminology.
5. Run focused FHIR and boundary tests, full `npm test`, `npm run build`, `npm run build:lib`, and `npm run verify:lib-artifacts`; run applicable type checks. Validate representative actual exported observed/planned bundles with the HL7 validator against exact published Core bytes. Record commands, versions, hashes and results. Inspect existing validation tooling before inventing a new workflow.
6. Obtain required independent review of the final integration and repair findings. Earlier consumer review found six boundary defects which were fixed; no fresh final-release review is evidenced.
7. Finish the authorized consumer landing using the installed Session Close workflow for exact bead/worktree/branch targeting main. Preserve history. Do not close the bead based solely on a prepared PR.
8. Publish react-advanced-odontogram 3.3.0 if still available and appropriate, using the repository release workflow and private registry with restricted audience. Verify no duplicate publication; verify tag/source ancestry, registry availability and package exports/artifacts. Keep release notes and all language versions accurate.
9. Report actual terminal state, versions, commit IDs, package integrity, checks and bead closure. Do not stop at a plan or claim a running agent proves progress.

## Evidence limits and preservation

Earlier implementation evidence: 2559 tests passed, one skipped; typecheck/app/library builds passed; representative emitted Bundle had zero HL7 errors. These results predate this unfinished dependency delta and must not be presented as final release validation. Core had 13 known offline terminology errors outside changed artifacts; do not report a zero-error full Publisher run.

`fmgt-yezy` describes a wheel estate fingerprint/undeclared extensions-consumer repair. Its open tracker status is not proof of a current blocker: verify the original failing action before doing more management work. Do not start unrelated estate upgrades.

Core unrelated files were previously saved in stash `d9152f43e303c665beeadaad601cafadcbf4bf21` (message preserve-existing-core-changes-sc-73b9bcd75654a2a34466). Preserve that stash and foreign worktrees. Never amend/discard original Core commits ea583d1 or 3d0fecb.
