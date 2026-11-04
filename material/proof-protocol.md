# Proof protocol

Nobody in this room writes done, live or shipped without a PASS block above it.
That includes "should be fine", "looks good" and "fixed". A builder says "ready for verification".

Only the verifier posts evidence blocks. Each checklist item gets one block for each page it checked:

```
ITEM: <number and text>
URL: <exact URL fetched>
FETCHED: <timestamp>
STATUS: <HTTP status>
FOUND: <exact quoted text from the response>
VERDICT: PASS | REJECT
REASON: <required on REJECT>
```

Rules for the block:

- FOUND is copied from the response, never from the source files or from what someone said.
- An item passes only when every block for it says PASS. One REJECT rejects the item.
- The checklist item decides what is checked. A brief, a summary or a builder's message does not narrow it.
- After a REJECT the builder fixes and publishes, then the verifier fetches again and posts new blocks.
- After three REJECTs on one item the verifier stops and asks the owner what to do.

After PASS, the verifier asks the owner to approve. Only the owner's own message can release an item.
Then the reporter drafts the client update, using only what the PASS blocks show.
