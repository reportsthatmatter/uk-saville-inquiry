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

## Build

`ingest.ts` declares how the report is turned into Markdown. Rebuild from the
site repo with `pnpm ingest run uk-saville-inquiry`.

## Processing notes

[`PROCESSING.md`](PROCESSING.md) records how this edition was read from the PDF and where it still falls short. The site publishes it at `/reports/uk-saville-inquiry/processing`. The site copies it in with `pnpm ingest aggregate`.
