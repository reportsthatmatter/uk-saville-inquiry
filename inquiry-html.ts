/**
 * Reads the Inquiry's own HTML edition of Volume I (reference/raw/, the
 * Bloody Sunday Inquiry's report website as the Wayback Machine kept it) into
 * the blocks the hybrid source mode serves (@rtm/ingest `cleanEdition`).
 *
 * What the markup means is a property of this source, so it lives here. One
 * file per part, in reading order: the General Introduction, the Glossary,
 * Chapters 1-5 (Principal Conclusions and Overall Assessment), Chapters 6-9
 * (The Background to Bloody Sunday). The page text sits in `<div class="story">`.
 *
 * Paragraph classes:
 *
 * - `ahead`, `ahead-now-b`: a part title (heading 2); `bhead-now-c`: a chapter
 *   title (3); `chead-now-d`: a subsection (4); `dhead-now-e`: a sub-subsection
 *   (5), or a glossary term (4); `ehead-now-f`: a glossary sub-term (5), or a
 *   figure title in a chapter, which the PDF sets wherever its page had room.
 * - `maintextnu*`: a numbered paragraph ("3.35 Within a few seconds ..."), the
 *   number is part of the text, as printed. `maintext*`, `maintextfullout`: an
 *   unnumbered paragraph (a paragraph holding only an image is a figure,
 *   which is not shown).
 * - `<table class="highlight">`: a box holding an extract (a transcript, a
 *   document, an earlier report): one quotation, a paragraph to each of its
 *   paragraphs. A box the HTML cuts at a page break, mid-sentence, is joined.
 *   `highlight*` paragraphs outside a box are quotations of their own.
 *   `maintext-1-2line` and `<li>`: list items. `maintext2indent` ("1. fundamental
 *   changes ...") are paragraphs, as printed.
 * - `<table class="x1-standard-box-table-text">`: a data table (the glossary's
 *   list of Army ranks).
 * - `x-contents-*`: contents entries ("Chapter 1: Introduction 45", "The arrest
 *   operation 3.14"); their column heads ("Page", "Paragraph", "Contents") are
 *   not text.
 * - `inparaendnotes*`: the notes of the paragraph above, numbered from 1 again
 *   under each paragraph, in the PDF's two columns, which the HTML sets as
 *   table cells: a note that runs from one column into the next continues in
 *   a paragraph with no number of its own, and the second column's notes are
 *   run into the first's rows, each opened by `<sup class="opt2footnotenumber">N`.
 *   Every note is paired with the marker of the same number among those the
 *   paragraphs above it hold, and labelled `N-G`, G counting the groups of
 *   notes, so a number repeated under another paragraph never opens the wrong
 *   note.
 */
import { htmlEvents, inlineMarkdown, inlineText, type Edition, type EditionBlock, type EditionNote, type InlinePiece } from "@rtm/ingest";

export type Diagnostics = string[];

/**
 * The HTML spaces a closing quotation mark off from the word before it ("a “Sovereign
 * Independent State ” which"), 300 times: the printed pages do not, and a closing mark
 * with a space before it has no other reading.
 */
const tidy = (text: string) => text.replace(/ +(?=\u201d(?:[\s.,;:)?!*\[]|$))/g, "");
const md = (pieces: InlinePiece[]) => tidy(inlineMarkdown(pieces));
const txt = (pieces: InlinePiece[]) => tidy(inlineText(pieces));

/** Notes whose marker the HTML dropped, linked at the end of the block above them (listed in PROCESSING.md). */
export const assumed: string[] = [];

type Pending = { block: EditionBlock; seq: number; n: number };
type Segment = { n: number; pieces: InlinePiece[] };

const SKIP_CONTENTS = /^(contents|page|paragraph|paragraphs)$/i;

function storyOf(html: string): string {
  const start = html.indexOf('<div class="story"');
  const end = html.indexOf('<div class="navigation-buttons"', start);
  if (start < 0 || end < 0) throw new Error("inquiry-html: page layout not recognised");
  return html.slice(start, end);
}

function relabel(block: EditionBlock, labels: Map<string, string>): void {
  const fix = (s: string) => s.replace(/\[\^(m\d+)\]/g, (whole, id: string) => (labels.has(id) ? `[^${labels.get(id)}]` : whole));
  if (block.kind === "paragraph" || block.kind === "quote" || block.kind === "heading" || block.kind === "contents") block.text = fix(block.text);
  else if (block.kind === "list") block.items = block.items.map(fix);
}

export function readInquiryHtml(files: Array<{ path: string; text: string }>, diagnostics: Diagnostics = []): Edition {
  assumed.length = 0;
  const blocks: EditionBlock[] = [];
  const notes: EditionNote[] = [];
  let seq = 0;
  let group = 0;
  let joinedQuotes = 0;

  /** Markers read since the last group of notes. */
  let pending: Pending[] = [];
  /** The notes read since the last block that is not a note. */
  let segments: Segment[] = [];
  let inGroup = false;
  let where = "";
  /** Index of the first block after the last group of notes. */
  let lastGroupEnd = 0;

  const closeGroup = () => {
    if (!inGroup) return;
    inGroup = false;
    group++;
    const byNumber = new Map<number, InlinePiece[]>();
    for (const seg of segments) {
      if (byNumber.has(seg.n)) {
        // the HTML numbers a third note "2" when its paragraph has three markers: the next marker with no note
        const next = pending.map((p) => p.n).filter((n) => n > seg.n && !byNumber.has(n) && !segments.some((s) => s.n === n)).sort((a, b) => a - b)[0];
        diagnostics.push(`${where}: group ${group}: note ${seg.n} appears twice${next ? `, the second read as note ${next}` : ""}`);
        if (next) byNumber.set(next, [...seg.pieces]);
        else byNumber.get(seg.n)!.push({ text: " " }, ...seg.pieces);
      } else byNumber.set(seg.n, [...seg.pieces]);
    }
    segments = [];
    const labels = new Map<string, string>();
    const used = new Set<number>();
    for (const p of pending) {
      if (byNumber.has(p.n) && !used.has(p.n)) {
        labels.set(`m${p.seq}`, `${p.n}-${group}`);
        used.add(p.n);
      } else diagnostics.push(`${where}: group ${group}: marker ${p.n} has no note`);
    }
    // A few markers are plain digits in the HTML ("our ruling of 11th October 2004,1 we express",
    // "the weapon used was a .45 semi-automatic pistol.4 The officers"). Only a note with no
    // marker of its own takes one: the first digit run of its number that follows a letter or
    // punctuation, in the paragraphs since the last notes, after the marker before it.
    const unmatched = [...byNumber.keys()].filter((n) => !used.has(n)).sort((a, b) => a - b);
    const blocksOf = [...new Set(pending.map((p) => p.block))];
    const seen = new Set(blocksOf);
    for (let k = blocks.length - 1; k >= 0 && blocksOf.length < 12; k--) {
      const b = blocks[k];
      if (seen.has(b) || b.kind === "heading" || b.kind === "contents") continue;
      if (b === (blocks[k + 1] ?? null)) continue;
      // only blocks after the previous group's notes
      if (k < lastGroupEnd) break;
      seen.add(b);
      blocksOf.push(b);
    }
    blocksOf.sort((a, b) => blocks.indexOf(a) - blocks.indexOf(b));
    for (const n of unmatched) {
      const re = new RegExp(`(?<=[\\p{L}.,;:?!"\u201d\u2019)\\]*])${n}(?![\\p{Ll}\\d])`, "u");
      let done = false;
      for (const block of blocksOf) {
        if (block.kind === "quote" || block.kind === "paragraph") {
          const m = re.exec(block.text);
          if (m && !/\d$/.test(block.text.slice(0, m.index))) {
            const id = `m${++seq}`;
            const glue = /[A-Z]/.test(block.text[m.index + String(n).length] ?? "") ? " " : "";
            block.text = block.text.slice(0, m.index) + `[^${id}]${glue}` + block.text.slice(m.index + String(n).length);
            labels.set(id, `${n}-${group}`);
            used.add(n);
            pending.push({ block, seq: 0, n });
            diagnostics.push(`${where}: group ${group}: marker ${n} recovered from plain digit: ...${block.text.slice(Math.max(0, m.index - 30), m.index + 25)}`);
            done = true;
            break;
          }
        }
      }
      if (!done) {
        // The HTML dropped the marker (8.92's note "1 G15.89" has none in the text). The notes
        // sit under the block above them, so the note is linked at the end of that block and
        // the guess is listed.
        let k = blocks.length - 1;
        while (k >= lastGroupEnd && (!(blocks[k].kind === "paragraph" || blocks[k].kind === "quote") || (blocks[k] as { float?: boolean }).float)) k--;
        const block = blocks[k] as { text: string };
        if (k >= 0 && block && "text" in block) {
          const id = `m${++seq}`;
          block.text = `${block.text}[^${id}]`;
          labels.set(id, `${n}-${group}`);
          used.add(n);
          pending.push({ block: blocks[k], seq: 0, n });
          assumed.push(`${where}: note ${n}-${group} has no marker in the HTML; linked at the end of: ${block.text.slice(0, 60)}...`);
        } else diagnostics.push(`${where}: group ${group}: note ${n} has no marker and no block to hold one`);
      }
    }
    for (const block of new Set(pending.map((p) => p.block))) relabel(block, labels);
    for (const n of [...byNumber.keys()].sort((a, b) => a - b)) {
      notes.push({ label: `${n}-${group}`, text: txt(byNumber.get(n)!) });
    }
    pending = [];
    lastGroupEnd = blocks.length;
  };

  const emit = (block: EditionBlock, markers: Array<{ seq: number; n: number }> = []) => {
    closeGroup();
    // The HTML sets a quotation that runs over a page break as one table per page, so a
    // sentence stops at the end of one quotation and goes on, in lower case, in the next.
    const last = blocks[blocks.length - 1];
    if (block.kind === "quote" && last?.kind === "quote" && /[\p{L}\p{N},]$|\p{L}-$/u.test(last.text.replace(/(\[\^[^\]]*\])+$/, "").replace(/[*_]+$/, "")) && /^[a-z]/.test(block.text)) {
      const hyphen = /\p{L}-$/u.test(last.text);
      last.text = hyphen ? last.text + block.text : `${last.text} ${block.text}`;
      for (const m of markers) pending.push({ block: last, ...m });
      joinedQuotes++;
      return;
    }
    blocks.push(block);
    for (const m of markers) pending.push({ block, ...m });
  };

  for (const file of files) {
    where = file.path.replace(/^.*\//, "");
    const part = /([\w-]+)\.html$/.exec(file.path)![1];
    const glossary = part === "glossary";
    const events = htmlEvents(storyOf(file.text));

    type Cur = { cls: string; pieces: InlinePiece[]; markers: Array<{ seq: number; n: number }>; tag: string };
    let cur: Cur | null = null;
    const spans: string[] = [];
    let sup: string | null = null;
    let supOwner = 0;
    let quoteTables = 0;
    const tables: boolean[] = [];
    let list: { items: string[]; markers: Array<{ seq: number; n: number }>; quoted: boolean } | null = null;
    let listCls = "";
    /** The paragraphs of the quotation box (table.highlight) being read: one quotation. */
    let box: { paras: string[]; markers: Array<{ seq: number; n: number }> } | null = null;
    const termHeadings = new Set<EditionBlock>();
    /** A data table (the glossary's list of ranks): rows of cells of pieces. */
    let data: { rows: InlinePiece[][][]; row: InlinePiece[][] | null; cell: InlinePiece[] | null } | null = null;
    let h1 = "";
    let inH1 = false;

    const closeList = () => {
      if (!list) return;
      const l = list;
      list = null;
      listCls = "";
      emit({ kind: "list", items: l.items }, l.markers);
    };

    const closeBox = () => {
      if (!box) return;
      const b = box;
      box = null;
      if (b.paras.length) emit({ kind: "quote", text: b.paras.join("\n\n") }, b.markers);
    };

    const hasText = (pieces: InlinePiece[]) => pieces.some((p) => "text" in p && p.text.trim());
    const plain = (pieces: InlinePiece[]) => inlineText(pieces.map((p) => ("marker" in p ? { text: "" } : p))).trim();

    const flush = () => {
      const c = cur;
      cur = null;
      if (!c) return;
      const cls = c.cls;

      // notes
      if (cls.startsWith("inparaendnotes")) {
        inGroup = true;
        const continuation = /manual-no|no-number|split-endnote/.test(cls);
        let first = c.pieces.findIndex((p) => "text" in p && p.text.trim());
        let open: Segment | null = null;
        if (!continuation && first >= 0) {
          const piece = c.pieces[first] as { text: string; em?: boolean };
          const m = /^\s*(\d{1,3})(?:\s+|$)/.exec(piece.text);
          if (m) {
            open = { n: Number(m[1]), pieces: [] };
            segments.push(open);
            c.pieces[first] = { ...piece, text: piece.text.slice(m[0].length) };
          }
        }
        if (!open) {
          open = segments[segments.length - 1] ?? null;
          if (!open) {
            diagnostics.push(`${where}: note text with no note to continue: ${plain(c.pieces).slice(0, 60)}`);
            return;
          }
          if (hasText(c.pieces)) open.pieces.push({ text: " " });
        }
        for (const piece of c.pieces) {
          if ("marker" in piece) {
            open = { n: Number(piece.marker.slice(1)), pieces: [] };
            segments.push(open);
          } else open.pieces.push(piece);
        }
        return;
      }

      if (!hasText(c.pieces) && !c.pieces.some((p) => "marker" in p)) return;
      const text = md(c.pieces);
      if (!text) return;

      // headings
      const level = HEAD[cls];
      if (level !== undefined) {
        closeList();
        const t = plain(c.pieces);
        if (cls === "dhead-now-e" && /^contents$/i.test(t)) return;
        if (cls === "ehead-now-f" && /^Figure \d/.test(t)) {
          emit({ kind: "paragraph", text: `**${t}**`, float: true });
          return;
        }
        const lv = glossary && cls === "dhead-now-e" ? 4 : glossary && cls === "ehead-now-f" ? 5 : level;
        const heading: EditionBlock = { kind: "heading", level: lv, text: t };
        if (glossary && (cls === "dhead-now-e" || cls === "ehead-now-f")) termHeadings.add(heading);
        emit(heading);
        return;
      }

      // contents
      if (cls.startsWith("x-contents") || (cls === "maintextfullout" && SKIP_CONTENTS.test(plain(c.pieces)))) {
        const t = plain(c.pieces);
        if (SKIP_CONTENTS.test(t)) return;
        const m = /^(.*?)\s+(\d{1,3}(?:\.\d{1,3})?)$/.exec(t);
        if (!m) {
          diagnostics.push(`${where}: contents entry with no number: ${t.slice(0, 60)}`);
          emit({ kind: "paragraph", text });
          return;
        }
        closeList();
        emit({ kind: "contents", text: m[1], page: m[2] });
        return;
      }

      // a quotation box is one quotation, a paragraph to each of its paragraphs
      if (quoteTables > 0) {
        closeList();
        (box ??= { paras: [], markers: [] }).paras.push(text);
        box.markers.push(...c.markers);
        return;
      }

      // list items
      const isItem = c.tag === "li" || cls === "maintext-1-2line";
      if (isItem) {
        const item = cls === "maintext-1-2line" ? text.replace(/^•\s*/, "") : text;
        if (!list || listCls !== cls || list.quoted !== quoteTables > 0) {
          closeList();
          list = { items: [], markers: [], quoted: quoteTables > 0 };
          listCls = cls;
        }
        list.items.push(item);
        list.markers.push(...c.markers);
        return;
      }
      closeList();

      const quote = quoteTables > 0 || cls.startsWith("highlight");
      emit({ kind: quote ? "quote" : "paragraph", text }, c.markers);
    };

    const add = (piece: InlinePiece) => {
      // "<span class="styleoff">2</span>" inside a note: the number of the next note
      if (cur?.cls.startsWith("inparaendnotes") && "text" in piece && spans[spans.length - 1] === "styleoff" && /^\s*\d{1,3}\s*$/.test(piece.text)) {
        cur.pieces.push({ marker: `n${piece.text.trim()}` });
        return;
      }
      if (inH1) {
        if ("text" in piece) h1 += piece.text;
        return;
      }
      if (data) {
        data.cell?.push(piece);
        return;
      }
      if (!cur) return;
      if ("text" in piece) {
        const last = cur.pieces[cur.pieces.length - 1];
        // a marker is closed up to the word before it; the next sentence needs its space
        if (last && "marker" in last && /^[^\s.,;:)?!'’”"]/.test(piece.text) && !cur.cls.startsWith("inparaendnotes")) {
          cur.pieces.push({ text: " " });
        }
      }
      cur.pieces.push(piece);
    };

    const em = () => spans.some((c) => c === "italic" || c === "bolditalic" || c === "bold-italic" || c === "underlineitalic");
    const strong = () => spans.some((c) => c === "bold" || c === "bolditalic" || c === "bold-italic");

    const finishSup = () => {
      const label = (sup ?? "").trim();
      sup = null;
      if (!cur) return;
      if (/^\d{1,3}$/.test(label)) {
        if (cur.cls.startsWith("inparaendnotes")) cur.pieces.push({ marker: `n${label}` });
        else {
          const id = ++seq;
          cur.markers.push({ seq: id, n: Number(label) });
          add({ marker: `m${id}` });
        }
      } else if (label) add({ text: label, em: em() });
    };

    for (const e of events) {
      if (e.kind === "text") {
        if (sup !== null) {
          sup += e.text;
          continue;
        }
        add({ text: e.text, em: em(), strong: strong() });
        continue;
      }
      const tag = e.tag;
      if (e.kind === "start") {
        switch (tag) {
          case "h1":
            inH1 = true;
            h1 = "";
            break;
          case "p":
          case "li":
            if (data) {
              data.cell?.push({ text: " " });
              break;
            }
            flush();
            cur = { cls: e.attrs.class ?? (tag === "li" ? "li" : "p"), pieces: [], markers: [], tag };
            break;
          case "table":
            flush();
            if (/^x1-standard/.test(e.attrs.class ?? "")) {
              tables.push(false);
              data = { rows: [], row: null, cell: null };
              break;
            }
            tables.push(/^highlight/.test(e.attrs.class ?? ""));
            if (tables[tables.length - 1]) quoteTables++;
            break;
          case "tr":
            if (data) {
              data.row = [];
              data.rows.push(data.row);
            }
            break;
          case "td":
          case "th":
            if (data) {
              data.cell = [];
              data.row?.push(data.cell);
              for (let k = 1; k < Number(e.attrs.colspan ?? "1"); k++) data.row?.push([]);
              break;
            }
            flush();
            break;
          case "ul":
          case "ol":
            flush();
            closeList();
            break;
          case "span":
            spans.push(e.attrs.class ?? "");
            // the second column's note numbers: with or without a <sup> around them
            if (e.attrs.class === "opt2footnotenumber" && sup === null) {
              sup = "";
              supOwner = spans.length;
            }
            break;
          case "br":
            add({ text: " " });
            break;
          case "sup":
            sup = "";
            break;
          case "em":
          case "i":
            spans.push("italic");
            break;
          case "strong":
          case "b":
            spans.push("bold");
            break;
        }
        continue;
      }
      switch (tag) {
        case "h1":
          inH1 = false;
          // Chapter 6's page is headed "Section: The Background to Bloody Sunday"
          if (/^Section:/i.test(h1.trim())) emit({ kind: "heading", level: 2, text: h1.trim().replace(/^Section:\s*/i, "") });
          break;
        case "p":
        case "li":
          flush();
          break;
        case "table":
          flush();
          closeList();
          if (data) {
            const rows = data.rows.map((row) => row.map((cell) => md(cell))).filter((row) => row.some(Boolean));
            data = null;
            tables.pop();
            if (rows.length) emit({ kind: "table", rows, header: true });
            break;
          }
          if (tables.pop()) {
            closeBox();
            quoteTables--;
          }
          break;
        case "td":
        case "th":
          if (data) {
            data.cell = null;
            break;
          }
          flush();
          break;
        case "ul":
        case "ol":
          flush();
          closeList();
          break;
        case "span":
          if (supOwner && supOwner === spans.length) {
            supOwner = 0;
            finishSup();
          }
          spans.pop();
          break;
        case "em":
        case "i":
        case "strong":
        case "b":
          spans.pop();
          break;
        case "sup":
          finishSup();
          break;
      }
    }
    flush();
    closeBox();
    closeList();
    closeGroup();
    if (glossary) {
      // The printed glossary sets each term in bold at the head of its entry; the HTML makes the
      // term a heading. A term followed by its entry is the entry's run-in head, as printed
      // (a term followed by another heading, "Army units", stays a heading).
      const merge: number[] = [];
      for (let k = 0; k + 1 < blocks.length; k++) {
        const head = blocks[k];
        const next = blocks[k + 1];
        if (head.kind === "heading" && termHeadings.has(head) && next.kind === "paragraph" && !next.float) merge.push(k);
      }
      for (const k of merge.reverse()) {
        const head = blocks[k] as { text: string };
        (blocks[k + 1] as { text: string }).text = `**${head.text}** ${(blocks[k + 1] as { text: string }).text}`;
        blocks.splice(k, 1);
      }
      lastGroupEnd = blocks.length;
    }
    // tables of quotations close with the page
    quoteTables = 0;
    if (pending.length) {
      diagnostics.push(`${where}: ${pending.length} markers at the end of the page with no notes`);
      pending = [];
    }
  }
  diagnostics.push(`${joinedQuotes} quotations joined across a page break`);
  return { blocks, notes };
}

const HEAD: Record<string, number> = {
  ahead: 2,
  "ahead-now-b": 2,
  "bhead-now-c": 3,
  "chead-now-d": 4,
  "dhead-now-e": 5,
  "ehead-now-f": 6,
};
