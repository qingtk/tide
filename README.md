# Tide — Markdown Editor (Neutralino)

Tide is a minimal desktop markdown editor scaffolded with Neutralinojs. It uses SimpleMDE for editing, Marked for preview rendering, and docsify for a documentation preview.


Quick start (Windows / PowerShell):

1. Install Neutralino CLI globally (requires Node/npm):

```powershell
npm i -g @neutralinojs/neu
```

2. From the project root run these commands to initialize and run the app:

```powershell
# generate runtime files (first time)
neu update

# run the app
neu run 
```

Notes:
- If you don't want to install Neutralino, you can open `resources/index.html` in a browser for a limited preview (some Neutralino-specific features like filesystem save won't work).
- Docsify preview is available at `resources/docs/index.html` and can be opened with the Docsify button in the app.

