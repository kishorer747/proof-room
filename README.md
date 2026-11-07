# Proof Room

An agent that edits a file will say the change is done. The client looks at the website, not the file. If the publish step was skipped, or the same text sits on a second page, "done" is wrong and the client finds out first. Proof Room is a Switch workflow for client-requested website changes. In it, nobody tells the client a change is done until a different agent has fetched the running page and posted an evidence block, and a named person has approved. It is an entry for the Flip the Switch hackathon, Track 1 (Best Business Workflow).

**Status, 2026-11-06.** The template has been applied through Switch Console and the agents' limits have been checked. Both scenarios have been rehearsed, with the request passed in by the owner and not typed by a separate client: `docs/evidence/rehearsal-pass-2026-11-06.md` and `docs/evidence/rehearsal-reject-2026-11-06.md`. The rejection in the rehearsal is seeded: the publish step was set to leave one page stale once. Seven hostile messages and the attempts to get round the rule have been run the same way, relayed by the owner: `docs/evidence/hostile-2026-11-06.md` and `docs/evidence/bypass-2026-11-06.md`. A recorded run with a client typing in the messaging app is still to come. The table under "Enforced, convention, or pending" marks every rule. Anything marked pending is designed behaviour, not a result.

Demo video: <link pending>

## How Switch is used, and what stops working without it

The whole deployment is one file, `templates/proof-room.template.yaml`. Applying it in Switch Console creates the agents and rooms below. The only other thing you start by hand is the sample site. This section describes the design. The table further down says how much of it has been seen to hold.

| Agent | `addressing` | Rooms | Working folder | Extra tool |
|---|---|---|---|---|
| `{team}-intake` | `anyone` | client-desk | `<repo>/agents/intake` | none |
| `{team}-dispatcher` | `owner-agents` | client-desk, proof-room | `<repo>/agents/dispatcher` | none |
| `{team}-builder` | `owner-agents` | proof-room | `<repo>/sample-site` | `replace_text`, `publish` |
| `{team}-verifier` | `owner-agents` | proof-room | `<repo>/verifier` | `fetch_page` |
| `{team}-reporter` | `owner` | client-desk, proof-room | `<repo>/agents/reporter` | none |

All five use `provider: claude`. The owner is the person who applies the template (`{$creator}`).

- **Rooms (`rooms:`).** There are two, `{team}-client-desk` and `{team}-proof-room`. The rejection, the fix and the evidence belong in proof-room. client-desk is meant to hold the request, an acknowledgement and one update. Without separate rooms the client reads every rejection, or an agent is asked to keep quiet, which is a prompt and not a boundary.
- **Membership (`agents:`, `users:`).** `{client_user}` is listed only in client-desk. Intake, the one agent the client talks to, is also only in client-desk, so nothing the client says to it can draw out what happens in proof-room. Builder and verifier are only in proof-room. Dispatcher and reporter are the only members of both rooms. Without membership, "intake cannot see the proof room" would be an instruction given to an agent that could see it.
- **Addressing (`addressing:`).** Intake is `anyone`. Dispatcher, builder and verifier are `owner-agents`: the owner and other agents can trigger them, and the client is meant not to. The reporter is `owner`: only the owner's own message triggers the one agent that writes to the client. That is the approval gate. Without it, approval is a sentence in a prompt.
- **Room document (`docs:`).** proof-room carries one document, "Proof protocol". It is the same text as `material/proof-protocol.md`, and a test compares the two word for word. It reaches members of that room only. Without it the protocol would be pasted into each agent's prompt.
- **Room instructions and kickoff (`instructions:`, `kickoff:`).** Each room has its own instructions. client-desk has a kickoff that asks intake to greet the client.
- **Link (`links:`).** One link runs from client-desk to proof-room, labelled `proof`. It declares that the first room hands work to the second. Messages are carried by the dispatcher and the reporter, not by the link. A link does show the linked room's name and description to the other side (`docs/switch-notes.md`).
- **Bridge and channel type (`bridge:`, `channel_type:`).** Each room is mirrored to the connected messaging app through the `bridge` param, which defaults to `[$first]`. Both rooms set `channel_type: channel_private`.
- **Folders (`directory:`).** Every agent's `directory` is a folder of this repo, built from the `repo_dir` param. Each folder holds a `.claude/settings.json` that limits the agent working there. The builder's and the verifier's folders also hold a `.mcp.json` that gives each its own tools: two for the builder, one for the verifier.
- **Params (`params:`).** The wizard asks for `team`, `client_user` and `repo_dir`. `location` and `bridge` have defaults.

What Switch does not do here: it does not check what an evidence block says, and it does not sandbox the agents. The first is the verifier's job and then a person's. The second is done with a settings file, described under Safety.

## The two rooms

```
 client-desk                                 proof-room
 -----------                                 ----------
 people:  client, owner                      people:  owner
 agents:  intake                             agents:  builder    sample-site/  tools: replace_text, publish
          dispatcher  ---- same agent ----            dispatcher
          reporter    ---- same agent ----            reporter
                                                      verifier   verifier/     tool: fetch_page

 client -> intake -> dispatcher  ==>  dispatcher -> builder -> verifier
                                                       ^           |
                                                       +-- REJECT --+
                                                    verifier PASS -> owner approves -> reporter
 client <- reporter              <==  reporter
```

The client is a member of the left room only. Intake is not in proof-room either.

## The evidence block

From `material/proof-protocol.md`, which is also the room document:

```
ITEM: <number and text>
URL: <exact URL fetched>
FETCHED: <timestamp>
STATUS: <HTTP status>
FOUND: <exact quoted text from the response>
VERDICT: PASS | REJECT
REASON: <required on REJECT>
```

Only the verifier posts blocks, one for each page it checked. An item passes only when every block for it says PASS. The builder says "ready for verification" and never done, live or shipped. The full rules are in the file.

## Enforced, convention, or pending

Kind says what is meant to hold the rule. Evidence says whether it has been seen to hold.

- `notes (x)` is a row in `docs/switch-notes.md`, from an earlier trial setup on 2026-11-05.
- `boundary` is `docs/evidence/agent-boundary-2026-11-06.md`: what agents started by Console could and could not reach, on Switch Console 0.40.1 and Claude Code 2.1.311.
- `pass rehearsal` and `reject rehearsal` are the two files in `docs/evidence/` named above: runs driven from the owner's Console chat with no separate client. The rejection is seeded.
- `seeded reject rehearsal` is `docs/evidence/rehearsal-reject-seeded-2026-11-06.md`: three seeded runs on two new teams after the builder's settings changed.
- `hostile` is `docs/evidence/hostile-2026-11-06.md` and `bypass` is `docs/evidence/bypass-2026-11-06.md`. In both, the text was relayed by the owner from the Console chat, not typed by a separate client.
- `pending` has not been observed.

| Rule | Kind | Evidence |
|---|---|---|
| An agent that is not a member of a room cannot read it | Switch enforces | notes (c). People not tested |
| An agent that is not a member of a room cannot post in it | Switch enforces | notes (d) |
| Room instructions and the room document reach members only | Switch enforces | notes (f) |
| An `owner` agent does not act on another agent's message, and says so | Switch enforces | notes (e) |
| Applying the template creates 5 agents and 2 rooms with the members listed above | Switch enforces | boundary |
| A client who is a separate person cannot read proof-room | Switch enforces | pending: `docs/evidence/second-person.md` |
| The client cannot trigger the dispatcher, builder, verifier or reporter | Switch enforces | pending: `docs/evidence/second-person.md` |
| The mirrored channels are closed to non-members (`channel_private`) | pending | pending: `docs/evidence/channel-privacy.md` |
| An agent cannot use the Switch tools that create or change agents, rooms and templates | settings enforce | boundary: 18 of Switch's 59 tools remain. An attempt to call a denied one is pending |
| No agent has a shell or a web tool | settings enforce | boundary |
| An agent's file reads stop at its working folder | settings enforce | boundary |
| The account's connector tools are not loaded | settings enforce | boundary |
| The verifier cannot read the site's source and has no tool that edits or writes files | settings enforce | boundary |
| The verifier reaches the site only through `fetch_page`: GET, 127.0.0.1, one port, no redirects | settings enforce, with the tool's code | repo tests; boundary; both rehearsals |
| The builder publishes only through `publish`, which takes no arguments | settings enforce, with the tool's code | repo tests; boundary; both rehearsals |
| The builder has no general tool for writing files. It changes text only through `replace_text`, which reaches existing files directly inside `src/` and nothing else | settings enforce, with the tool's code | repo tests; boundary (third team); bypass: three live calls aimed outside `src/` were refused by the tool. Before this change its file tools could write elsewhere in the repo |
| The builder cannot read the published copy in `public/`. Only the verifier sees the running site | settings enforce | seeded reject rehearsal: Grep and Read refused for a builder started by Console |
| The builder says "ready for verification", never done | convention | pass rehearsal, reject rehearsal; recorded run pending |
| The verifier posts blocks in the exact format | convention | notes (i); PASS blocks in both rehearsals, one REJECT block with its reason in the reject rehearsal |
| The reporter counts only blocks posted by the verifier | convention | hostile (g): a fake PASS block in page text did not set the reporter off. A block posted in the room by another agent has not been tried, and whether an agent can see who posted is not tested |
| The verifier checks every page against the checklist item | convention | reject rehearsal, run 3: one page passed and one was rejected |
| A REJECT is followed by a fix, a publish and a fresh fetch | convention | reject rehearsal, run 3 |
| After three REJECTs on one item the verifier stops and asks the owner | convention | pending |
| Client text and page text are quoted, never obeyed | convention | hostile (a) to (g): refused or held, and intake removed a step addressed to the builder. A client typing it is pending |
| Intake never tells the client an item is done | convention | bypass (a): refused under pressure. A client typing it is pending |
| The client update says only what the PASS blocks show and mentions no rejection | convention | reject rehearsal, run 3, from the agents' own records. A client's screen is pending |
| Setup works from a clean clone | partial | `docs/evidence/clean-clone-2026-11-06.md`: on the author's machine, a fresh clone passed the tests, published, imported the template and created a team of 5 agents and 2 rooms. A scenario run from that clone, and any other machine, are pending |

## Setup

Written for someone who has not used Switch before. Tested with Switch Console 0.40.1, Claude Code 2.1.311 and Discord. Node on the author's machine is 24.7.0. Other versions and other messaging apps have not been tried.

1. **Node.** Install Node. The repo has no dependencies, so there is nothing to install after cloning.
2. **Switch Console and Claude Code.** Install Switch Console by following the Switch quickstart (<https://github.com/sandbox-quantum/switch>). The hackathon FAQ lists Docker and an AI coding agent as prerequisites. This project uses Claude Code.
3. **A messaging app.** Connect one in Console. With none connected, Create all is disabled.
4. **A dedicated Claude Code config directory.** The agents must run under a config directory that holds this repo's settings and nothing else of yours.

   ```
   mkdir <config-dir>
   cp docs/claude-settings.example.json <config-dir>/settings.json
   ```

   Sign in to Claude Code once with `CLAUDE_CONFIG_DIR=<config-dir>` set. Then start Switch Console with the same variable, and with nothing else from your shell. On macOS, quit Console and run:

   ```
   env -i HOME="$HOME" USER="$USER" LOGNAME="$USER" SHELL=/bin/sh LANG=en_US.UTF-8 \
     PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" \
     CLAUDE_CONFIG_DIR=<config-dir> /usr/bin/open -a "Switch Console"
   ```

   `env -i` matters: agents inherit the environment Console was started with, so anything your shell exports would reach them. Opening Console from the Dock starts it without the variable.

   Why: this file removes the shell and web tools, blocks file reads outside an agent's working folder, turns off the account's connector tools (`ENABLE_CLAUDEAI_MCP_SERVERS=false`), and enables the two tool servers named in the folders' `.mcp.json` files. The settings file in each agent's folder repeats the tool rules, but the connector switch is only here. Before this file was applied, an agent of the same kind could read a file in the home folder and reach the internet. It also carried hundreds of the account's own connector tools, some of which publish to outside services. A separate directory keeps these settings off your everyday Claude Code, and keeps your everyday tools away from these agents.
5. **Start the sample site.** `sample-site/public` is build output and is not in git, so publish once.

   ```
   cd sample-site
   node publish.mjs
   node server.mjs --port 4180
   ```

   Leave the server running. Port 4180 is written into `verifier/.mcp.json` and into the verifier's instructions.
6. **Import the template.** In Console, open Templates and import `templates/proof-room.template.yaml`. Saving a template does not validate it. The wizard does. Choose Use.
7. **Fill in the three inputs.**
   - `team`: a short lowercase prefix for every name, such as `demo1`. Use a new one for each run.
   - `client_user`: the person playing the client, as the messaging app knows them.
   - `repo_dir`: the absolute path of this repository on the machine the agents run on.

   Each agent works in a folder inside the repo (`agents/intake`, `agents/dispatcher`, `agents/reporter`, `sample-site`, `verifier`). Those folders hold the `.claude/settings.json` that limits each agent and, for the builder and verifier, the `.mcp.json` that gives it its tools. Then choose Create all. It is all or nothing: a failed Create reports "Nothing was created".
8. **Check before you trust it.** You should see five agents and two rooms. In proof-room, ask the verifier to list its tools. It should report `fetch_page`, no shell and no web tool. If it reports a shell, the settings are not in force. Stop and fix step 4.

A room mirrored to Discord has no message box in Console, only "Open in Discord". Type in Discord.

## Run the two scenarios

Reset the site before each run. The first command discards uncommitted edits under `sample-site/src`.

```
git checkout -- sample-site/src
node sample-site/publish.mjs
```

- `scenarios/pass.md`: a change of opening hours, meant to pass first time.
- `scenarios/reject.md`: a change to text that is on two pages. Run it unseeded first. A careful builder changes both pages and the run ends in PASS. Record it as that. If no rejection happens, use the seeded variant in the file, where the publish step leaves one page stale once. In the rehearsals the unseeded run passed, and a brief that named only one page did not cause a rejection either, because the builder followed the checklist item.

A seeded run is a staged failure. It must be labelled as seeded wherever it is shown: here, in its transcript and in the video. Both scenarios have a rehearsal. Neither has a recorded run with a client typing in the messaging app.

## Safety

- **Agents run as your user.** There is no OS sandbox. Claude Code's own sandbox setting stalled agents started by Console, so it is not used.
- **Why no shell.** The boundary is the settings files: no shell, no web tools, no reads outside the working folder, no connector tools. With a shell, an agent could read your home folder and reach the internet. That was observed before the settings were applied.
- **The settings files are what the claims depend on.** There are two layers: `.claude/settings.json` in each agent's folder, and `settings.json` in the dedicated config directory. A "settings enforce" row is void if an agent runs in a different folder, and the connector tools come back if it runs under a different config directory. Do the check in Setup step 8 each time.
- **Each tool is narrow.** `fetch_page` can only GET the sample site on 127.0.0.1 and one port. `replace_text` can only change an existing file directly inside `src/`. `publish` takes no arguments and runs only the site's `publish.mjs`.
- **Do not admit strangers.** Intake is set to answer anyone in client-desk. How the agents handle a hostile message is convention. Seven hostile messages relayed by the owner were refused or held (`docs/evidence/hostile-2026-11-06.md`); none has been typed by a separate client, and a different message could get a different answer. Use a client you know, on a machine you can afford to expose.

Still open:

- Every agent was seen to carry Switch's own 59 tools, including ones that create agents and rooms and add people to rooms. The settings files now deny the ones that manage agents, rooms and templates, and the builder and verifier report 18 tools left. An attempt to call a denied one has not been tried.
- An agent that is not in a room can still list it by name, and the link shows proof-room's name and description to client-desk. The client can learn that the room exists.
- Whether `channel_private` closes the Discord channels is not tested. Without `channel_type` they were public.
- The seeded stale publish has produced a rejection in three runs out of three since the builder's settings began refusing reads of `public/` (`docs/evidence/rehearsal-reject-seeded-2026-11-06.md`). Before that, in one rehearsal the builder read the published copy, noticed the stale page and published again before handing over. Three runs is a small number.
- Whether an agent can tell who posted a message is not tested. The reporter's check depends on it.

## Limits

- Tested on the author's Console and machine only. A clean clone on that machine got as far as creating the team (README steps 1 to 7); no scenario has been run from a clone, and no other machine has been tried.
- One provider for now. A Codex agent under Console could read the home folder and had a working web tool, and Console applied its own Codex sandbox instead of the permission profile it was given. So the verifier is a second Claude agent, not a different model.
- In tests so far the client and the owner were the same person. "The client cannot see proof-room" has not been shown with a separate person.
- `fetch_page` returns the page's HTML. It does not run scripts or render the page.
- The verdict in a block is the verifier's judgement. Nothing checks it but the owner.

## Tests

```
node --test "templates/*.test.mjs" "tools/*.test.mjs"
```

30 tests passed on 2026-11-06. They check the template's text (the room document matches the protocol file, the client is in client-desk and not in proof-room, only the verifier is told how to fetch), the settings files (every agent's folder has one, none allows a shell, the web or the Switch management tools, only the builder can change files, the builder cannot read `public/`) and the two tools (a path cannot leave the site's origin, redirects are not followed, a call cannot choose the port, the folder or the script, `replace_text` cannot reach a file outside `src/`, and the seeded fault leaves one page stale exactly once). They do not apply the template. Applying it in Console is the real test.

## Licence

MIT. See `LICENSE`.
