import {
  pipeline,
  geometry,
  allCapsHeadings,
  numberedHeadings,
  numberedParagraphs,
  paragraphNotes,
  chapterContents,
  quoteInset,
  runningFurniture,
} from "@rtm/ingest";

/**
 * How this report is built. Owned by the report: every decision that shaped
 * its text is named here, and the passes it composes are library code, so a
 * fix to a shared pass reaches every report that calls it.
 */
export default pipeline({
  id: "uk-saville-inquiry",
  title: "The Report of the Bloody Sunday Inquiry, Volume I",
  authors: "The Rt Hon The Lord Saville of Newdigate (Chairman), William Hoyt, John Toohey",
  published_at: "15 June 2010",
  source_url: "https://assets.publishing.service.gov.uk/media/5a7b7c8ced915d131105f8f4/0029_i.pdf",
  repo: ".",
  volumes: [
    { path: "archive/bloody-sunday-inquiry-vol1-hc29-i.pdf", sha256: "f979d05c54729499bd54577d920e84c9d848f78231dfa91bdaee32f32ea597ea" },
  ],
  passes: [
    // Facing pages set the body at different columns (about 7 on the left
    // page, 16 on the right, drifting between pages), so one document margin
    // read every line of a right-hand page as a new paragraph and relabelled
    // the rest of it a quotation. Each page's margin is measured from its own
    // numbered paragraphs.
    geometry("per-page"),
    runningFurniture(),
    // Quotations sit four columns in from the body. The earlier quoteInset(10)
    // only compensated for the single margin above; with each page measured,
    // 5 puts nearly every quotation back into the prose (105 quotes, against
    // 579 at 4), and 3 adds run-ins for little gain.
    quoteInset(4),
    // "9.165"-style paragraphs, as in Litvinenko, Leveson and Hillsborough.
    numberedParagraphs(),
    // The report quotes 1972 telegrams and operation orders verbatim, in
    // capitals and with numbered and lettered items of their own. Read as
    // headings they tore each quotation apart (p.275's "I WAS OVER THERE..."
    // telegram became four headings) and dropped the items' numbers. The
    // report's structure is its Chapter divisions and contents, below.
    allCapsHeadings(false),
    numberedHeadings(false),
    // Notes sit beneath the paragraph they belong to, numbered from 1 again
    // under each one and set in two columns. Read as a page-foot block they
    // swallowed body paragraphs, and 392 references pointed at one note.
    paragraphNotes(),
    // Each chapter opens with its own contents, located by paragraph: its
    // entries name the subsection headings, set in plain sentence case, and
    // complete chapter titles cut at a line wrap.
    chapterContents(),
  ],
});
