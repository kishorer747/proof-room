# Clean clone, 2026-11-06

A fresh `git clone` of this repository at `d1f3a6d`, followed through README Setup as written.
Machine: the author's. Not a fresh machine.

## What a newcomer gets, and what the rehearsals ran on

The config directory the rehearsals used (`rh1`-`rh5`, `ex1`) was not the shipped file. Its deny
list had ten more entries, each naming one of the author's own account connectors
(`mcp__claude_ai_<name>`). A newcomer copying `docs/claude-settings.example.json` gets the
connector switch (`ENABLE_CLAUDEAI_MCP_SERVERS=false`) and none of those ten.

So the shipped file was measured on its own: copied over the config directory's `settings.json`
(the rehearsed copy kept as `settings.json.rehearsed-20261106`), and one Claude Code session
started from the clone's `verifier/` with `env -i` and only `HOME`, `USER`, `PATH` and
`CLAUDE_CONFIG_DIR` set.

| Probe, from the session's init event | Result |
|---|---|
| Tools | `Glob`, `Grep`, `Read`, `ToolSearch`, `mcp__page_fetch__fetch_page` |
| Account connector tools (`mcp__claude_ai_*`) | 0 |
| `Bash`, `WebFetch`, `WebSearch` | none |
| Tool servers | `page_fetch` connected |

This was a terminal session, not one Console started, so Switch's own tools are absent. It shows
the connector switch is enough without the ten account-specific denies. The config directory now
holds the shipped file, so later runs use what a newcomer gets.

## Other steps

| README step | Result in the clone |
|---|---|
| 1, nothing to install | No `package.json`; nothing installed |
| 5, publish | `node publish.mjs`: 3 files to `sample-site/public/` |
| Tests | `node --test "templates/*.test.mjs" "tools/*.test.mjs"`: 30 pass, 0 fail |

| 5, server | The earlier site process had exited; `node server.mjs --port 4180` started from the clone's `sample-site/`, title "Lantern Bakery" |
| 6, import | The clone's `templates/proof-room.template.yaml` imported through Import template, saved as "Proof room clean clone" (private) |
| 7, wizard | `team` = `cc1`, `repo_dir` = the clone. The preview listed every agent folder under the clone. Create all: 5 agents (`cc1-intake`, `-dispatcher`, `-builder`, `-verifier`, `-reporter`), "2 rooms created" |

## Not yet done from the clone

Step 8: asking `cc1-verifier` for its tool list from Console. Then one pass run on `cc1`.
