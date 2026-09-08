# Client user manual

Give the client **Malhaar-Dance-Company-User-Manual.pdf**. It is a 32-page A4 guide
with 22 screenshot figures, clickable contents and alphabetical index, PDF bookmarks,
worked billing/refund examples, troubleshooting, and three appendices.

The matching HTML file is self-contained and can be viewed offline. The editable
content and print layout are in `build-manual.mjs`; screenshots are in `screenshots/`.
No credentials are included in the PDF or HTML. Website/support details were not
provided, so page 30 includes a handover worksheet and page 3 uses the supplied
studio website rather than a guessed production address.

## Rebuild

From the project root, run `node docs/user-manual/build-manual.mjs`.
Uses the existing Playwright Chromium installation; no external fonts or services.
The build checks missing images, broken internal links, and page/footer overlap
before exporting. `validation.json` contains the latest result. `preview/` contains
selected print-layout previews for visual review.

## Screenshot provenance

Captured from the running app on 08 September 2026 using existing demonstration
records. No forms were submitted, bills generated, payments recorded, or parent
messages sent. Billing, class-fee, payment, and notification screens show their
actual empty starting states. Configured email account values were concealed in
the browser before the Integrations screenshot. Workflow descriptions were checked
against the current pages/actions as well as the operating guide.

Additional captures of Import Students, Add Expense, and Add Income encountered
the app's error boundary while local UI edits were in progress. These error images
are excluded from the deliverables; the manual uses the successful list screens.
The relevant form instructions are source-verified, not submission-tested.

To capture again, supply an existing authorized account through `SEED_OWNER_EMAIL`
and `SEED_OWNER_PASSWORD`, and optionally `PLAYWRIGHT_BASE_URL` (default localhost:3000).
Run `node docs/user-manual/capture.mjs`. `--extra` reuses the inventory and captures
additional forms. The capture script does not create accounts or reset passwords.
Review new screenshots and the content before rebuilding, especially if studio
records or application workflows have changed.

## Validation

First edition: 32 PDF page objects, 68 internal link annotations, PDF outline and
tagged output present; no missing images, invalid anchors, or content/footer overlap.
Seven representative print pages were visually reviewed. This is documentation
validation, not a full app acceptance test or verification of live messaging.
