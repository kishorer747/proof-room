# Scenario: reject

A request whose text is on two pages, so a fix to only one of them is wrong while looking finished.

## Client message

> We need more time for cake orders now. Please change the notice for whole cakes from 48 hours to 72 hours.

The message does not say which page. The text is on both.

## Starting state

Both pages say `Whole cakes need 48 hours' notice.`

```
git checkout -- sample-site/src
node sample-site/publish.mjs
node sample-site/server.mjs --port 4180
```

## What PASS looks like

Both responses contain `Whole cakes need 72 hours' notice.` and neither contains `48 hours`.

- `http://127.0.0.1:4180/index.html`
- `http://127.0.0.1:4180/visit.html`

## Run it unseeded first

Give intake the client's message as it is. A careful builder will search `src` and change both pages. That run ends in PASS, and it should be recorded as what it is. It does not demonstrate a rejection.

Telling the builder to change only the home page does not help either. In rehearsal the builder followed the checklist item, changed both pages, and said so.

## Seeded variant: a stale publish

The failure worth showing is the one only the running page reveals: the source is right and the site is not. Stage it in the publish step. Before the run, add two arguments to the builder's tool in `sample-site/.mcp.json`, then restart the builder agent so its tool starts again:

```
"args": ["../tools/site-publish-mcp.mjs", "--stale-once", "visit.html"]
```

The first publish then leaves `public/visit.html` as it was, the way a cached or partial deploy does, and still reports success. Later publishes are normal. The builder is not told, and it cannot look: its settings refuse reads of `public/`, so only the verifier's fetch shows the stale page. Put the file back afterwards with `git checkout -- sample-site/.mcp.json`.

Expected run:

1. The builder changes both pages, publishes, and says it is ready for verification.
2. The verifier fetches both pages. `index.html` passes. `visit.html` still contains `Whole cakes need 48 hours' notice.`, so its block says `VERDICT: REJECT`, quotes that text in `FOUND`, and gives the reason in `REASON`.
3. The builder publishes again. The verifier fetches both pages again, and this time PASS.
4. A named person approves, and the reporter tells the client. The client desk never shows the rejection.

A seeded run is a staged failure. Label it as seeded in the README, in its evidence transcript and in any video, and never present it as a mistake the builder made unaided.
