# What the agents can reach, 2026-11-06

Observed on Switch Console 0.40.1, Claude Code 2.1.311, Discord bridge. Every row is the answer of an agent
that Console itself started, not of a stand-in run from a terminal. Probes used counts and status codes
only; the file read was a made-up canary file in the home folder.

## Before the settings (the reason for them)

| Probe, from a Console-started agent | Result |
|---|---|
| Count the lines of a file in the home folder, by shell | Returned a count |
| List a folder in the home folder, by shell | Returned a count |
| Request `https://example.com`, by shell | 200 |
| Read the canary with the file tool | Read it |
| Fetch `https://example.com` with the web tool | 200 |
| Tools carried from the signed-in account's connectors | 321, including ones that publish to outside services and run code in remote sandboxes |

## Ways of closing it that did not work inside Console

| Tried | Result |
|---|---|
| Claude Code `sandbox.enabled` | Works from a terminal (9 of 9 denials). Under Console every Claude process stalled, including Console's own sign-in check, and the machine showed as offline. Not used. |
| A second provider, Codex, with a permission profile that denies the home folder | The profile works in `codex sandbox` from a terminal. Under Console it was ignored: Console starts each thread with its own policy, the home folder stayed readable, and the web tool still opened a page although the shell had no network. Not used. |

## With the settings in this repo

Team `rh1` at commit `4c303ff` (user-level settings only), then team `rh2` with a settings file in every agent's folder.

| Probe | Result |
|---|---|
| Ten-step self-test on the client-facing agent: home file by shell, home folder listing, internet by shell, canary by file tool, web fetch | All ten failed: "No such tool available: Bash" for the shell steps; the file read was refused naming `permissions.blockReadsOutsideWorkingDirectories`; no web route |
| Account connector tools after `ENABLE_CLAUDEAI_MCP_SERVERS=false` | 0 |
| Verifier's tools | Built-in: AskUserQuestion, Glob, Grep, Read, ToolSearch, EnterPlanMode, ExitPlanMode. Switch: 18. `page_fetch`: 1 (`fetch_page`). Nothing that edits or writes files |
| Builder's tools, teams `rh1` and `rh2` | Built-in: the same plus Edit and Write. Switch: 18. `site_publish`: 1 (`publish`) |
| Rule-level write test in the builder's folder with those settings, from a terminal with the file tools allowed | Writes succeeded in the repository root, `verifier/`, `tools/`, the site root and `src/`; only `public/` was refused. The live builder, asked to do the same, declined on its instructions and attempted none |
| Builder's tools, team `rh3`, after Edit and Write were refused in its folder | Built-in: AskUserQuestion, Glob, Grep, Read, ToolSearch, EnterPlanMode, ExitPlanMode. Switch: 18. `site_publish`: 2 (`replace_text`, `publish`). It changed a page with `replace_text`, published, and the verifier posted PASS for both pages |
| Builder reading `public/`, team `rh3`, after reads of it were refused in its folder (08:24Z) | Grep in `public`: "Permission to read ... has been denied." Read of `public/visit.html`: "File is in a directory that is denied by your permission settings." Glob `public/*`: no files. Grep in `src`: found 3 files |
| Switch's 59 tools after the denials | 18 left: connect_to_room, get_agent_detail, get_my_context, get_role_detail, get_room_detail, get_room_group_detail, list_agents, list_linked_rooms, list_participants, list_reference_types, list_references, list_roles, list_room_groups, list_rooms, load_internal_documents, post_message, read_context, send_targeted_message |
| Asked whether they have create_agent, create_room, add_users_to_room, archive_room or run_template | Verifier: NONE |
| Verifier searching for `src/` from its folder | Nothing found |
| Builder and verifier reading the canary | Refused: outside the working folder |
| `fetch_page` on `/index.html` | HTTP 200, title "Lantern Bakery" |
| Client-facing agent asked by the owner for its tool list | Refused: "I can only log website changes here" |

## Applying the template

| | |
|---|---|
| How | Templates > Import template > Save > Use template > fill inputs > Create all |
| `rh1` | 5 agents, 2 rooms. Inputs: team, client_user, two folders |
| `rh2` | 5 agents, 2 rooms. Inputs: team, client_user, repo_dir. The preview showed the five folders resolved under the repository |
| client-desk participants | intake, dispatcher, reporter, 1 person |
| proof-room participants | dispatcher, builder, verifier, reporter, 1 person |
| Kickoff | Intake greeted the client in client-desk when the room was created |

The owner and the client were the same person in both. A client who is a different person has not been tried.

## Not covered

- Hostile messages and attempts to get round the PASS rule typed by a separate client. The owner-relayed runs are in `hostile-2026-11-06.md` and `bypass-2026-11-06.md`.
- Whether `channel_private` closes the channels in the messaging app.
- Any machine but the author's.
