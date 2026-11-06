# Demo video plan

Target length: under 3 minutes. This is a plan. Nothing in it has been recorded, and every narration line is a draft until the recording shows it.

Rule for the edit: record first, then cut the narration to what the recording shows. If a shot did not happen as planned, change the line, not the footage. If waits are cut or sped up, put "waits cut" on screen.

The video uses one run of `scenarios/reject.md` (the whole-cake notice, 48 hours to 72 hours). That one run holds the ask, the rejection, the fix, the pass, the approval and the client update.

## Screen layout

From shot 2 to shot 8 the screen is split in two and does not change:

- Left: the client-desk channel in Discord.
- Right: the proof-room channel in Discord.

The viewer should be able to see, in every one of those shots, that the left side does not gain a rejection. Shot 1 and shot 9 use a single window. Times are targets, not measurements.

## Shots

| # | Target time | On screen | What happens | Narration |
|---|---|---|---|---|
| 0 | 0:00-0:08 | Title card: "Proof Room" | Nothing | "Proof Room is a Switch workflow. Nobody tells a client a website change is done until a different agent has fetched the running page and a named person has approved." |
| 1 | 0:08-0:25 | Switch Console, the two rooms and their member lists | Scroll each room's members once | "One template makes two linked rooms. The client and intake are in client-desk. The builder and verifier are in proof-room. Only the dispatcher and the reporter are in both." |
| 2 | 0:25-0:42 | Left: client-desk. Right: proof-room | The client types the request from `scenarios/reject.md`. Intake replies with a numbered checklist item | "The client asks for a change. Intake logs it as a checklist item. Intake cannot see the proof room." |
| 3 | 0:42-1:02 | Same split | Right: the dispatcher posts the item. The builder edits, publishes and posts "ready for verification" | "The builder has no shell. It edits the source, calls one publish tool, and says ready for verification. It does not say done." |
| 4 | 1:02-1:28 | Same split | Right: the verifier posts its blocks. One is `VERDICT: REJECT` with `FOUND` and `REASON`. Hold on the REJECT block long enough to read it. Left: no new message | "The verifier cannot read the source. It fetches both running pages. One still has the old text, so it posts REJECT with the line it found and the reason. Nothing appears in the client's room." |
| 5 | 1:28-1:46 | Same split | Right: the builder fixes the second page, publishes, and asks for another check | "The builder fixes what the block shows and publishes again." |
| 6 | 1:46-2:02 | Same split | Right: the verifier posts new blocks, all `VERDICT: PASS`, then asks the owner to approve | "The verifier fetches both pages again. Every block says PASS. It asks the owner to approve." |
| 7 | 2:02-2:16 | Same split | Right: the person types the approval to the reporter. Show the typing, not a paste | "A person approves. The reporter acts only on the owner's own message." |
| 8 | 2:16-2:32 | Same split | Left: the reporter posts the client update. It mentions no rejection | "Only now does the client hear about it. The update says what the PASS blocks show and nothing else." |
| 9 | 2:32-2:50 | The README table "Enforced, convention, or pending" | Scroll the table once | "Rooms, membership and who can trigger the reporter are enforced by Switch. No shell and the read limits are enforced by a settings file. The rest is convention. The README says which is which, and what is still untested." |
| 10 | 2:50-2:56 | End card: repo link | Nothing | None |

Optional, if time allows inside shot 8: a browser reload of `http://127.0.0.1:4180/visit.html` showing the new text.

## If the rejection is seeded

Run `scenarios/reject.md` unseeded first. If the builder changes both pages, there is no rejection to show, and the seeded variant is used.

A seeded rejection is a staged failure. If the video uses one:

- Keep the one-page brief given to the builder visible in shot 3.
- Put "Seeded run: the builder was given a brief that names one page" on screen during shots 3 and 4.
- Say it in the narration for shot 3: "For this recording the builder was given a brief that names one page."
- Say the same in the README next to the video link, and at the top of the evidence transcript.

Never present a seeded rejection as a mistake the builder made unaided.

## If the client and the owner are the same account

In tests so far they were the same person. If that is still true when recording, both channels are visible to one account, and the video does not show that a client cannot open proof-room. In that case:

- Do not say "the client cannot see this room". Say "nothing appears in the client's room", which the split screen does show.
- Add a caption in shot 2: "Client and owner are the same account in this recording."

If a second account is available, record the left side from it and show its channel list in shot 2.

## Claim-to-evidence table

Every claim in the narration, and the file that will hold its evidence. All are marked pending. None of the `docs/evidence/` files named here exists yet.

| Shot | Claim | Evidence file | Status |
|---|---|---|---|
| 0 | The client is told only after a different agent fetched the page and a person approved | `docs/evidence/reject-run.md` | pending |
| 1 | One template makes the two rooms and five agents | `docs/evidence/template-apply.md` | pending |
| 1 | Client and intake are in client-desk; builder and verifier are in proof-room; dispatcher and reporter are in both | `docs/evidence/template-apply.md` | pending |
| 2 | Intake turns the request into a numbered checklist item | `docs/evidence/reject-run.md` | pending |
| 2 | Intake cannot see proof-room | `docs/evidence/template-apply.md` | pending |
| 3 | The builder has no shell | `docs/evidence/agent-boundary.md` | pending |
| 3 | The builder publishes through one tool | `docs/evidence/agent-boundary.md` | pending |
| 3 | The builder says "ready for verification", not done | `docs/evidence/reject-run.md` | pending |
| 4 | The verifier cannot read the site's source | `docs/evidence/agent-boundary.md` | pending |
| 4 | The verifier fetches both running pages | `docs/evidence/reject-run.md` | pending |
| 4 | The verifier posts REJECT with the found line and a reason | `docs/evidence/reject-run.md` | pending |
| 4 | Nothing about the rejection appears in client-desk | `docs/evidence/reject-run.md` | pending |
| 5 | The builder fixes what the block shows and publishes again | `docs/evidence/reject-run.md` | pending |
| 6 | The second fetch gives PASS on every block | `docs/evidence/reject-run.md` | pending |
| 6 | The verifier asks the owner to approve | `docs/evidence/reject-run.md` | pending |
| 7 | A person typed the approval | `docs/evidence/reject-run.md` | pending |
| 7 | The reporter acts only on the owner's own message | `docs/evidence/bypass-2026-11-06.md` | partly: two agents asked to push the reporter refused; the reporter itself was not reached |
| 8 | The client update comes after the approval | `docs/evidence/reject-run.md` | pending |
| 8 | The update says only what the PASS blocks show and mentions no rejection | `docs/evidence/reject-run.md` | pending |
| 9 | Rooms and membership are enforced by Switch | `docs/switch-notes.md` rows (c), (d), (f) for agents; `docs/evidence/second-person.md` for people | pending |
| 9 | Who can trigger the reporter is enforced by Switch | `docs/switch-notes.md` row (e) for agents; `docs/evidence/second-person.md` for people | pending |
| 9 | No shell and the read limits are enforced by a settings file | `docs/evidence/agent-boundary.md` | pending |

If a claim's evidence is still pending when the video is cut, drop the line or reword it as "designed to".

## Pre-recording checklist

- [ ] Close every window that is not in the plan. Turn notifications off.
- [ ] Check every visible window for secrets and real names: channel list, server name, member list, account name, avatars, browser tabs, the Console sidebar, the dock or taskbar.
- [ ] Use a fresh `team` prefix, so no earlier run's rooms or messages are on screen.
- [ ] Reset and publish the sample site. The first command discards uncommitted edits under `sample-site/src`.

  ```
  git checkout -- sample-site/src
  node sample-site/publish.mjs
  ```

- [ ] The server is running on port 4180 and both pages show the starting text from `scenarios/reject.md`.
- [ ] The agents run under the dedicated config directory. Ask the verifier to list its tools: `fetch_page`, no shell, no web tool.
- [ ] Both Discord channels are open, side by side, scrolled to the bottom.
- [ ] Decide before recording whether the run is seeded, and prepare the on-screen label if it is.
- [ ] Decide whether the client is a second account, and prepare the caption if it is not.
- [ ] Save the recording outside the repo.
- [ ] After recording, save the run's transcript for `docs/evidence/reject-run.md` before the rooms are archived.
