#!/usr/bin/env node
/*
 * sop_gen.js — Build a branded SOP / policy manual as a Word (.docx) file.
 *
 * Usage:
 *   node sop_gen.js <spec.json> [output.docx]
 *
 * Requires the "docx" npm package:  npm i docx    (or: npm i docx --no-save)
 *
 * The <spec.json> shape is documented in SKILL.md and example-spec.json.
 */
const fs = require('fs');
const path = require('path');

let docx;
try { docx = require('docx'); }
catch (e) {
  console.error('\n[sop-builder] The "docx" package is not installed.\n' +
    'Install it first, e.g.:  npm i docx --no-save   (or  npm i docx)\n');
  process.exit(1);
}
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, LevelFormat, PageBreak
} = docx;

// ---- house-style palette ----
const INK = '1A2130', ACCENT = '1F5F8B', MUTED = '59616F', LINE = 'C7C2B5', HEAD = 'EFEDE7';
const TABLE_W = 9020;

function T(text, o = {}) { return new TextRun({ text: String(text == null ? '' : text), font: 'Calibri', size: o.size || 20, bold: o.bold, italics: o.italics, color: o.color || INK }); }
function P(runs, o = {}) { return new Paragraph({ spacing: { after: o.after == null ? 120 : o.after, before: o.before || 0, line: 276 }, alignment: o.align, children: Array.isArray(runs) ? runs : [runs] }); }
function H2(text, color) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 }, children: [new TextRun({ text, font: 'Georgia', size: 24, bold: true, color: color || INK })] }); }
function eyebrow(text) { return new Paragraph({ spacing: { before: 240, after: 40 }, children: [new TextRun({ text: String(text).toUpperCase(), font: 'Consolas', size: 17, bold: true, color: ACCENT, characterSpacing: 30 })] }); }
function bullet(text) { return new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 60, line: 264 }, children: [T(text)] }); }

function cell(children, o = {}) {
  return new TableCell({
    width: { size: o.w, type: WidthType.DXA },
    shading: o.head ? { type: ShadingType.CLEAR, fill: HEAD, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    children: (Array.isArray(children) ? children : [children]).map(c =>
      typeof c === 'string'
        ? new Paragraph({ spacing: { after: 0, line: 252 }, children: [new TextRun({ text: c, font: 'Calibri', size: 18, bold: o.head, color: o.head ? MUTED : INK })] })
        : c)
  });
}
function table(widths, rows) {
  return new Table({
    width: { size: TABLE_W, type: WidthType.DXA }, columnWidths: widths,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: LINE }, bottom: { style: BorderStyle.SINGLE, size: 2, color: LINE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: LINE }, insideVertical: { style: BorderStyle.NONE }
    },
    rows: rows.map((r, i) => new TableRow({ tableHeader: i === 0, children: r.map(c => cell(c.t, { w: c.w, head: i === 0 })) }))
  });
}
function tRow(cols, widths) { return cols.map((t, i) => ({ t, w: widths[i] })); }
function mkTable(widths, header, dataRows) { return table(widths, [tRow(header, widths), ...dataRows.map(r => tRow(r, widths))]); }

const numbering = { config: [{ reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 220 } } } }] }] };

function coverAndToc(meta, sops) {
  const brand = (meta.company || 'COMPANY').toUpperCase() + (meta.system ? ' · ' + meta.system.toUpperCase() : '');
  const docLine = `Doc ${meta.docNo || 'SOP/MANUAL-01'}   ·   Version ${meta.version || '1.0'}   ·   Effective ${meta.effectiveDate || ''}   ·   Owner: ${meta.owner || 'HR'}   ·   Approved by: ${meta.approvedBy || 'Management'}`;
  return [
    new Paragraph({ spacing: { before: 1200, after: 20 }, children: [new TextRun({ text: brand, font: 'Consolas', size: 20, bold: true, color: ACCENT, characterSpacing: 40 })] }),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: meta.title || 'SOP Manual', font: 'Georgia', size: 52, bold: true, color: INK })] }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: meta.subtitle || '', font: 'Calibri', size: 22, color: MUTED })] }),
    new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: INK, space: 6 } }, spacing: { after: 200 }, children: [new TextRun({ text: docLine, font: 'Consolas', size: 16, color: MUTED })] }),
    eyebrow('Contents'), H2('SOPs in this manual'),
    mkTable([620, 5000, 3400], ['#', 'Process', 'Doc No.'], sops.map((s, i) => [String(i + 1), s.title || '', s.code || ''])),
    new Paragraph({ spacing: { before: 200 }, children: [T(meta.intro || 'Each SOP describes the real, official process — who raises the request, who approves it, what the system does, and its effect. This manual replaces all earlier informal practices.', { color: MUTED, size: 18, italics: true })] }),
  ];
}

function chapter(meta, s, idx) {
  const brand = (meta.company || 'COMPANY').toUpperCase() + (meta.system ? ' · ' + meta.system.toUpperCase() : '');
  const out = [];
  out.push(new Paragraph({ children: [new PageBreak()] }));
  out.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: `SOP ${idx + 1} · ${brand}`, font: 'Consolas', size: 17, bold: true, color: ACCENT, characterSpacing: 30 })] }));
  out.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: s.title || '', font: 'Georgia', size: 34, bold: true, color: INK })] }));
  if (s.sub) out.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: s.sub, font: 'Calibri', size: 20, color: MUTED })] }));
  out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 14, color: INK, space: 6 } }, spacing: { after: 140 }, children: [new TextRun({ text: `Doc ${s.code || ''}   ·   Version ${meta.version || '1.0'}   ·   Effective ${meta.effectiveDate || ''}   ·   Owner: ${meta.owner || 'HR'}`, font: 'Consolas', size: 15, color: MUTED })] }));

  let n = 0;
  const hasDefs = s.defs && s.defs.length;
  out.push(eyebrow(`${++n} · Purpose`));
  (s.purpose || []).forEach(p => out.push(P(T(p))));

  if (hasDefs) { out.push(eyebrow(`${++n} · Key points`)); out.push(mkTable([2400, 6620], ['Item', 'Detail'], s.defs)); }
  if (s.steps && s.steps.length) { out.push(eyebrow(`${++n} · Procedure — step by step`)); out.push(mkTable([620, 3300, 5100], ['#', 'Step', 'When / detail'], s.steps.map((r, i) => [String(i + 1), r[0], r[1]]))); }
  if (s.roles && s.roles.length) { out.push(eyebrow(`${++n} · Roles & responsibilities`)); out.push(mkTable([2600, 6420], ['Role', 'Responsibility'], s.roles)); }
  if (s.rules && s.rules.length) { out.push(eyebrow(`${++n} · Rules & conditions`)); out.push(mkTable([3200, 5820], ['Situation', 'How it is treated'], s.rules)); }
  if (s.dos && s.dos.length) { out.push(eyebrow(`${++n} · Do & Don’t`)); s.dos.forEach(d => out.push(bullet(d))); }
  return out;
}

function signoff(meta) {
  return [
    new Paragraph({ children: [new PageBreak()] }),
    eyebrow('Authorisation'), H2('Sign-off'),
    mkTable([3007, 3007, 3006], ['Prepared by', 'Reviewed by', 'Approved by'],
      [[meta.preparedBy || '', meta.reviewedByRole || 'Head — Operations', meta.approvedBy || 'CEO']]),
    new Paragraph({ spacing: { before: 200 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 6 } }, children: [new TextRun({ text: meta.footerNote || 'Confidential — internal use only. HR updates this document when the process changes.', font: 'Calibri', size: 16, italics: true, color: MUTED })] }),
  ];
}

async function main() {
  const specPath = process.argv[2];
  if (!specPath) { console.error('Usage: node sop_gen.js <spec.json> [output.docx]'); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const meta = spec.meta || spec;               // allow flat or {meta, sops}
  const sops = spec.sops || [];
  if (!sops.length) { console.error('[sop-builder] spec has no "sops" array.'); process.exit(1); }

  const out = process.argv[3] || (meta.output || (spec.output) ||
    ((meta.title || 'SOP_Manual').replace(/[^A-Za-z0-9]+/g, '_') + '.docx'));

  const children = [
    ...coverAndToc(meta, sops),
    ...sops.flatMap((s, i) => chapter(meta, s, i)),
    ...signoff(meta),
  ];
  const doc = new Document({
    numbering, creator: (meta.company || 'SOP') + ' — SOP Builder',
    styles: { default: { document: { run: { font: 'Calibri', size: 20, color: INK } } } },
    sections: [{ properties: { page: { margin: { top: 1200, bottom: 1200, left: 1440, right: 1440 } } }, children }]
  });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(out, buf);
  console.log('[sop-builder] wrote', path.resolve(out), buf.length, 'bytes,', sops.length, 'SOP(s)');
}
main().catch(e => { console.error(e); process.exit(1); });
