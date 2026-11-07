# From zero to two agents that check each other's work

An agent that edits a file will say the change is done. The client looks at the live page, not the file. If the publish step was skipped, or the same text sits on a second page, "done" is wrong and the client finds out first.

This is how I built Proof Room, my entry for the Flip the Switch hackathon, on Switch Console 0.40.1, Claude Code 2.1.311 and Discord. It ran on one machine only.

Repo: <https://github.com/kishorer747/proof-room>. Demo video: [`docs/demo.mp4`](demo.mp4), 2 min 19 s, a **seeded** run (the failure in it was staged on purpose, see "The rejection"). Its record: [`docs/evidence/reject-run-2026-11-07.md`](evidence/reject-run-2026-11-07.md).

## What I built

Proof Room is a Switch workflow. In it, nobody tells the client a website change is done until a different agent has fetched the running page and posted an evidence block, and a named person has approved. One template file creates five agents and two rooms.

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

The client is a member of the left room only. The builder edits a small sample site in the repo (Lantern Bakery) and publishes it. The verifier fetches the running pages and posts one evidence block per page. An item passes only when every block says PASS.

The reporter is set to `addressing: owner`, so only the owner's own message triggers the one agent that writes to the client. That is the approval gate.

## Setting up

Steps 1 to 9 get one agent answering in a room. Step 10 checks the rest.

1. **Install Node.** The repo has no dependencies. I used Node 24.7.0.
2. **Install Switch Console and Claude Code.** Follow the Switch quickstart for Console (<https://github.com/sandbox-quantum/switch>).
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
8. **Fill in the three inputs.** `team` is a short lowercase prefix for every name; use a new one for each run. `client_user` is the person playing the client. `repo_dir` is the absolute path of the repository.
9. **Choose Create all.** It is all or nothing: a failed Create reports "Nothing was created". When it succeeded, intake greeted the client in client-desk as the room was created. That is your first agent answering.
10. **Check before you trust it.** You should see five agents and two rooms. In proof-room, ask the verifier to list its tools. It should report `fetch_page`, no shell and no web tool. If it reports a shell, go back to step 4.

Four things the docs did not make clear to me:

- **Saving a template does not validate it.** A room document missing `description` and `instructions` saved, then the wizard refused it with "Could not load this template".
- **A room needs a bridge.** Without `bridge:` a room fails even with a messaging app connected: "it is on no messaging app". Declare a `bridge` param with `default: [$first]`.
- **No `channel_type` means public channels.** An earlier template made Discord channels with 0 permission overwrites. This one sets `channel_private`. Whether that closes them is not tested.
- **A bridged room has no message box in Console**, only "Open in Discord". Type in Discord.

I also followed these steps from a fresh clone, on the same machine: the tests passed, the site published, and the template created a team of five agents and two rooms ([`clean-clone-2026-11-06.md`](evidence/clean-clone-2026-11-06.md)). No scenario has been run from that clone, and no other machine has been tried.

## The first full run

This was a rehearsal. I passed the client's message to intake from my own Console chat, word for word, and approved from there. No separate client typed anything. The pass scenario has no recorded run in the messaging app yet.

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

So every rejection I can show is **seeded**: I staged a stale publish on purpose. The failure worth showing is the one only the running page reveals, where the source is right and the site is not. That lives in the publish step, so I started the builder's publish tool with `--stale-once visit.html`. The first publish leaves that page as it was and still reports success. The builder is not told.

One seeded rehearsal taught me something too. In it the builder searched the published copy in its own folder, saw the stale page, and published again before handing over, so no rejection happened. Its settings now refuse reads of `public/`: the builder sees the source, and only the verifier sees the running site. After that change the seeded fault gave a rejection in three rehearsals out of three ([`rehearsal-reject-seeded-2026-11-06.md`](evidence/rehearsal-reject-seeded-2026-11-06.md)). Three is a small number.

### The recorded run (seeded)

On 2026-11-07 I recorded one seeded run on a new team, `rh6`, with the client's message typed in the Discord client-desk channel instead of passed in from Console. Its limit first: **the client and the owner were the same Discord account.** It does not show that a separate client is kept out of proof-room. The full record is [`reject-run-2026-11-07.md`](evidence/reject-run-2026-11-07.md), and it is the run in the video.

From 21:47 to 21:52 IST:

1. The client message went to intake in client-desk. Intake logged one item and passed it to the dispatcher, which forwarded it to the builder in proof-room.
2. The builder edited both pages, published once, and said ready for verification.
3. The verifier fetched both pages. The home page passed. The block for the stale page, as posted (staged by the seeded fault):

```
ITEM: 1. Change the notice for whole cakes from 48 hours to 72 hours.
URL: http://127.0.0.1:4180/visit.html
FETCHED: 2026-11-07T16:18:35Z
STATUS: 200
FOUND: "Whole cakes need 48 hours' notice."
VERDICT: REJECT
REASON: The live visit page still says 48 hours in its "Ordering a whole cake" section. Your message said this page was updated and published, but what the site serves doesn't match.
```

   It ended with "This is REJECT 1 of 3 on this item."
4. The builder could not see the published copy, so it did not guess:

   > The visit page source already says "Whole cakes need 72 hours' notice." and did when I first published, so I couldn't find anything to fix there. I've published again. I can't see what the server sends, so please fetch both pages.

5. The verifier fetched again at 16:19:01Z, posted PASS for both pages, and asked me to approve.
6. I sent `@rh6-reporter Item 1 is approved.` in proof-room. The reporter posted one update in client-desk: the notice now reads 72 hours on the home page and the visit page, and both are live.

The client desk holds no message that mentions the rejection, the stale page or 48 hours after the client's own request. Unlike the rehearsals, that is checked on what the Discord channel showed, not only on the agents' own records.

One disclosure. At 21:49 a stray message, `h6-reporter`, appears in proof-room from my account. It is the broken start of a first approval attempt, cut when the screen-capture loop switched channel while I was typing. The reporter did not act on it. The rest of that attempt was left as an unsent draft in client-desk and deleted unsent.

## What broke along the way

Switch does not sandbox agents. Before any settings, I probed an agent that Console itself had started.

- A shell command counted the lines of a file in the home folder.
- `https://example.com` returned 200, by shell and by the web tool.
- The agent carried 321 tools from the signed-in account's connectors, including ones that publish to outside services.

Two fixes worked from a terminal and failed inside Console.

1. **Claude Code `sandbox.enabled`.** From a terminal: 9 of 9 denials. Under Console every Claude process stalled, including Console's own sign-in check, and the machine showed as offline.
2. **A Codex agent with a permission profile that denies the home folder.** It works in `codex sandbox` from a terminal. Under Console it was ignored: Console starts each thread with its own policy, and the home folder stayed readable.

So test the boundary from an agent Console started, not from a terminal.

What worked was no shell at all. The settings deny `Bash`, `WebFetch` and `WebSearch`, set `blockReadsOutsideWorkingDirectories` and `ENABLE_CLAUDEAI_MCP_SERVERS=false`, and deny the Switch tools that manage agents, rooms and templates. The builder and the verifier then get narrow tools of their own:

- `fetch_page` (verifier): GET only, 127.0.0.1 and one port, no redirects, a size cap.
- `replace_text` (builder): changes text only in an existing file directly inside the site's `src/`. The builder has no general tool for writing files.
- `publish` (builder): takes no arguments and runs only the site's own `publish.mjs`.

With the settings, a ten-step self-test on the client-facing agent failed all ten. The shell steps returned "No such tool available: Bash". The file read was refused, naming `permissions.blockReadsOutsideWorkingDirectories`. Connector tools went from 321 to 0, and Switch's own tools from 59 to 18.

I also asked the builder to aim `replace_text` at two files outside `src/` and one in the home folder. It made all three calls, and each came back "replace failed: file must be the name of a file in src/, with no folder". Nothing was written ([`bypass-2026-11-06.md`](evidence/bypass-2026-11-06.md)).

The rules are void if an agent runs in a different folder, and the connector tools come back under a different config directory. Hence step 10, every time.

## What Switch enforces and what is only convention

| Rule | Held by | Seen to hold |
|---|---|---|
| An agent outside a room cannot read or post in it | Switch | Yes for agents. People not tested |
| An `owner` agent does not act on another agent's message | Switch | Yes, with a visible refusal |
| A separate client cannot read proof-room or trigger the other agents | Switch | Pending |
| No shell, no web tool, no reads outside the working folder | settings | Yes |
| The builder writes only inside `src/`, through `replace_text` | settings and the tool's code | Yes: three calls aimed elsewhere were refused |
| The builder cannot read the published copy | settings | Yes, for a builder Console started |
| An agent cannot call the denied Switch management tools | settings | 18 of 59 tools remain. A call to a denied one is pending |
| The builder says "ready for verification", never done | convention | Both rehearsals and the recorded run (rejection seeded) |
| The client update mentions no rejection | convention | Recorded run, in the Discord channel. Client and owner were one account |
| The reporter counts only the verifier's blocks | convention | Partly: a fake PASS block in page text did not set it off. A block posted by another agent is pending |

Switch does not check what a block says. Only the owner checks the verifier's verdict.

The hostile-message tests in the repo ([`hostile-2026-11-06.md`](evidence/hostile-2026-11-06.md)) were refused or held, but I relayed those seven messages from my Console chat. None was typed by a separate client.

## What I would do next

- Record a run with a separate person, on a separate account, typing as the client.
- Record the pass scenario in the messaging app.
- Test whether `channel_private` closes the Discord channels.
- Have a separate client type the hostile messages, and try the remaining bypasses: a call to a denied Switch tool, a block posted by an agent other than the verifier.
- Run a scenario from a clean clone, and set it up on another machine.

Repo: <https://github.com/kishorer747/proof-room>
