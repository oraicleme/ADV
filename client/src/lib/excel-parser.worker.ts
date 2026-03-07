import { parseExcelBuffer } from './excel-parser';

self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  try {
    const result = parseExcelBuffer(e.data);
    self.postMessage({ ok: true, result });
  } catch (err) {
    self.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown parsing error',
    });
  }
};
