# Scenario: pass

A plain request that should go through on the first try.

## Client message

> Please change our opening hours to 8 to 6.

## Starting state

Both pages say `Open every day, 7 am to 4 pm`.

```
git checkout -- sample-site/src
node sample-site/publish.mjs
node sample-site/server.mjs --port 4180
```

## What should happen

1. Intake turns the message into one numbered checklist item.
2. The builder edits `sample-site/src`, runs `publish.mjs`, and says it is ready for verification.
3. The verifier fetches both pages from the running server and posts an evidence block for each.
4. A named person approves.
5. The reporter drafts the client update, quoting only the evidence blocks.

## What PASS looks like

Both responses contain this exact text:

```
Open every day, 8 am to 6 pm
```

- `http://127.0.0.1:4180/index.html`
- `http://127.0.0.1:4180/visit.html`

## What makes this REJECT instead

- `src` was edited but `publish.mjs` was not run, so the page still shows the old hours.
- Only one of the two pages changed.

Nothing but the hours should differ afterwards. Check with `git diff sample-site/src`.
