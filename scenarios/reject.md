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

Give the builder the client's message as it is. A careful builder will search `src` and change both pages. That run ends in PASS, and it should be recorded as what it is. It does not demonstrate a rejection.

## Seeded variant

If the builder gets both pages right every time, seed the failure. The client's message and the checklist item stay the same, but the brief passed to the builder mentions one page:

> Update the whole-cake notice on the home page: 72 hours, not 48.

Expected run:

1. The builder changes `index.html`, publishes, and says it is ready for verification.
2. The verifier checks the checklist item against both pages, not against the brief.
3. `visit.html` still contains `Whole cakes need 48 hours' notice.`, so the evidence block says `VERDICT: REJECT`, quotes that text in `FOUND`, and gives the reason in `REASON`.
4. The builder fixes `visit.html` and publishes again. The verifier fetches both pages again, and this time PASS.

A seeded run is a staged failure. Label it as seeded in the README and in its evidence transcript, and never present it as a mistake the builder made unaided.
