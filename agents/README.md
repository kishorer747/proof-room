# Folders for the agents that only talk

Intake, the dispatcher and the reporter each run in a folder here. The folders hold nothing but a
settings file, and that is the point: these agents read and post in rooms, and they have no reason
to run a command, fetch a page or write a file. `.claude/settings.json` in each folder refuses those
tools, and the tools that create or change agents, rooms and templates.

The builder runs in `sample-site/` and the verifier in `verifier/`, each with its own settings file
and one tool of its own.
