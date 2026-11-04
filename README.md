# Proof Room

Proof Room is in progress for the Flip the Switch hackathon (November 4-7, 2026). It is meant to become a Switch workflow in which AI agents and a person check client-requested website changes before anyone calls them finished. This repository currently holds its folder layout, a saved copy of the hackathon rules, the Lantern Bakery sample site and two scenarios. The workflow itself does not exist yet, so nothing beyond the sample site should be taken as working.

## Run the sample site

`sample-site/public` is build output and is not in git, so publish once after cloning. Node is the only requirement.

```
cd sample-site
node publish.mjs
node server.mjs --port 4180
```

Editing `src` does not change the running page until `publish.mjs` runs again.
