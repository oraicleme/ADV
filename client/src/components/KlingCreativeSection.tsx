/**
 * STORY-180: Optional Kling text-to-video generation from canvas context (server-proxied).
 */
import React, { useMemo, useState } from 'react';
import { skipToken } from '@tanstack/react-query';
import { Sparkles, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '../lib/trpc';

export type KlingCanvasContext = {
  products: Array<{ name: string; category?: string; brand?: string }>;
  headline: string;
  cta?: string;
  formatLabel?: string;
  formatWidth?: number;
  formatHeight?: number;
};

function guessAspectRatio(width?: number, height?: number): string {
  if (!width || !height || height <= 0) return '9:16';
  const r = width / height;
  if (Math.abs(r - 9 / 16) < 0.06) return '9:16';
  if (Math.abs(r - 16 / 9) < 0.06) return '16:9';
  if (Math.abs(r - 1) < 0.06) return '1:1';
  return width >= height ? '16:9' : '9:16';
}

export default function KlingCreativeSection({ context }: { context: KlingCanvasContext }) {
  const [taskId, setTaskId] = useState<string | null>(null);

  const health = trpc.kling.health.useQuery(undefined, { staleTime: 60_000 });
  const submit = trpc.kling.submitVideoJob.useMutation({
    onSuccess: (data) => {
      setTaskId(data.taskId);
      toast.message('Kling job started', { description: 'Polling for status…' });
    },
    onError: (err) => {
      toast.error('Kling request failed', { description: err.message });
    },
  });

  const statusQuery = trpc.kling.getVideoJobStatus.useQuery(taskId ? { taskId } : skipToken, {
    refetchInterval: (q) => (q.state.data?.terminal ? false : 3000),
  });

  const aspectRatio = useMemo(
    () => guessAspectRatio(context.formatWidth, context.formatHeight),
    [context.formatWidth, context.formatHeight],
  );

  const productCount = context.products.length;
  const canSubmit = productCount > 0 && health.data?.configured === true && !submit.isPending;

  const handleGenerate = () => {
    if (!canSubmit) return;
    const ctaJoined =
      context.cta?.trim() ||
      undefined;
    submit.mutate({
      headline: context.headline,
      cta: ctaJoined,
      locale: typeof navigator !== 'undefined' ? navigator.language.slice(0, 32) : undefined,
      formatLabel: context.formatLabel,
      products: context.products.map((p) => ({
        name: p.name,
        category: p.category,
        brand: p.brand,
      })),
      mode: 'pro',
      aspect_ratio: aspectRatio,
      duration: '5',
      sound: 'on',
    });
  };

  const urls = statusQuery.data?.resultUrls ?? [];
  const terminal = statusQuery.data?.terminal;
  const failed = statusQuery.data?.state === 'failed';

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-violet-400" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-300">
          AI video (Kling)
        </span>
      </div>

      <p className="mb-2 text-[10px] leading-relaxed text-gray-500">
        Paid API — short video from your canvas copy and products. Keys stay on the server.
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

      {productCount === 0 && (
        <p className="mb-2 text-[10px] text-gray-500">Add products to the canvas to ground the prompt.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canSubmit}
          className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          style={{
            background: 'rgba(139, 92, 246, 0.25)',
            color: '#c4b5fd',
          }}
        >
          {submit.isPending || (Boolean(taskId) && !terminal && !failed) ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          )}
          Generate Kling video
        </button>
        {taskId && (
          <button
            type="button"
            onClick={() => setTaskId(null)}
            className="text-[10px] text-gray-500 underline-offset-2 hover:underline"
          >
            Clear job
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
        <ul className="mt-2 space-y-1">
          {urls.map((u) => (
            <li key={u}>
              <a
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-violet-300 hover:underline"
              >
                Open result <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      )}

      {terminal && statusQuery.data?.state === 'succeeded' && urls.length === 0 && (
        <p className="mt-2 text-[10px] text-gray-400">
          Job finished — no video URL in the response yet. Check server logs (dev) or Kling console.
        </p>
      )}
    </div>
  );
}
