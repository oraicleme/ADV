/**
 * Export Panel - Provides UI for exporting ads as PNG, JPEG, or HTML
 * STORY-127: When htmlPerPage is provided, exports one file per page (multi-page export).
 */

import React, { useState } from 'react';
import { Download, FileImage, FileText, Loader2, AlertCircle } from 'lucide-react';
import { exportAdAsPNG, exportAdAsJPEG, exportAdAsHTML } from '../lib/export-utils';
import { exportAdAsImage, downloadBlob } from '../lib/export-image';
import KlingCreativeSection, { type KlingCanvasContext } from './KlingCreativeSection';
import KlingAnimateSection, { type KlingAnimateContext } from './KlingAnimateSection';
import KlingImageGenSection, { type KlingImageGenContext } from './KlingImageGenSection';

interface ExportPanelProps {
  canvasElementId: string;
  adName?: string;
  disabled?: boolean;
  /** STORY-127: When set, export one asset per page (PNG/JPEG/HTML). */
  htmlPerPage?: string[];
  /** Dimensions for multi-page image export. */
  exportFormat?: { width: number; height: number };
  /** STORY-180: Canvas snapshot for Kling (optional; server builds prompt). */
  klingCanvas?: KlingCanvasContext;
  /** Opt-in image-to-video: animate the rendered ad */
  klingAnimate?: KlingAnimateContext;
  /** Opt-in AI image generation for backgrounds */
  klingImageGen?: KlingImageGenContext;
}

export default function ExportPanel({
  canvasElementId,
  adName = 'ad-creative',
  disabled = false,
  htmlPerPage,
  exportFormat,
  klingCanvas,
  klingAnimate,
  klingImageGen,
}: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const useMultiPage = htmlPerPage && htmlPerPage.length > 1 && exportFormat;

  const handleExport = async (format: 'png' | 'jpeg' | 'html') => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      if (useMultiPage) {
        const { width, height } = exportFormat!;
        for (let i = 0; i < htmlPerPage!.length; i++) {
          const html = htmlPerPage![i]!;
          const pageNum = i + 1;
          const base = `${adName}-page-${pageNum}`;
          if (format === 'html') {
            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            downloadBlob(blob, `${base}.html`);
          } else {
            const blob = await exportAdAsImage({
              html,
              width,
              height,
              format,
              quality: format === 'jpeg' ? 0.85 : undefined,
            });
            downloadBlob(blob, `${base}.${format === 'jpeg' ? 'jpg' : 'png'}`);
          }
          if (i < htmlPerPage!.length - 1) {
            await new Promise((r) => setTimeout(r, 300));
          }
        }
      } else {
        const filename = `${adName}.${format === 'jpeg' ? 'jpg' : format}`;
        switch (format) {
          case 'png':
            await exportAdAsPNG(canvasElementId, { filename, scale: 2 });
            break;
          case 'jpeg':
            await exportAdAsJPEG(canvasElementId, { filename, quality: 0.85, scale: 2 });
            break;
          case 'html':
            await exportAdAsHTML(canvasElementId, { filename: `${adName}.html` });
            break;
        }
      }

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Download className="h-3.5 w-3.5 text-blue-400" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-300">Export Ad</span>
      </div>

      {/* Error message */}
      {exportError && (
        <div className="mb-2 flex items-start gap-2 rounded bg-red-500/10 p-2 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{exportError}</span>
        </div>
      )}

      {/* Success message */}
      {exportSuccess && (
        <div className="mb-2 rounded bg-green-500/10 p-2 text-xs text-green-400">✓ Exported successfully</div>
      )}

      {/* Export buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleExport('png')}
          disabled={disabled || isExporting}
          className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          style={{
            background: 'rgba(59, 130, 246, 0.2)',
            color: '#3b82f6',
          }}
          onMouseEnter={(e) => {
            if (!disabled && !isExporting) {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59, 130, 246, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59, 130, 246, 0.2)';
          }}
        >
          {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileImage className="h-3 w-3" />}
          PNG
        </button>

        <button
          type="button"
          onClick={() => handleExport('jpeg')}
          disabled={disabled || isExporting}
          className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          style={{
            background: 'rgba(168, 85, 247, 0.2)',
            color: '#a855f7',
          }}
          onMouseEnter={(e) => {
            if (!disabled && !isExporting) {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(168, 85, 247, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(168, 85, 247, 0.2)';
          }}
        >
          {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileImage className="h-3 w-3" />}
          JPEG
        </button>

        <button
          type="button"
          onClick={() => handleExport('html')}
          disabled={disabled || isExporting}
          className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          style={{
            background: 'rgba(34, 197, 94, 0.2)',
            color: '#22c55e',
          }}
          onMouseEnter={(e) => {
            if (!disabled && !isExporting) {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34, 197, 94, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34, 197, 94, 0.2)';
          }}
        >
          {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
          HTML
        </button>
      </div>

      <p className="mt-2 text-[10px] text-gray-400">
        {useMultiPage
          ? `${htmlPerPage!.length} pages — each export downloads ${htmlPerPage!.length} files (one per page).`
          : 'Download your ad as an image or HTML file for sharing and publishing.'}
      </p>

      {klingCanvas ? <KlingCreativeSection context={klingCanvas} /> : null}
      {klingAnimate ? <KlingAnimateSection context={klingAnimate} /> : null}
      {klingImageGen ? <KlingImageGenSection context={klingImageGen} /> : null}
    </div>
  );
}
