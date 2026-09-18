import {
  pipeline,
  allCapsHeadings,
  numberedParagraphs,
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
  // Numbered "4.18" paragraphs, same convention as Litvinenko/Leveson/Hillsborough.
  // Body-text continuations of a numbered paragraph sit around column 14-16
  // (a wider hanging indent than Litvinenko's), which the default of 5 read
  // as a quotation: every numbered paragraph's own wrapped text was being
  // split off and requoted. 10 clears normal body continuations while still
  // catching most genuine block quotes.
  //
  // The report quotes 1972 telegrams and operation orders verbatim in
  // capitals, and their wrapped lines pass the standalone all-caps heading
  // test one by one, tearing each quotation into bogus headings (p.275's
  // "I WAS OVER THERE..." telegram became four). The report's real structure
  // is its Chapter divisions, which are found without that test.
  passes: [runningFurniture(), quoteInset(10), numberedParagraphs(), allCapsHeadings(false)],
});
