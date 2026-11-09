# Bilingual blog screenshots

Captured locally with fictional posts and an isolated ephemeral database. Desktop: 1440 × 1000; mobile: 390 × 844. Optional analytics consent was declined.

| Scenario            | Portuguese                                           | English                                                 |
| ------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| Home blog section   | [PT](home-pt.png)                                    | [EN](home-en.png)                                       |
| Blog listing        | [PT](blog-pt.png)                                    | [EN](blog-en.png)                                       |
| Translated article  | [PT](detail-pt.png)                                  | [EN](detail-en.png)                                     |
| Missing translation | [English article on PT route](fallback-en-to-pt.png) | [Portuguese article on EN route](fallback-pt-to-en.png) |

- [Create form](admin-create.png)
- [Edit form](admin-edit.png)
- [Mobile edit form](mobile-admin.png)
- [Mobile English article](mobile-detail.png)

The fixture includes bilingual, Portuguese-only and English-only articles, with and without covers. The browser verification also created an English-only draft through the real form and checked the HTTP 201 response. Alt text is covered through resolver tests rather than screenshots.
