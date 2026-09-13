# BD Portal Change Log

| Date | Change Description | Author |
|---|---|---|
| 31 Dec 2025 | Initial Laravel backend setup with authentication (Sanctum) | Ken Ogunwande |
| 2 Jan 2026 | Dockerfile and Render deployment configuration | Ken Ogunwande |
| 6 Jan 2026 | Core Industry Flow domain tables (profiles, projects, tasks, etc.) | Ken Ogunwande |
| 9 Jan 2026 | Projects, tasks, and team management APIs and documentation | Asuku Onukaba |
| 10 Jan 2026 | In-app notifications for project/task assignments; password reset and project documents | Asuku Onukaba |
| 15 Jan 2026 | Project assignments and enhanced team management / deletion safeguards | Asuku Onukaba |
| 21 Jan 2026 | Editor role and RBAC; separate systemRole and accessLevel | Asuku Onukaba |
| 22 Jan 2026 | Production CORS for BD Portal (bdportal.emeraldcfze.com) | Asuku Onukaba |
| 27–29 Jan 2026 | Financial field integrity; margin_percentage; dashboard stats hardening | Asuku Onukaba / Emerald IT Dev |
| 29 Jan 2026 | Email notifications and mail configuration (Outlook / mail settings APIs) | Emerald IT Dev |
| 15 Feb 2026 | Document upload API via AWS S3 | Ken Ogunwande |
| 25–28 Feb 2026 | Microsoft 365 / Graph email path; CORS middleware and preflight fixes | Emerald IT Dev / Asuku Onukaba |
| 2 Mar 2026 | Email notifications migrated to Resend; BD Portal branding | Emerald IT Dev / Asuku Onukaba |
| 16–17 Mar 2026 | Project image support; inactive project status | Asuku Onukaba / Emerald IT Dev |
| 1–3 Apr 2026 | Task/document enhancements; support_needed and additional project response fields | Asuku Onukaba |
| 24 Apr 2026 | Products/sub-products model updates; deal probability adjustments | Asuku Onukaba |
| 25 Apr 2026 | **Frontend:** Deal probability dropdown sync fix in Edit Project — binds to form state, appears in API payload, and reflects after save | Frontend |
| 25 Apr 2026 | **Frontend:** Product and sub-product multi-select dropdowns with hardcoded catalog, tag chips, edit prefill, and array payloads | Frontend |
| 4 Aug 2026 | Project CSV export | Asuku Onukaba |
| 4 Aug 2026 | **Frontend:** Client-side CSV export with BOM, multiline-safe escaping, 10-row preview, and date-stamped filename | Frontend |
| 18 Aug 2026 | Category/vertical remapping Artisan command (projects:remap-categories) and PhpSpreadsheet | Asuku Onukaba |
| 27–31 Aug 2026 | Business vertical / sector migration; sector backfill command; project field refinements | Asuku Onukaba |
| 1–3 Sep 2026 | **Frontend:** Business vertical and sector fully decoupled in the UI — independent filters, forms, project detail, CSV export, and PDF reports | Frontend |
| 1–3 Sep 2026 | **Frontend:** Sidebar business vertical navigation updated; collapsible sidebar with always-visible toggle, favicon logo, and alignment fixes | Frontend |
| 1–3 Sep 2026 | **Frontend:** Report generator enhancements — Project Name, Description, and Channel Partner columns; wrapped text; NGN margin dash handling; PDF column overlap fixes | Frontend |
| 1–3 Sep 2026 | **Frontend:** Filter UX improvements — Select All / Deselect All, filter chip event bubbling fix, OEM and client filter serialization fixes, dropdown scroll and 100-option cap | Frontend |
| 1–3 Sep 2026 | **Frontend:** Security dependency updates — patched `xlsx` (SheetJS) and `jspdf` to resolve vulnerable dependency findings | Frontend |
| 1–3 Sep 2026 | **Frontend:** Update-available banner with `/version.json` polling and build-timestamp plugin | Frontend |
| 1–3 Sep 2026 | **Frontend:** OEM dropdown, products/subproducts filter dropdowns, edit form hydration fixes, and report field picker groundwork | Frontend |
| 13 Sep 2026 | **Frontend:** Favicon updated; badge limit and filter tag overflow handling; performance fixes for large dropdowns and memoized lookups | Frontend |

---

**Note:** Replace the `Frontend` author placeholder with your name or "Frontend Team" before sharing the document.
