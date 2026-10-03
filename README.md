# The Report of the Bloody Sunday Inquiry — Volume I

HC 29-I, published 15 June 2010. Lord Saville's inquiry into the 1972
killings in Derry/Londonderry — the Principal Conclusions and Overall
Assessment (Chapters 1-5) and the Background to Bloody Sunday (Chapters 6-9),
the most-cited part of a ten-volume report that
runs to more than 5,000 pages in total. Only Volume I is ingested here; the
remaining volumes (detailed evidence and findings by topic) are a separate
scoping decision.

## Source

`archive/bloody-sunday-inquiry-vol1-hc29-i.pdf` — the official publication as
hosted on GOV.UK. Crown copyright, published under the Open Government
Licence v3.0. See `datapackage.json`.

`reference/raw/` — the Inquiry's own HTML edition of Volume I (the General
Introduction, the Glossary and Chapters 1-9 of its report website, kept by the
Wayback Machine), under the same licence (confirmed in `reference/manifest.json`).

## Build

`ingest.ts` declares how the report is turned into Markdown. Rebuild from the
site repo with `pnpm ingest run uk-saville-inquiry`.

The text and structure come from the HTML edition (SHA-256 of each page in
`ingest.ts` and `reference/manifest.json`); `inquiry-html.ts` says what its
markup means. The PDF supplies the printed page numbers and the fidelity check,
and is still read in full by every pass as the shadow ingest (`cleanEdition`
in `@rtm/ingest`, reportsthatmatter-ivg.2). `fidelity.md` lists every stretch
where the HTML and the PDF disagree.

## Processing notes

[`PROCESSING.md`](PROCESSING.md) records how this edition was made and where it still falls short. The site publishes it at `/reports/uk-saville-inquiry/processing`. The site copies it in with `pnpm ingest aggregate`.
