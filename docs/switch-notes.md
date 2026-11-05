# Switch notes: what was observed running

Switch Console 0.40.1, Discord, 2026-11-05. Observed results, not expectations. Open items say so.

| Item | Result | Evidence |
|---|---|---|
| (a) Applying a template | Console wizard: Templates > Use, fill inputs, Create all. All or nothing. | A failed Create reported "Nothing was created" and left no agent folders |
| (b) Non-owner can address an `anyone` agent | NOT TESTED | Needs a second identity |
| (c) Non-member cannot read a room | Agent refused. People not tested | `403: {"detail":"Agent is not a member of this room"}` |
| (d) Agent outside a room cannot post there | Refused | `400: {"detail":"Agent is not a member of this room"}` from connect_to_room; post_message has no room argument |
| (e) Another agent's message does not trigger an `owner` agent | Holds, with a visible refusal | Reporter replied in thread: "You're not permitted to direct messages to me in this room" |
| (f) Room instructions and documents | Work, scoped by membership. `roles`, `references`, packages NOT TESTED | Carrier saw the markers of both rooms and the document; intake saw only its own room's |
| (g) auto_mode, Codex read-only via advanced_config | NOT TESTED | |
| (h) Test identity posting through the API | NOT TESTED | A throwaway webhook was planned; the session's permission check stopped it |
| (i) Agent posts a fixed format unchanged | Holds | Codex verifier's Discord post matched the requested line exactly, after a separate "Starting a session" message |
| (i) Agent can see who posted | NOT TESTED | |

## Things the docs did not make clear

- Saving a template does not validate it. A room document missing `description` and `instructions` saved, then the wizard refused it with "Could not load this template".
- With no messaging app connected, Create all is disabled.
- A room with no `bridge:` fails even with a messaging app connected: "it is on no messaging app". Declare a `bridge` param with `default: [$first]`.
- A template that sets no `channel_type` made Discord channels with 0 permission overwrites, so they are public. Whether `channel_private` closes them is NOT TESTED.
- A room bridged to Discord has no message box in Console, only "Open in Discord".
- An agent's mention appears in Discord as a role mention, one role per agent.

## Security findings

- Every agent sees 59 Switch tools, including create_agent, create_room, add_users_to_room and archive_room. Not yet tested which of them an `anyone` agent can really use.
- A non-member agent still lists rooms it is not in, by name. A room link exposes the linked room's name and description.
- A Claude agent has no sandbox here. From the intake agent: `wc -l ~/.zshrc` returned 519, and curl to example.com returned 200. So it can read the home folder and reach the internet.
