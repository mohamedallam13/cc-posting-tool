# AGENT.md — cc-posting-tool

## Purpose
A Google Apps Script WebApp that helps admins filter fan submissions and select posts for publishing to Facebook. Client/server split architecture.

## Structure
```
cc-posting-tool/
├── README.md
├── AGENT.md
├── .gitignore
└── src/
    ├── appsscript.json  ← GAS manifest
    ├── client/          ← HTML/CSS/JS frontend (submission review UI)
    └── server/          ← GAS server-side scripts (data access, status updates)
```

## Key Facts
- **Platform:** Google Apps Script WebApp
- **Data store:** Google Sheets (submission queue)
- **Purpose:** Admin moderation tool — review, approve/reject fan submissions for Facebook posting
- **Entry point:** `server/` contains the `doGet()` / `doPost()` functions

## Development Notes
- All source files live under `src/` — push with clasp from that directory
- No Node/npm at runtime; ES5-compatible GAS code only
