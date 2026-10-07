/// <reference lib="webworker" />
import * as XLSX from 'xlsx';

export type XlsxPreviewRequest = {
  buffer: ArrayBuffer;
  maxRows?: number;
  maxCols?: number;
};

export type XlsxPreviewResponse =
  | { ok: true; rows: string[][] }
  | { ok: false; error: string };

self.onmessage = (event: MessageEvent<XlsxPreviewRequest>) => {
  try {
    const { buffer, maxRows = 200, maxCols = 40 } = event.data;
    // sheetRows truncates during parse so large workbooks don't fully expand.
    const workbook = XLSX.read(buffer, {
      type: 'array',
      sheetRows: maxRows + 1,
    });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      (self as DedicatedWorkerGlobalScope).postMessage({
        ok: false,
        error: 'This workbook has no sheets to preview.',
      } satisfies XlsxPreviewResponse);
      return;
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
      sheet,
      {
        header: 1,
        defval: '',
        blankrows: false,
      }
    ) as unknown as string[][];
    const limited = rows.slice(0, maxRows).map((r) =>
      (Array.isArray(r) ? r : [])
        .slice(0, maxCols)
        .map((c) => String(c ?? ''))
    );
    (self as DedicatedWorkerGlobalScope).postMessage({
      ok: true,
      rows: limited,
    } satisfies XlsxPreviewResponse);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Could not parse spreadsheet.';
    (self as DedicatedWorkerGlobalScope).postMessage({
      ok: false,
      error: message,
    } satisfies XlsxPreviewResponse);
  }
};
