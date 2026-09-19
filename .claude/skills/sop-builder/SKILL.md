---
name: sop-builder
description: >
  Generate polished, branded SOP / policy documents as Word (.docx) files in a clean
  corporate "manual" house style — a cover page, a Contents table, one chapter per process
  (Purpose, Key points, Procedure step-by-step, Roles & responsibilities, Rules & conditions,
  Do & Don't), and an Authorisation sign-off (Prepared / Reviewed / Approved by). Use this
  whenever someone asks to create, build, format or update one or more Standard Operating
  Procedures, HR policies, or process documents as a downloadable Word file — for Zooto
  Fashion / Nexus HR or any other company. Triggers include: "SOP", "standard operating
  procedure", "SOP bana do", "banao SOP", "policy document", "process document", "make an
  SOP doc", "SOP manual", "iski SOP bana do".
---

# SOP Builder

Builds a branded multi-SOP Word document (`.docx`) from a simple JSON spec, using a fixed
house style (Georgia headings, Calibri body, thin-ruled tables, cover + contents + sign-off).

## When to use
- The user asks for an SOP, policy, or process document (one or many) as a Word file.
- The user wants the *same style* as an earlier SOP ("jaise OT/HR ki SOP banayi thi").
- The user wants to add a new SOP to, or restyle, an existing set.

## How it works
1. **Write a spec JSON** describing the document `meta` and a `sops` array (schema below).
   Base it on `example-spec.json` in this skill folder.
2. **Ensure the `docx` npm package is available.** If not: `npm i docx --no-save`
   (run it in a scratch/working dir; no other deps are needed). Node ≥ 16.
3. **Generate:** `node <skill-dir>/sop_gen.js <spec.json> <output.docx>`
   (output path optional — falls back to `meta.output`, then the title).
4. **Verify & deliver:** the script prints the byte count and SOP count. Send the `.docx`
   to the user (e.g. with SendUserFile). A visual preview needs LibreOffice/Word — if that
   isn't available, say so; the file is still a valid Word document.

## Spec schema (JSON)
```jsonc
{
  "meta": {
    "company": "Zooto Fashion",       // brand line (uppercased on the page)
    "system": "Nexus HR",             // optional second brand token
    "title": "HR Process SOP Manual",
    "subtitle": "…one line…",
    "docNo": "ZF/HR/SOP/MANUAL-01",
    "version": "1.0",
    "effectiveDate": "18 Sep 2026",
    "owner": "HR",
    "preparedBy": "PANKAJ KUMAR",     // shown in the sign-off table
    "reviewedByRole": "Head — Operations",
    "approvedBy": "CEO",
    "intro": "…italic note under the contents table…",
    "footerNote": "Confidential — internal use only.",
    "output": "SOP_Manual.docx"       // default output filename
  },
  "sops": [
    {
      "title": "Leave (CL / SL / EL)",
      "code": "ZF/HR/SOP/LEAVE-01",
      "sub": "one-line subtitle",
      "purpose": ["para 1", "para 2"],
      "defs":  [["Term","Meaning"], ...],          // → "Key points" table (optional)
      "steps": [["Step name","When / detail"], ...],// → numbered "Procedure" table
      "roles": [["Role","Responsibility"], ...],
      "rules": [["Situation","How it is treated"], ...],
      "dos":   ["DO — …", "DON’T — …"]             // optional bullets
    }
  ]
}
```
Any section left out (e.g. `defs`) is simply skipped and the chapter numbering adjusts.

## Content rules (important)
- **Describe the REAL process**, not an idealised one. Ask the user (or check the app/DB)
  how each step actually works before writing it. Accuracy over polish.
- Keep each cell short — a phrase, not a paragraph. Tables must stay readable.
- Use `preparedBy` exactly as the user gives it (e.g. `PANKAJ KUMAR`).
- Note who else has a role — e.g. **Security** (gate checks, kiosk punches, fuel/meter
  readings), **Accounts**, **CEO** — wherever they genuinely act in that process.
- For Zooto specifically: call the employee app the **Employee Portal** (never "ESS");
  there is **no sandwich-leave policy** (only the Off-Day Earning rule); OT is
  `min(approved, actual after 17:50)`, single rate; fuel/meter is a Security module, not an
  expense claim.

## Files in this skill
- `sop_gen.js` — the generator (self-contained; needs only `docx`).
- `example-spec.json` — a working two-SOP spec to copy and extend.

## Quick start
`SKILL_DIR` = the folder this SKILL.md lives in (e.g. `.claude/skills/sop-builder`
in a repo, or `~/.claude/skills/sop-builder` at user level).
```bash
cd <a writable dir>
npm i docx --no-save
cp "$SKILL_DIR/example-spec.json" spec.json   # then edit
node "$SKILL_DIR/sop_gen.js" spec.json My_SOP_Manual.docx
```
