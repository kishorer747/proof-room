# From zero to two agents that check each other's work

An agent that edits a file will say the change is done. The client looks at the live page, not the file. If the publish step was skipped, or the same text sits on a second page, "done" is wrong and the client finds out first.

This is how I built Proof Room, my entry for the Flip the Switch hackathon, on Switch Console 0.40.1, Claude Code 2.1.311 and Discord. It ran on one machine only.

## What I built

Proof Room is a Switch workflow. In it, nobody tells the client a website change is done until a different agent has fetched the running page and posted an evidence block, and a named person has approved. One template file creates five agents and two rooms.

```
 client-desk                                 proof-room
 -----------                                 ----------
 people:  client, owner                      people:  owner
 agents:  intake                             agents:  builder    sample-site/  tool: publish
          dispatcher  ---- same agent ----            dispatcher
          reporter    ---- same agent ----            reporter
                                                      verifier   verifier/     tool: fetch_page

 client -> intake -> dispatcher  ==>  dispatcher -> builder -> verifier
                                                       ^           |
                                                       +-- REJECT --+
                                                    verifier PASS -> owner approves -> reporter
 client <- reporter              <==  reporter
```

The client is a member of the left room only. The builder edits a small sample site (Lantern Bakery, a made-up shop) and publishes it. The verifier fetches the running pages and posts one evidence block per page. An item passes only when every block says PASS.

The reporter is set to `addressing: owner`, so only the owner's own message triggers the one agent that writes to the client. That is the approval gate.

## Setting up

Steps 1 to 9 get one agent answering in a room. Step 10 checks the rest.

1. **Install Node.** The repo has no dependencies. I used Node 24.7.0.
2. **Install Switch Console and Claude Code.** Follow the Switch quickstart for Console.
3. **Connect a messaging app in Console.** With none connected, Create all is disabled.
4. **Make a dedicated Claude Code config directory.**

   ```
   mkdir <config-dir>
   cp docs/claude-settings.example.json <config-dir>/settings.json
   ```

   Sign in to Claude Code once with `CLAUDE_CONFIG_DIR=<config-dir>` set. The file removes the shell and web tools, blocks file reads outside an agent's working folder, and turns off your account's connector tools. A separate directory keeps your everyday tools away from these agents.
5. **Start Console with a clean environment.** On macOS, quit Console and run:

   ```
   env -i HOME="$HOME" USER="$USER" LOGNAME="$USER" SHELL=/bin/sh LANG=en_US.UTF-8 \
     PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" \
     CLAUDE_CONFIG_DIR=<config-dir> /usr/bin/open -a "Switch Console"
   ```

   Agents inherit the environment Console was started with, so anything your shell exports would reach them. Opening Console from the Dock starts it without the variable.
6. **Start the sample site** and leave it running.

   ```
   cd sample-site
   node publish.mjs
   node server.mjs --port 4180
   ```

7. **Import the template.** Templates > Import template > Save > Use template. The file is `templates/proof-room.template.yaml`.
8. **Fill in the three inputs.** `team` is a short lowercase prefix for every name. `client_user` is the person playing the client. `repo_dir` is the absolute path of the repository.
9. **Choose Create all.** It is all or nothing: a failed Create reports "Nothing was created". When it succeeded, intake greeted the client in client-desk as the room was created. That is your first agent answering.
10. **Check before you trust it.** You should see five agents and two rooms. In proof-room, ask the verifier to list its tools. It should report `fetch_page`, no shell and no web tool. If it reports a shell, go back to step 4.

Four things the docs did not make clear to me:

- **Saving a template does not validate it.** A room document missing `description` and `instructions` saved, then the wizard refused it with "Could not load this template".
- **A room needs a bridge.** Without `bridge:` a room fails even with a messaging app connected: "it is on no messaging app". Declare a `bridge` param with `default: [$first]`.
- **No `channel_type` means public channels.** An earlier template made Discord channels with 0 permission overwrites. This one sets `channel_private`. Whether that closes them is not tested.
- **A bridged room has no message box in Console**, only "Open in Discord". Type in Discord.

## The first full run

This was a rehearsal. I passed the client's message to intake from my own Console chat, word for word, and approved from there. No separate client typed anything.

The message was "Please change our opening hours to 8 to 6." Intake logged one item, the dispatcher carried it across, and the builder edited both pages, published, and said "ready for verification". The verifier fetched both pages and posted a block for each. One, exactly as posted:

```
ITEM: 1. Change our opening hours to 8 to 6.
URL: http://127.0.0.1:4180/index.html
FETCHED: 2026-11-06T07:26:35Z
STATUS: 200
FOUND: "Open every day, 8 am to 6 pm"
VERDICT: PASS
```

It also flagged the builder's reading:

> One thing to weigh before you approve: the client wrote only "8 to 6". The pages now say 8 am to 6 pm and still say "every day"; the am/pm reading and the unchanged days are the builder's interpretation, not something the client stated.

I sent "Item 1 is approved." and the reporter posted the client update. The run went from 07:25:03Z to 07:28:34Z.

## The rejection

The reject scenario changes a cake-order notice from 48 hours to 72 hours. The text is on two pages and the message does not say which.

Run unseeded, it passed: the builder found the notice on both pages and changed both. Then I briefed the builder to change the home page only. It followed the checklist item, not the brief, and changed both pages again.

So the rejection I can show is seeded: I staged a stale publish on purpose. The failure worth showing is the one only the running page reveals, where the source is right and the site is not. That lives in the publish step, so I started the builder's publish tool with `--stale-once visit.html`. The first publish leaves that page as it was and still reports success. The builder is not told. I again drove the run from my Console chat, with no separate client.

The verifier's block for the stale page:

```
ITEM: 1. Change the notice for whole cakes from 48 hours to 72 hours.
URL: http://127.0.0.1:4180/visit.html
FETCHED: 2026-11-06T07:44:53Z
STATUS: 200
FOUND: "Whole cakes need 48 hours' notice."
VERDICT: REJECT
REASON: The notice under "Ordering a whole cake" still reads 48 hours; the item requires 72.
```

The builder published again, changing no text. From its reply:

> What I found: my source already read 72 hours on both pages, but the published copy of visit.html read 48, as your block shows. [...] I can't explain why the earlier publish left Visit us at 48: it reported copying all three files.

The verifier fetched again, posted PASS for both pages, and warned me that the cause was unknown. The client desk received three posts and none mentions a rejection. That comes from the agents' own records, not from a client's screen.

## What broke along the way

Switch does not sandbox agents. Before any settings, I probed an agent that Console itself had started.

- A shell command counted the lines of a file in the home folder.
- `https://example.com` returned 200, by shell and by the web tool.
- The agent carried 321 tools from the signed-in account's connectors, including ones that publish to outside services.

Two fixes worked from a terminal and failed inside Console.

1. **Claude Code `sandbox.enabled`.** From a terminal: 9 of 9 denials. Under Console every Claude process stalled, including Console's own sign-in check, and the machine showed as offline.
2. **A Codex agent with a permission profile that denies the home folder.** It works in `codex sandbox` from a terminal. Under Console it was ignored: Console starts each thread with its own policy, and the home folder stayed readable.

So test the boundary from an agent Console started, not from a terminal.

What worked was no shell at all. The settings deny `Bash`, `WebFetch` and `WebSearch`, set `blockReadsOutsideWorkingDirectories` and `ENABLE_CLAUDEAI_MCP_SERVERS=false`, and deny the Switch tools that manage agents, rooms and templates. The builder and the verifier then get one narrow tool each:

- `fetch_page`: GET only, 127.0.0.1 and one port, no redirects, a size cap.
- `publish`: takes no arguments and runs only the site's own `publish.mjs`.

With the settings, a ten-step self-test on the client-facing agent failed all ten. The shell steps returned "No such tool available: Bash". The file read was refused, naming `permissions.blockReadsOutsideWorkingDirectories`. Connector tools went from 321 to 0, and Switch's own tools from 59 to 18.

The rules are void if an agent runs in a different folder, and the connector tools come back under a different config directory. Hence step 10, every time.

## What Switch enforces and what is only convention

| Rule | Held by | Seen to hold |
|---|---|---|
| An agent outside a room cannot read or post in it | Switch | Yes for agents. People not tested |
| An `owner` agent does not act on another agent's message | Switch | Yes, with a visible refusal |
| A separate client cannot read proof-room or trigger the other agents | Switch | Pending |
| No shell, no web tool, no reads outside the working folder | settings | Yes |
| The builder cannot edit the publish script | settings | Pending |
| The builder says "ready for verification", never done | convention | Both rehearsals (owner-driven, rejection seeded) |
| The reporter counts only the verifier's blocks | convention | Pending |

Switch does not check what a block says. Only the owner checks the verifier's verdict.

## What I would do next

- Record a run with a separate person typing as the client.
- Test whether `channel_private` closes the Discord channels.
- Try hostile client messages and the bypasses: a denied Switch tool, an edit to the publish script, a block not posted by the verifier.
- Set it up from a clean clone on another machine.

Repo: <link pending>

## Claims checklist (remove before publishing)

Line numbers are those of the source file at the time of writing. "boundary" is `docs/evidence/agent-boundary-2026-11-06.md`, "pass" is `docs/evidence/rehearsal-pass-2026-11-06.md`, "reject" is `docs/evidence/rehearsal-reject-2026-11-06.md`, "notes" is `docs/switch-notes.md`, "template" is `templates/proof-room.template.yaml`.

Note: while this draft was being written, uncommitted edits by someone else appeared in `templates/proof-room.template.yaml`, `tools/site-publish-mcp.mjs`, `docs/claude-settings.example.json` and `sample-site/.mcp.json`. They give the builder a second tool, `replace_text`, and take away its general file tools. The post describes the committed state that the README and both rehearsals record (builder edits with its file tools, one extra tool each). If those edits land, rows 9, 40 and 65 to 67 and the "one narrow tool each" paragraph need another pass. Template and tool citations below name keys and comments, not line numbers, for that reason.

| # | Claim in the post | Source file | Line or heading |
|---|---|---|---|
| 1 | An agent that edits a file says done; the client looks at the page, not the file; a skipped publish or a second page makes "done" wrong; the client finds out first | README.md | line 3 |
| 2 | Proof Room is an entry for the Flip the Switch hackathon | README.md | line 3 |
| 3 | Switch Console 0.40.1, Claude Code 2.1.311, Discord | boundary; README.md | line 3; "Setup", line 111 |
| 4 | Ran on one machine only | README.md | "Limits", line 186 |
| 5 | Nobody tells the client until a different agent fetched the running page, posted an evidence block, and a named person approved | README.md | line 3 |
| 6 | One template file creates five agents and two rooms | README.md; boundary | lines 11, 86; "Applying the template", lines 47-48 |
| 7 | The two-room diagram | README.md | "The two rooms", lines 37-51 |
| 8 | The client is a member of the left room only | README.md | line 53 |
| 9 | The builder edits a sample site and publishes it | README.md; template | line 17; builder `instructions` |
| 10 | The sample site is called Lantern Bakery | boundary | line 39 (page title) |
| 11 | "a made-up shop" | NO SOURCE FILE. Taken from the writing brief | n/a |
| 12 | The verifier fetches the running pages and posts one block per page | material/proof-protocol.md; README.md | line 6; line 69 |
| 13 | An item passes only when every block says PASS | material/proof-protocol.md | line 23 |
| 14 | Reporter is `addressing: owner`; only the owner's own message triggers the one agent that writes to the client; that is the approval gate | README.md; template | line 25; reporter agent, `addressing: owner` |
| 15 | The repo has no dependencies | README.md | "Setup" step 1 |
| 16 | Node 24.7.0 | README.md | line 111 |
| 17 | Install Console by following the Switch quickstart; the project uses Claude Code | README.md | "Setup" step 2 |
| 18 | With no messaging app connected, Create all is disabled | README.md; notes | "Setup" step 3; line 21 |
| 19 | `mkdir` and `cp` commands for the config directory | README.md | "Setup" step 4, lines 118-121 |
| 20 | Sign in once with `CLAUDE_CONFIG_DIR=<config-dir>` set | README.md | line 123 |
| 21 | The settings file removes the shell and web tools, blocks reads outside the working folder, turns off the account's connector tools; a separate directory keeps everyday tools away from the agents | README.md | line 133 |
| 22 | The `env -i ... open -a "Switch Console"` command; on macOS; quit Console first | README.md | lines 123-129 |
| 23 | Agents inherit the environment Console was started with; opening from the Dock starts it without the variable | README.md | line 131 |
| 24 | Sample site commands; port 4180; leave the server running | README.md | "Setup" step 5, lines 136-142 |
| 25 | Templates > Import template > Save > Use template | boundary | line 46 |
| 26 | Template file is `templates/proof-room.template.yaml` | README.md | "Setup" step 6 |
| 27 | Three inputs: `team` (short lowercase prefix for every name), `client_user` (the person playing the client), `repo_dir` (absolute path of the repository) | README.md; template | "Setup" step 7; `params:` block |
| 28 | Create all is all or nothing; a failed Create reports "Nothing was created" | README.md; notes | line 149; row (a) |
| 29 | Intake greeted the client in client-desk when the room was created | boundary | line 51 |
| 30 | Check: five agents and two rooms; the verifier should report `fetch_page`, no shell, no web tool; a shell means the settings step failed | README.md | "Setup" step 8, line 150 |
| 31 | Saving a template does not validate it; a room document missing `description` and `instructions` saved; wizard said "Could not load this template" | notes | line 20 |
| 32 | A room with no `bridge:` fails even with a messaging app connected: "it is on no messaging app"; declare a `bridge` param with `default: [$first]` | notes | line 22 |
| 33 | A template with no `channel_type` made Discord channels with 0 permission overwrites, so public; from an earlier setup | notes; README.md | line 23; line 75 |
| 34 | This template sets `channel_private`; whether that closes the channels is not tested | template; notes; README.md | `channel_type` under both rooms; line 23; line 89 |
| 35 | A bridged room has no message box in Console, only "Open in Discord"; type in Discord | notes; README.md | line 24; line 152 |
| 36 | The pass run was a rehearsal | pass | line 3 |
| 37 | The request was passed to intake by the owner from the Console chat, word for word; no client identity posted it | pass | line 10 |
| 38 | The approval was sent from the owner's Console chat | pass | line 11 |
| 39 | Client message "Please change our opening hours to 8 to 6." | pass; scenarios/pass.md | line 9; "Client message" |
| 40 | Intake logged one item; the dispatcher carried it across; the builder edited both pages, published and said "ready for verification" | pass | "Result", steps 1-3 |
| 41 | The verifier fetched both pages and posted a block for each | pass | "Result", step 4 |
| 42 | PASS block for `/index.html`: FETCHED 2026-11-06T07:26:35Z, STATUS 200, FOUND "Open every day, 8 am to 6 pm" | pass | transcript 07:26:49Z, lines 100-105 |
| 43 | Verifier quote "One thing to weigh before you approve: ... not something the client stated." (first two sentences of that paragraph) | pass | transcript 07:26:49Z, line 117 |
| 44 | "Item 1 is approved."; the reporter then posted the client update | pass | line 11; "Result", step 5 |
| 45 | 07:25:03Z to 07:28:34Z | pass | line 12 |
| 46 | Reject scenario: whole-cake notice from 48 hours to 72 hours; text on two pages; message does not say which | scenarios/reject.md | lines 7-13 |
| 47 | Unseeded run passed: the builder found the notice on both pages and changed both | reject | summary table, run 1 |
| 48 | The owner briefed the builder to change the home page only; the builder followed the checklist item, not the brief, and changed both pages | reject | summary table, run 2 |
| 49 | The rejection is seeded: a stale publish staged on purpose | reject; README.md | lines 4, 19; line 5 |
| 50 | The failure worth showing is the one only the running page reveals; source right, site not; staged in the publish step | scenarios/reject.md | line 36 |
| 51 | `--stale-once visit.html`; the first publish leaves that page as it was and still reports success; the builder is not told | scenarios/reject.md; tools/site-publish-mcp.mjs | lines 39-42; header comment, `--stale-once` paragraph |
| 52 | The reject run was driven from the owner's Console chat; no client identity posted | reject | lines 10-11 |
| 53 | REJECT block for `/visit.html`: FETCHED 2026-11-06T07:44:53Z, STATUS 200, FOUND "Whole cakes need 48 hours' notice.", REASON line | reject | run 3 transcript 07:45:01Z, lines 105-111 |
| 54 | The builder published again and changed no text | reject | run 3 transcript 07:45:10Z and 07:45:22Z, lines 116-120 |
| 55 | Builder quote "What I found: ... as your block shows." and "I can't explain why ... all three files." (excerpt, one sentence omitted at [...]) | reject | run 3 transcript 07:45:22Z, line 120 |
| 56 | The verifier fetched again, posted PASS for both pages, and said the cause is unknown | reject | run 3 transcript 07:45:44Z, lines 140-162 |
| 57 | The client desk received three posts; none mentions a rejection; taken from the agents' records, not a client's screen | reject | "What the client desk received in run 3", lines 27-30 |
| 58 | Switch does not sandbox the agents | README.md | line 33 |
| 59 | Probes were on an agent Console itself started | boundary | lines 3-4, table heading line 9 |
| 60 | A shell command counted the lines of a file in the home folder | boundary | "Before the settings", row 1 |
| 61 | `https://example.com` returned 200 by shell and by the web tool | boundary | "Before the settings", rows 3 and 5 |
| 62 | 321 tools from the signed-in account's connectors, including ones that publish to outside services | boundary | "Before the settings", row 6 |
| 63 | `sandbox.enabled`: 9 of 9 denials from a terminal; under Console every Claude process stalled, including Console's sign-in check; machine showed as offline | boundary | "Ways of closing it that did not work inside Console", row 1 |
| 64 | Codex permission profile: works in `codex sandbox` from a terminal; ignored under Console; Console starts each thread with its own policy; home folder stayed readable | boundary | same table, row 2 |
| 65 | Settings deny `Bash`, `WebFetch`, `WebSearch`; set `blockReadsOutsideWorkingDirectories` and `ENABLE_CLAUDEAI_MCP_SERVERS=false`; deny the Switch tools that manage agents, rooms and templates | docs/claude-settings.example.json; README.md | `env` and `permissions`; line 178 |
| 66 | `fetch_page`: GET only, 127.0.0.1 and one port, no redirects, a size cap | tools/page-fetch-mcp.mjs | header comment, lines 5-7 |
| 67 | `publish`: takes no arguments, runs only the site's own `publish.mjs` | tools/site-publish-mcp.mjs; README.md | header comment; line 173 |
| 68 | Ten-step self-test on the client-facing agent, all ten failed; "No such tool available: Bash"; the file read was refused naming `permissions.blockReadsOutsideWorkingDirectories` | boundary | "With the settings in this repo", row 1 |
| 69 | Connector tools from 321 to 0 | boundary | "Before the settings", row 6; "With the settings", row 2 |
| 70 | Switch's own tools from 59 to 18 | boundary; notes | "With the settings", row 5; line 29 |
| 71 | Rules are void if an agent runs in a different folder; connector tools come back under a different config directory; do the check each time | README.md | "Safety", line 172 |
| 72 | A non-member agent cannot read or post in a room; people not tested | README.md; notes | lines 82-83; rows (c), (d) |
| 73 | An `owner` agent does not act on another agent's message, with a visible refusal | README.md; notes | line 85; row (e) |
| 74 | A separate client cannot read proof-room or trigger the other agents: pending | README.md | lines 87-88 |
| 75 | No shell, no web tool, no reads outside the working folder: settings, seen | README.md | lines 91-92 |
| 76 | The builder cannot edit the publish script: pending | README.md | line 97 |
| 77 | Builder says "ready for verification": convention, seen in both rehearsals; rehearsals owner-driven, rejection seeded | README.md | lines 98, 77 |
| 78 | The reporter counts only the verifier's blocks: pending | README.md | line 100 |
| 79 | Switch does not check what a block says; only the owner checks the verifier's verdict | README.md | line 33; "Limits", line 190 |
| 80 | Next: a recorded run with a separate person typing as the client | README.md | lines 5, 87-88, 188 |
| 81 | Next: test whether `channel_private` closes the Discord channels | README.md | line 89; "Still open", line 180 |
| 82 | Next: hostile client messages | README.md | lines 104-105; "Safety", line 174 |
| 83 | Next: bypasses: a denied Switch tool, an edit to the publish script, a block not posted by the verifier | README.md | lines 90, 97, 100 |
| 84 | Next: a clean clone on another machine | README.md | line 107 |
