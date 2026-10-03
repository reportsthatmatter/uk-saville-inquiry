import { readInquiryHtml } from "./inquiry-html.ts";
import {
  cleanEdition,
  layoutPageJoins,
  quoteListRunOns,
  pipeline,
  pageBreakContinuations,
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
    // The text and structure come from the Inquiry's own HTML edition of
    // Volume I (reference/raw/, the report website as the Wayback Machine kept
    // it; see inquiry-html.ts for what its markup means). The PDF is still read
    // by every pass below, as the shadow ingest: its page markers say which
    // page carries which printed number, each block is stamped with the page
    // its first word aligns to, and every stretch where the HTML and the PDF
    // disagree is listed in fidelity.md (reportsthatmatter-ivg.2). The passes
    // below are the PDF reading, unchanged: what it reads is the shadow.
    cleanEdition({
      dir: import.meta.dirname,
      encoding: "latin1",
      // Each paragraph's notes are printed under it, so the PDF shadow lifts them out of the page
      // text: the edition's notes are aligned to those, not to the body.
      notes: "page-foot",
      files: [
        { path: "reference/raw/general-introduction.html", sha256: "a4b9217bdc15ebac69ce234398af4bc2cb6c5947ce4ff76fc57c557e72062536" },
        { path: "reference/raw/glossary.html", sha256: "a4e93cb381b4c3eb3a80240b510c9e4239f37825a5301818cd35d5fbfff586f5" },
        { path: "reference/raw/chapter001.html", sha256: "da01f0b8c37833b06da64de8024e8df0f5ddc58d6503f6d57ebdf763d6638380" },
        { path: "reference/raw/chapter002.html", sha256: "5659fd9f34c0c09e2815cd2bc80f098d02054b3926ba8064e32b933b114b17a0" },
        { path: "reference/raw/chapter003.html", sha256: "22ab3e931eb97a510e67d76f086dd3ce42cc5865c0aee400460db1b6c670e7ba" },
        { path: "reference/raw/chapter004.html", sha256: "6ef18840024ce249043207bdd308903c57d4385016263aa13a8847acab24af2c" },
        { path: "reference/raw/chapter005.html", sha256: "7b39767d547d38b8af2a9c080b842df73d474424d718298917cd964ef50e21a2" },
        { path: "reference/raw/chapter006.html", sha256: "27cd14ac1d05f4c412367a6f1af11c1f08f944dbbfa9c21ef15df5fd5e53a72c" },
        { path: "reference/raw/chapter007.html", sha256: "1f36798c77b4106fa68634a26e78f052b4f6c6d3b70983ab62ec86f82568203f" },
        { path: "reference/raw/chapter008.html", sha256: "91907ee0f338c534fc44755d62cd78420f65e7edc3ffe45fd2ba7750ac8c37c8" },
        { path: "reference/raw/chapter009.html", sha256: "40e8cd0ce53afdb065e98ce8d8d3bed641d85eb06436b223bb27c725ae000f89" },
      ],
      read: (files) => readInquiryHtml(files),
    }),
    // A paragraph run over a page break that opens on a capital, a digit or a
    // quotation mark (or follows a full stop on a justified page) joins when the
    // layout says it runs on: no first-line indent, same face (reportsthatmatter-38s.10).
    layoutPageJoins(),
    // A quotation running over a page arrives as two (reportsthatmatter-38s.9).
    quoteListRunOns(),
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
    // Two witness statements stopped mid-sentence at a page foot and resumed
    // as block quotations.
    pageBreakContinuations(),
  ],
});
