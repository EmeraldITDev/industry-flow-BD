import type {
  XlsxPreviewRequest,
  XlsxPreviewResponse,
} from './xlsxPreview.worker';

/**
 * Run SheetJS parsing off the main thread.
 * Keeps the /content proxy path; only moves CPU work.
 */
export function parseXlsxInWorker(
  buffer: ArrayBuffer,
  opts?: { maxRows?: number; maxCols?: number }
): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./xlsxPreview.worker.ts', import.meta.url),
      { type: 'module' }
    );

    const cleanup = () => {
      worker.terminate();
    };

    worker.onmessage = (event: MessageEvent<XlsxPreviewResponse>) => {
      cleanup();
      const data = event.data;
      if (data.ok) resolve(data.rows);
      else reject(new Error(data.error));
    };
    worker.onerror = (err) => {
      cleanup();
      reject(err.error ?? new Error(err.message || 'XLSX worker failed'));
    };

    const payload: XlsxPreviewRequest = {
      buffer,
      maxRows: opts?.maxRows ?? 200,
      maxCols: opts?.maxCols ?? 40,
    };
    worker.postMessage(payload, [buffer]);
  });
}
