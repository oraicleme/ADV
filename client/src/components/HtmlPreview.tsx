import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'sonner';
import { Download, Copy, Check, Image, Loader2, X, ZoomIn, Maximize2 } from 'lucide-react';
import type { FormatPreset } from '../lib/ad-layouts/types';
import {
  exportAdAsImage,
  downloadBlob,
  exportFilename,
} from '../lib/export-image';

interface HtmlPreviewProps {
  html: string;
  format?: FormatPreset;
}

/** Scaled iframe preview — no buttons. Renders the ad at full resolution and CSS-scales it down. */
export function AdPreviewFrame({
  html,
  format,
  containerWidth,
}: {
  html: string;
  format?: FormatPreset;
  containerWidth: number;
}) {
  const adWidth = format?.width ?? 1080;
  const adHeight = format?.height ?? 1920;
  const scale = containerWidth / adWidth;
  const scaledHeight = Math.round(adHeight * scale);

  if (!html) return null;

  return (
    <div
      data-testid="ad-preview-scale-wrapper"
      style={{
        width: containerWidth,
        height: scaledHeight,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <iframe
        title="Ad Preview"
        srcDoc={html}
        sandbox="allow-same-origin"
        style={{
          width: adWidth,
          height: adHeight,
          border: 'none',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

/** Action buttons (Copy / Download / Export PNG / Export JPEG) — no iframe. */
export function AdPreviewActions({
  html,
  format,
}: {
  html: string;
  format?: FormatPreset;
}) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<'png' | 'jpeg' | null>(null);

  const width = format?.width ?? 1080;
  const height = format?.height ?? 1920;

  const handleDownload = useCallback(() => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ad-creative.html';
    a.click();
    URL.revokeObjectURL(url);
  }, [html]);

  const handleCopy = useCallback(async () => {
    if (!html) return;
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [html]);

  const handleExport = useCallback(
    async (fmt: 'png' | 'jpeg') => {
      if (!html) return;
      setExporting(fmt);
      try {
        const blob = await exportAdAsImage({
          html,
          width,
          height,
          format: fmt,
          quality: 0.9,
        });
        downloadBlob(blob, exportFilename(width, height, fmt));
        toast.success(`Exported as ${fmt.toUpperCase()}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(`Export failed: ${message}`);
        if (message.includes('Tainted') || message.includes('CORS') || message.includes('canvas')) {
          toast.info('Tip: Use "Download" for HTML if the ad uses external images.');
        }
      } finally {
        setExporting(null);
      }
    },
    [html, width, height],
  );

  if (!html) return null;

  const anyExporting = exporting !== null;

  return (
    <div data-testid="ad-preview-actions" className="flex items-center justify-between px-4 py-2">
      <span className="text-xs font-semibold text-gray-400">Actions</span>
      <div className="flex gap-1.5">
        <button
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy HTML'}
          disabled={anyExporting}
          className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 transition hover:bg-white/10 disabled:opacity-50"
        >
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={handleDownload}
          aria-label="Download HTML"
          disabled={anyExporting}
          className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 transition hover:bg-white/10 disabled:opacity-50"
        >
          <Download className="h-3 w-3" />
          Download
        </button>
        <button
          onClick={() => handleExport('png')}
          aria-label="Export as PNG"
          disabled={anyExporting}
          className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 transition hover:bg-white/10 disabled:opacity-50"
        >
          {exporting === 'png' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Image className="h-3 w-3" />
          )}
          {exporting === 'png' ? 'Exporting…' : 'Export PNG'}
        </button>
        <button
          onClick={() => handleExport('jpeg')}
          aria-label="Export as JPEG"
          disabled={anyExporting}
          className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 transition hover:bg-white/10 disabled:opacity-50"
        >
          {exporting === 'jpeg' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Image className="h-3 w-3" />
          )}
          {exporting === 'jpeg' ? 'Exporting…' : 'Export JPEG'}
        </button>
      </div>
    </div>
  );
}

type ZoomMode = 'fit' | '100%';

export interface AdPreviewEnlargedModalProps {
  open: boolean;
  onClose: () => void;
  html: string;
  format?: FormatPreset;
  /** Ref to the element that opened the modal; focus returns here on close. */
  triggerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Enlarged ad preview modal/lightbox: larger view, zoom (fit / 100%), close via Escape/overlay/button,
 * same Copy/Download/Export actions, focus trap and return.
 */
export function AdPreviewEnlargedModal({
  open,
  onClose,
  html,
  format,
  triggerRef,
}: AdPreviewEnlargedModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [zoomMode, setZoomMode] = useState<ZoomMode>('fit');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      setReducedMotion(false);
      return;
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first) first.focus();
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [open]);

  const handleClose = useCallback(() => {
    onClose();
    requestAnimationFrame(() => {
      triggerRef?.current?.focus();
    });
  }, [onClose, triggerRef]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) handleClose();
    },
    [handleClose],
  );

  if (!open) return null;

  const adWidth = format?.width ?? 1080;
  const adHeight = format?.height ?? 1920;
  const maxW = typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.9 - 80, adWidth) : adWidth;
  const maxH = typeof window !== 'undefined' ? Math.min(window.innerHeight * 0.8 - 180, adHeight) : adHeight;
  const fitScale = Math.min(maxW / adWidth, maxH / adHeight, 1);
  const fitContainerWidth = Math.round(adWidth * fitScale);
  const fitContainerHeight = Math.round(adHeight * fitScale);
  const containerWidth = zoomMode === '100%' ? adWidth : fitContainerWidth;
  const containerHeight = zoomMode === '100%' ? adHeight : fitContainerHeight;

  const modalJSX = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Ad preview enlarged"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
        style={{
          transition: reducedMotion ? 'none' : 'opacity 0.2s ease-out',
        }}
      />
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative flex h-[90vh] max-h-[900px] w-full max-w-[min(96vw,1200px)] flex-col overflow-hidden rounded-xl border border-white/10 bg-gray-950 shadow-2xl outline-none"
        style={{
          transition: reducedMotion ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <span className="text-sm font-semibold text-gray-200" id="enlarged-preview-title">
            Ad preview
          </span>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
              <button
                type="button"
                onClick={() => setZoomMode('fit')}
                aria-label="Fit to view"
                title="Fit to view"
                className={`flex items-center gap-1 px-2.5 py-1 text-xs ${zoomMode === 'fit' ? 'bg-white/10 text-gray-200' : 'text-gray-400 hover:text-gray-300'}`}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Fit
              </button>
              <button
                type="button"
                onClick={() => setZoomMode('100%')}
                aria-label="Actual size 100%"
                title="Actual size (100%)"
                className={`flex items-center gap-1 px-2.5 py-1 text-xs ${zoomMode === '100%' ? 'bg-white/10 text-gray-200' : 'text-gray-400 hover:text-gray-300'}`}
              >
                <ZoomIn className="h-3.5 w-3.5" />
                100%
              </button>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-gray-200 focus:ring-2 focus:ring-orange-500/50 focus:outline-none"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="flex flex-col items-center gap-4">
            {html ? (
              <div
                className="overflow-auto rounded-lg border border-white/10 bg-black/40"
                style={{
                  maxWidth: '100%',
                  width: containerWidth,
                  height: containerHeight,
                  maxHeight: zoomMode === '100%' ? 'none' : containerHeight,
                }}
              >
                <AdPreviewFrame
                  html={html}
                  format={format}
                  containerWidth={containerWidth}
                />
              </div>
            ) : null}
            {html ? (
              <div className="w-full max-w-full rounded-lg border border-white/10 bg-white/[0.03]">
                <AdPreviewActions html={html} format={format} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalJSX, document.body);
}

/**
 * Full preview component (iframe + action buttons).
 * Used in the mobile preview modal where we want everything in one block.
 */
export default function HtmlPreview({ html, format }: HtmlPreviewProps) {
  const width = format?.width ?? 1080;
  const height = format?.height ?? 1920;
  const frameWidth = Math.round(width / 3);

  if (!html) return null;

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white">
      <AdPreviewActions html={html} format={format} />
      <div className="flex justify-center bg-gray-50 p-4">
        <AdPreviewFrame html={html} format={format} containerWidth={frameWidth} />
      </div>
    </div>
  );
}
