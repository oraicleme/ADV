/**
 * KlingAnimateSection — Opt-in "Animate this ad" button.
 * Takes a screenshot of the rendered ad (with logo, products, layout intact)
 * and sends it to Kling image-to-video for a short animated clip.
 *
 * This replaces the auto-spawn approach. User explicitly clicks to generate.
 * Cost: ~$0.21 per 5s standard video.
 */
import React, { useState, useCallback } from 'react';
import { skipToken } from '@tanstack/react-query';
import { Film, Loader2, AlertCircle, ExternalLink, Download } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '../lib/trpc';
import { exportAdAsImage } from '../lib/export-image';

export type KlingAnimateContext = {
  /** The final rendered HTML of the current ad page */
  html: string;
  /** Format width in px */
  width: number;
  /** Format height in px */
  height: number;
  /** Optional animation prompt override */
  animationPrompt?: string;
};

/** Convert a Blob to raw Base64 string (no data: prefix) */
async function blobToRawBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default function KlingAnimateSection({ context }: { context: KlingAnimateContext }) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const health = trpc.kling.health.useQuery(undefined, { staleTime: 60_000 });

  const submit = trpc.kling.submitImage2Video.useMutation({
    onSuccess: (data) => {
      setTaskId(data.taskId);
      toast.message('Animation started', { description: 'Kling is animating your ad — polling for result…' });
    },
    onError: (err) => {
      toast.error('Animation request failed', { description: err.message });
    },
  });

  const statusQuery = trpc.kling.getImage2VideoStatus.useQuery(
    taskId ? { taskId } : skipToken,
    { refetchInterval: (q) => (q.state.data?.terminal ? false : 4000) },
  );

  const canSubmit = health.data?.configured === true && !submit.isPending && !capturing && context.html.length > 0;

  const handleAnimate = useCallback(async () => {
    if (!canSubmit) return;

    try {
      setCapturing(true);
      toast.message('Capturing ad screenshot…', { description: 'Rendering your ad as an image for animation.' });

      // Capture the rendered ad as a PNG blob
      const blob = await exportAdAsImage({
        html: context.html,
        width: context.width,
        height: context.height,
        format: 'png',
      });

      // Convert to raw Base64 (Kling requires no data: prefix)
      const base64 = await blobToRawBase64(blob);

      setCapturing(false);

      // Submit to Kling image-to-video
      submit.mutate({
        image: base64,
        prompt: context.animationPrompt || 'Smooth subtle zoom in, gentle product highlight animation, professional advertising motion, brand-safe',
        duration: '5',
        mode: 'std',
        sound: 'off',
      });
    } catch (err) {
      setCapturing(false);
      const msg = err instanceof Error ? err.message : 'Screenshot capture failed';
      toast.error('Failed to capture ad', { description: msg });
    }
  }, [canSubmit, context, submit]);

  const urls = statusQuery.data?.resultUrls ?? [];
  const terminal = statusQuery.data?.terminal;
  const failed = statusQuery.data?.state === 'failed';
  const processing = Boolean(taskId) && !terminal && !failed;

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Film className="h-3.5 w-3.5 text-indigo-400" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-300">
          Animate Ad (Kling)
        </span>
      </div>

      <p className="mb-2 text-[10px] leading-relaxed text-gray-500">
        Animate your finished ad into a 5-second video. Uses your exact design with logo and products.
        Cost: ~$0.21 per video.
      </p>

      {health.data && !health.data.configured && (
        <div className="mb-2 flex items-start gap-2 rounded bg-amber-500/10 p-2 text-[10px] text-amber-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Kling is not configured (set <code className="text-amber-100">KLING_ACCESS_KEY</code> and{' '}
            <code className="text-amber-100">KLING_SECRET_KEY</code> on the server).
          </span>
        </div>
      )}

      {context.html.length === 0 && (
        <p className="mb-2 text-[10px] text-gray-500">Design your ad first — the animation uses your finished layout.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAnimate}
          disabled={!canSubmit}
          className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          style={{
            background: 'rgba(99, 102, 241, 0.25)',
            color: '#a5b4fc',
          }}
        >
          {capturing || submit.isPending || processing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Film className="h-3.5 w-3.5" aria-hidden />
          )}
          {capturing ? 'Capturing…' : processing ? 'Animating…' : 'Animate this ad'}
        </button>

        {taskId && terminal && (
          <button
            type="button"
            onClick={() => setTaskId(null)}
            className="text-[10px] text-gray-500 underline-offset-2 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {statusQuery.error && (
        <p className="mt-2 text-[10px] text-red-400">{statusQuery.error.message}</p>
      )}

      {failed && statusQuery.data?.errorMessage && (
        <p className="mt-2 text-[10px] text-red-400">{statusQuery.data.errorMessage}</p>
      )}

      {urls.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {urls.map((u) => (
            <div key={u} className="flex items-center gap-2">
              <a
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-indigo-300 hover:underline"
              >
                <ExternalLink className="h-3 w-3" aria-hidden />
                View video
              </a>
              <a
                href={u}
                download
                className="inline-flex items-center gap-1 text-[10px] text-indigo-300 hover:underline"
              >
                <Download className="h-3 w-3" aria-hidden />
                Download
              </a>
            </div>
          ))}
        </div>
      )}

      {terminal && statusQuery.data?.state === 'succeeded' && urls.length === 0 && (
        <p className="mt-2 text-[10px] text-gray-400">
          Animation finished but no video URL yet. Check Kling console or try again.
        </p>
      )}
    </div>
  );
}
