# Sources

This directory contains raw source material for the wiki. It is **immutable** — Claude never modifies files here.

You add sources; Claude reads them and integrates their knowledge into `wiki/`.

## Subdirectories

- **`articles/`** — Web articles saved as markdown. Filename convention: `YYYY-MM-DD-title-slug.md`
- **`pdfs/`** — PDF files or extracted text dumps from PDFs. Filename convention: `author-year-title-slug.md` (or `.pdf`)
- **`personal/`** — Your own notes, journal entries, or brain dumps flagged for ingestion into the wiki.

## How to add a source

1. Drop the file into the appropriate subdirectory, or paste its text directly in the chat.
2. Tell Claude: "Ingest [filename or URL]."
3. Claude will run the ingest workflow defined in `CLAUDE.md`.

## Alternatively

You can provide a URL directly in chat without saving a file first. Claude will fetch the content and ingest it, then optionally save a local copy here.
