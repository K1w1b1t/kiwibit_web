# Issue 90 — Rich text blog editor

Captured locally with fictional accounts and an isolated ephemeral PostgreSQL database. Desktop: 1440 × 1000; mobile: 390 × 844. Optional analytics consent was denied. Both Portuguese and English editors are present in the admin form.

Tiptap 3 was selected over Lexical because StarterKit covers the requested editing commands and its Next.js integration documents client initialization. HTML is sanitized with an explicit allowlist on write and public rendering. Legacy text is escaped when converted on editor save.

The browser verified real form creation and editing, persistence after reload, literal legacy tags, bold formatting, undo/redo, and link insertion/removal. The API E2E suite covers safe bilingual HTML persistence and partial updates; unit tests cover sanitization and member upload ownership.

Upload loading, network/storage failures, and successful upload responses were simulated at the HTTP boundary for deterministic screenshots. Real storage validation and success/error handling are covered by route tests; these captures do not claim a production bucket upload. The public image-unavailable state intentionally uses an absent fixture URL. Public rich-content screenshots use a local image response. The create-server-error state simulates a failed POST, followed by successful creation through the real API.

Inline image objects are retained when removed from content; automatic object garbage collection is outside this change. Cover cleanup keeps its existing behavior.

| Screen / state            | Desktop                                       | Mobile                                       |
| ------------------------- | --------------------------------------------- | -------------------------------------------- |
| article-en-legacy         | [View](article-en-legacy-desktop.png)         | [View](article-en-legacy-mobile.png)         |
| article-en-pt             | [View](article-en-pt-desktop.png)             | [View](article-en-pt-mobile.png)             |
| article-en-rich           | [View](article-en-rich-desktop.png)           | [View](article-en-rich-mobile.png)           |
| article-image-unavailable | [View](article-image-unavailable-desktop.png) | [View](article-image-unavailable-mobile.png) |
| article-pt-en             | [View](article-pt-en-desktop.png)             | [View](article-pt-en-mobile.png)             |
| article-pt-legacy         | [View](article-pt-legacy-desktop.png)         | [View](article-pt-legacy-mobile.png)         |
| article-pt-rich           | [View](article-pt-rich-desktop.png)           | [View](article-pt-rich-mobile.png)           |
| blog-en                   | [View](blog-en-desktop.png)                   | [View](blog-en-mobile.png)                   |
| blog-pt                   | [View](blog-pt-desktop.png)                   | [View](blog-pt-mobile.png)                   |
| create-empty              | [View](create-empty-desktop.png)              | [View](create-empty-mobile.png)              |
| create-filled             | [View](create-filled-desktop.png)             | [View](create-filled-mobile.png)             |
| create-server-error       | [View](create-server-error-desktop.png)       | [View](create-server-error-mobile.png)       |
| create-submitting         | [View](create-submitting-desktop.png)         | [View](create-submitting-mobile.png)         |
| create-success            | [View](create-success-desktop.png)            | [View](create-success-mobile.png)            |
| create-validation         | [View](create-validation-desktop.png)         | [View](create-validation-mobile.png)         |
| edit-draft                | [View](edit-draft-desktop.png)                | [View](edit-draft-mobile.png)                |
| edit-legacy               | [View](edit-legacy-desktop.png)               | [View](edit-legacy-mobile.png)               |
| edit-rich                 | [View](edit-rich-desktop.png)                 | [View](edit-rich-mobile.png)                 |
| edit-success              | [View](edit-success-desktop.png)              | [View](edit-success-mobile.png)              |
| emoji-no-results          | [View](emoji-no-results-desktop.png)          | [View](emoji-no-results-mobile.png)          |
| emoji-open                | [View](emoji-open-desktop.png)                | [View](emoji-open-mobile.png)                |
| format-bold-active        | [View](format-bold-active-desktop.png)        | [View](format-bold-active-mobile.png)        |
| format-reopened           | [View](format-reopened-desktop.png)           | [View](format-reopened-mobile.png)           |
| home-en                   | [View](home-en-desktop.png)                   | [View](home-en-mobile.png)                   |
| home-pt                   | [View](home-pt-desktop.png)                   | [View](home-pt-mobile.png)                   |
| image-empty               | [View](image-empty-desktop.png)               | [View](image-empty-mobile.png)               |
| image-inserted            | [View](image-inserted-desktop.png)            | [View](image-inserted-mobile.png)            |
| image-invalid-file        | [View](image-invalid-file-desktop.png)        | [View](image-invalid-file-mobile.png)        |
| image-invalid-url         | [View](image-invalid-url-desktop.png)         | [View](image-invalid-url-mobile.png)         |
| image-network-error       | [View](image-network-error-desktop.png)       | [View](image-network-error-mobile.png)       |
| image-storage-error       | [View](image-storage-error-desktop.png)       | [View](image-storage-error-mobile.png)       |
| image-upload-success      | [View](image-upload-success-desktop.png)      | [View](image-upload-success-mobile.png)      |
| image-uploading           | [View](image-uploading-desktop.png)           | [View](image-uploading-mobile.png)           |
| image-url                 | [View](image-url-desktop.png)                 | [View](image-url-mobile.png)                 |
| legacy-converted          | [View](legacy-converted-desktop.png)          | [View](legacy-converted-mobile.png)          |
| link-empty                | [View](link-empty-desktop.png)                | [View](link-empty-mobile.png)                |
| link-existing             | [View](link-existing-desktop.png)             | [View](link-existing-mobile.png)             |
| link-invalid              | [View](link-invalid-desktop.png)              | [View](link-invalid-mobile.png)              |
| link-removed              | [View](link-removed-desktop.png)              | [View](link-removed-mobile.png)              |
| link-valid                | [View](link-valid-desktop.png)                | [View](link-valid-mobile.png)                |
| member-own-draft          | [View](member-own-draft-desktop.png)          | [View](member-own-draft-mobile.png)          |
| member-save-success       | [View](member-save-success-desktop.png)       | [View](member-save-success-mobile.png)       |
