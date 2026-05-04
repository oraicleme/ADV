/**
 * KlingImageGenSection — Opt-in AI image generation for ad backgrounds/scenes.
 * Uses Kling's Kolors model to generate professional ad backgrounds.
 * Cost: ~$0.028 per image (1K resolution).
 *
 * User provides a prompt (or uses a suggested one), gets back generated images
 * that can be used as ad backgrounds in the canvas.
 */
import React, { useState, useCallback } from 'react';
import { skipToken } from '@tanstack/react-query';
import { ImageIcon, Loader2, AlertCircle, ExternalLink, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '../lib/trpc';

export type KlingImageGenContext = {
  /** Current ad format aspect ratio hint */
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '3:2' | '2:3';
  /** Product names for prompt suggestions */
  productNames?: string[];
  /** Category for prompt suggestions */
  category?: string;
  /** Callback when user selects a generated image as background */
  onSelectBackground?: (imageUrl: string) => void;
};

const PROMPT_SUGGESTIONS = [
  'Clean modern gradient background for product advertisement, soft lighting, professional',
  'Minimalist studio setup with soft shadows, product photography backdrop, premium feel',
  'Dynamic abstract shapes with brand colors, modern advertising background, energetic',
  'Lifestyle scene, warm lighting, bokeh background, premium product showcase environment',
  'Festive holiday theme background, subtle snowflakes, warm golden tones, celebration',
  'Tech-inspired dark background with subtle neon accents, futuristic, sleek',
];

export default function KlingImageGenSection({ context }: { context: KlingImageGenContext }) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);

  const health = trpc.kling.health.useQuery(undefined, { staleTime: 60_000 });

  const submit = trpc.kling.submitImageGen.useMutation({
    onSuccess: (data) => {
      setTaskId(data.taskId);
      toast.message('Image generation started', { description: 'Generating AI background — this takes 10-30s.' });
    },
    onError: (err) => {
      toast.error('Image generation failed', { description: err.message });
    },
  });

  const statusQuery = trpc.kling.getImageGenStatus.useQuery(
    taskId ? { taskId } : skipToken,
    { refetchInterval: (q) => (q.state.data?.terminal ? false : 3000) },
  );

  const canSubmit = health.data?.configured === true && !submit.isPending;

  const handleGenerate = useCallback((promptText: string) => {
    if (!canSubmit || !promptText.trim()) return;
    submit.mutate({
      prompt: promptText.trim(),
      count: 2,
      aspectRatio: context.aspectRatio || '1:1',
      resolution: '1k',
    });
  }, [canSubmit, context.aspectRatio, submit]);

  const handleCustomGenerate = useCallback(() => {
    if (prompt.trim()) handleGenerate(prompt.trim());
  }, [prompt, handleGenerate]);

  const urls = statusQuery.data?.resultUrls ?? [];
  const terminal = statusQuery.data?.terminal;
  const failed = statusQuery.data?.state === 'failed';
  const processing = Boolean(taskId) && !terminal && !failed;

  // Build a smart suggestion based on context
  const contextualPrompt = context.productNames?.length
    ? `Professional advertising background for ${context.category || 'products'}: ${context.productNames.slice(0, 3).join(', ')}. Clean, modern, premium feel.`
    : undefined;

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <div className="mb-2 flex items-center gap-1.5">
        <ImageIcon className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-300">
          AI Backgrounds (Kling)
        </span>
      </div>

      <p className="mb-2 text-[10px] leading-relaxed text-gray-500">
        Generate AI-powered ad backgrounds and scenes. Cost: ~$0.03 per image.
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

      {/* Quick suggestions */}
      {!showPromptInput && !processing && (
        <div className="mb-2 flex flex-wrap gap-1">
          {contextualPrompt && (
            <button
              type="button"
              onClick={() => handleGenerate(contextualPrompt)}
              disabled={!canSubmit}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50 transition-colors"
            >
              <Wand2 className="h-2.5 w-2.5" /> Smart (from products)
            </button>
          )}
          <button
            type="button"
            onClick={() => handleGenerate(PROMPT_SUGGESTIONS[0])}
            disabled={!canSubmit}
            className="rounded-full px-2 py-1 text-[9px] font-medium bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            Clean gradient
          </button>
          <button
            type="button"
            onClick={() => handleGenerate(PROMPT_SUGGESTIONS[1])}
            disabled={!canSubmit}
            className="rounded-full px-2 py-1 text-[9px] font-medium bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            Studio setup
          </button>
          <button
            type="button"
            onClick={() => handleGenerate(PROMPT_SUGGESTIONS[4])}
            disabled={!canSubmit}
            className="rounded-full px-2 py-1 text-[9px] font-medium bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            Holiday/festive
          </button>
          <button
            type="button"
            onClick={() => setShowPromptInput(true)}
            className="rounded-full px-2 py-1 text-[9px] font-medium bg-white/5 text-gray-400 hover:bg-white/10 transition-colors"
          >
            Custom…
          </button>
        </div>
      )}

      {/* Custom prompt input */}
      {showPromptInput && !processing && (
        <div className="mb-2 flex gap-1.5">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomGenerate()}
            placeholder="Describe the background you want…"
            className="flex-1 rounded bg-white/5 px-2 py-1.5 text-[10px] text-gray-200 placeholder:text-gray-600 border border-white/10 focus:border-emerald-500/50 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCustomGenerate}
            disabled={!canSubmit || !prompt.trim()}
            className="rounded px-2 py-1.5 text-[10px] font-semibold bg-emerald-500/25 text-emerald-300 disabled:opacity-50"
          >
            Generate
          </button>
          <button
            type="button"
            onClick={() => setShowPromptInput(false)}
            className="text-[10px] text-gray-500 hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Processing state */}
      {processing && (
        <div className="mb-2 flex items-center gap-2 text-[10px] text-gray-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
          Generating images…
        </div>
      )}

      {/* Error states */}
      {statusQuery.error && (
        <p className="mt-2 text-[10px] text-red-400">{statusQuery.error.message}</p>
      )}
      {failed && statusQuery.data?.errorMessage && (
        <p className="mt-2 text-[10px] text-red-400">{statusQuery.data.errorMessage}</p>
      )}

      {/* Results */}
      {urls.length > 0 && (
        <div className="mt-2">
          <p className="mb-1.5 text-[9px] font-medium text-gray-400 uppercase tracking-wider">Generated images:</p>
          <div className="grid grid-cols-2 gap-2">
            {urls.map((u, i) => (
              <div key={u} className="group relative rounded overflow-hidden border border-white/10">
                <img
                  src={u}
                  alt={`Generated background ${i + 1}`}
                  className="w-full h-24 object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {context.onSelectBackground && (
                    <button
                      type="button"
                      onClick={() => context.onSelectBackground!(u)}
                      className="rounded px-2 py-1 text-[9px] font-semibold bg-emerald-500 text-white"
                    >
                      Use as BG
                    </button>
                  )}
                  <a
                    href={u}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded px-2 py-1 text-[9px] font-semibold bg-white/20 text-white"
                  >
                    <ExternalLink className="h-2.5 w-2.5 inline" /> Open
                  </a>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTaskId(null)}
            className="mt-2 text-[10px] text-gray-500 underline-offset-2 hover:underline"
          >
            Clear results
          </button>
        </div>
      )}

      {terminal && statusQuery.data?.state === 'succeeded' && urls.length === 0 && (
        <p className="mt-2 text-[10px] text-gray-400">
          Generation finished but no image URLs returned. Try again or check Kling console.
        </p>
      )}
    </div>
  );
}
