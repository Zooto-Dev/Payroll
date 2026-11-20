# Working rules for this repository

## Language of the admin panel

Every piece of text a user can see in `Inzo_HR_Admin.html` must be in
professional English: labels, buttons, placeholders, tooltips, table headers,
help text, FAQ entries, confirm and prompt dialogs, toast messages, error
messages, and any text the panel writes into records or printed documents.
No Hinglish and no Hindi written in Roman script. This applies to new text
and to any existing text touched by a change.

Code comments may stay in whatever language they are already in.

The kiosk (`attendance.html`) and the employee portal (`Inzo_ESS.html`) are
used by shop-floor staff and are not covered by this rule.

## Secrets and private data

- The Supabase URL and key are never written into page source. Pages fetch
  them from the Apps Script config endpoint at run time.
- `out/` is ignored by git. Reports, exports and backups written there contain
  employee data and must not be committed.
