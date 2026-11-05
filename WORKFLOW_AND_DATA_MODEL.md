# Workflow Design and Sample Data Model

## Proposed workflow stages

1. **Intake:** receive new images from the user or an authorised monitored folder.
2. **Extraction:** identify all vocabulary and phrases; include confidence/uncertainty notes for blurry source text.
3. **Enrichment:** definition, part of speech, example sentence and optional note.
4. **Deduplication:** normalise case/whitespace; resolve homonyms manually if needed.
5. **Library update:** create or update records in an authorised destination (e.g. Notion).
6. **Acknowledgement:** report counts and real links after successful updates.
7. **Revision:** prepare a separate weekly email of newly added entries.

## Suggested Notion properties

| Property | Type | Notes |
|---|---|---|
| Word / Phrase | Title | Canonical text |
| Normalised Key | Text | Used for duplicate detection |
| Part of Speech | Select | e.g. noun, adjective, phrase |
| Meaning | Text | English definition |
| Example Sentence | Text | Learner-friendly usage |
| Category | Multi-select | Work, general, BA etc. |
| Source | Text / File | Source filename only if authorised |
| Date Added | Date | For weekly digest |
| Review Status | Select | New, Reviewing, Revised |
| Notion Page URL | URL | Assigned only after successful creation |

## External system boundaries

- **ChatGPT Project:** user-facing instructions and assisted extraction; not the same as a deployable code repository.
- **Google Drive:** possible input folder; a real monitor needs installed authorisation and scheduling.
- **Notion:** intended structured destination; actual writes need confirmed connector results.
- **Gmail:** intended notifications and a Friday revision digest; the public website cannot send email.

## Exception scenarios

- Low-quality images: mark uncertain terms, ask for clarification.
- Several terms in one image: extract each independently.
- Duplicate term: skip or amend an existing record, depending on defined rules.
- Destination error: retain unsaved results for review and do not claim success.
- Missing Notion URL: omit link rather than fabricating one.
- Scheduled check finds no images: do not send a misleading success notification.

## Prototype limitations

The public `index.html` performs no OCR and does not access external systems. It uses canned sample transcripts and simulated, local-only actions. Clearing browser storage clears the demo vocabulary library.
