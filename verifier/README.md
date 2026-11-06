# The verifier's folder

The verifier agent runs here, and that is the point of the folder being almost empty. From
here it cannot read `sample-site/src`, so what it reports has to come from the running page.
`.mcp.json` gives it one tool, `fetch_page`, which can only GET the sample site on
`127.0.0.1:4180`. Change the port in `.mcp.json` if you serve the site somewhere else.
