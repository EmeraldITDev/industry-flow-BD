# Backend: task attachments (frontend contract)

The React app expects the following so **Add** / **Edit task** uploads and **task cards** stay in sync.

## Endpoints

| Method | Path | Purpose |
|--------|------|--------|
| `POST` | `/api/tasks/{taskId}/attachments` | Upload one or more files |
| `DELETE` | `/api/tasks/{taskId}/attachments/{documentId}` | Remove a saved attachment |

## Upload (`POST`)

- **Body:** `multipart/form-data`
- **Field name:** `files[]` (repeat per file; the client sends multiple files in one request).
- **Response:** Return the **updated task** as JSON (or `{ "data": { ...task } }` / `{ "task": { ... } }`). The client normalizes the payload and reads `documents` (or `attachments`).

Each document object should include at least:

- `id` (string)
- `name` (original filename)
- `url` (download or public URL)
- `uploaded_at` or `uploadedAt` (ISO string)
- `uploaded_by` or `uploadedBy` (string, optional)
- `size` (bytes, optional)

**Suggested allowed types:** `application/pdf`, PNG/JPEG images, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX), `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX), `text/csv`.

## Delete (`DELETE`)

- Return **204** or **200** with the updated task (same shape as above).
- Frontend removes the row from the UI after success.

## Task list/detail

- `GET /api/tasks`, `GET /api/projects/{id}/tasks`, and `GET /api/tasks/{id}` should include **`documents`** (or **`attachments`**) on each task when present so the UI can show filenames without an extra round trip.

---

## npm / `@radix-ui/react-dropdown-menu`

If install fails with **No matching version for `@radix-ui/react-dropdown-menu@^2.2.x`**, use **`^2.1.15`** (see `package.json` in this repo). A corrupted `package.json` line break can also produce a bogus version like `^2.2.` + newline + `15`.
