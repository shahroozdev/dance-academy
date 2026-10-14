# Content Portal user manual

Give the client [Malhaar-Content-Portal-User-Manual.pdf](Malhaar-Content-Portal-User-Manual.pdf). It is a printable, client-facing A4 guide for Content Owners and Content Editors. It covers access, using both portals at once, roles, publishing safeguards, all content areas, files, inquiries, owner settings, history, troubleshooting, and an operational checklist. It includes real list, create-form, upload-dialog, and user-access-dialog screens.

The matching HTML is self-contained and can be viewed offline. Its editable content and print layout are in `build-manual.mjs`. The guide uses read-only captures of the signed-in Content Owner portal; no content, settings, inquiries, or user access was changed while capturing them. No credentials are included.

## Rebuild

From the project root, run:

```powershell
node docs/content-portal-manual/build-manual.mjs
```

The build uses the existing Playwright Chromium installation, checks broken internal links, missing images, and body/footer overlap, and writes its result to `validation.json`. Representative page previews are written to `preview/`.

## Refresh the live screenshots

With the local app running and an authorized Content Owner configured in `.env`, run:

```powershell
node docs/content-portal-manual/capture.mjs
node docs/content-portal-manual/build-manual.mjs
```

The capture script only signs in and visits list/overview pages. It does not click or save anything, so it does not publish, upload, change settings, or mark inquiries as read.
