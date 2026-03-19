# CC Posting Tool

A Google Apps Script WebApp that helps community admins review fan-submitted content and select posts for publishing to Facebook. Provides a moderation queue with approve/reject controls backed by Google Sheets.

![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=flat&logo=google&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-WebApp-blue)

---

## Overview

Fan submissions flow into a Google Sheet via a linked form. Admins use this tool to browse the queue, preview submissions, and mark them as approved or rejected. Approved posts are flagged for publishing.

---

## Features

- Moderation queue populated from Google Sheets
- Preview submission content before decision
- Approve / reject controls with status written back to sheet
- Filter view by submission status
- Client/server split architecture

---

## Tech Stack

| Layer    | Technology                      |
|----------|---------------------------------|
| Platform | Google Apps Script              |
| UI       | HTML5, CSS3, Vanilla JavaScript |
| Database | Google Sheets                   |
| Deploy   | clasp CLI                       |

---

## Project Structure

```
cc-posting-tool/
├── README.md
├── AGENT.md
├── .gitignore
└── src/
    ├── appsscript.json  # GAS manifest
    ├── client/          # Moderation queue UI, approve/reject controls
    └── server/          # doGet(), Sheets read/write, status updates
```

---

## Getting Started

### Prerequisites

- A Google account with Google Apps Script access
- [clasp](https://github.com/google/clasp) installed globally

```bash
npm install -g @google/clasp
clasp login
```

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/mohamedallam13/cc-posting-tool.git
   cd cc-posting-tool
   ```

2. Link to your Apps Script project:
   ```bash
   clasp create --type webapp --title "CC Posting Tool" --rootDir src
   ```

3. Push source files:
   ```bash
   clasp push
   ```

---

## Deployment

1. In the Apps Script editor, go to **Deploy > New deployment**
2. Select type: **Web app**
3. Restrict access to admin users only
4. Click **Deploy** and share the Web App URL with the moderation team

---

## Author

**Mohamed Allam** — [GitHub](https://github.com/mohamedallam13) · [Email](mailto:mohamedallam.tu@gmail.com)
