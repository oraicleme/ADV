import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Building2, Bookmark, Trash2 } from 'lucide-react';
import {
  isValidLogoFile,
  createLogoEntry,
  type LogoEntry,
  type LogoType,
} from '../lib/logo-utils';
import type { SavedLogoEntry } from '../lib/saved-logos';
import type { SavedBrandLogoEntry } from '../lib/saved-brand-logos';

interface LogoUploadZoneProps {
  label: string;
  sublabel: string;
  type: LogoType;
  testId: string;
  icon: React.ReactNode;
  logos: LogoEntry[];
  onAdd: (entry: LogoEntry | LogoEntry[]) => void;
  onRemove: (id: string) => void;
  error: string | null;
  onError: (msg: string | null) => void;
}

function LogoUploadZone({
  label,
  sublabel,
  type,
  testId,
  icon,
  logos,
  onAdd,
  onRemove,
  error,
  onError,
}: LogoUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    onError(null);
    const entries: LogoEntry[] = [];
    for (const file of Array.from(files)) {
      if (!isValidLogoFile(file)) {
        onError(`Unsupported file "${file.name}". Use PNG, SVG, JPEG, or WebP (max 5 MB).`);
        continue;
      }
      entries.push(createLogoEntry(file, type));
    }
    if (entries.length > 0) {
      onAdd(entries.length === 1 ? entries[0]! : entries);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-500">
        {icon} {label}
      </div>
      <div className="mb-2 text-xs text-gray-500">{sublabel}</div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 bg-white/[0.03] px-3 py-3 text-xs text-gray-500 transition hover:border-orange-500/50 hover:bg-orange-500/5">
        <Upload className="h-3.5 w-3.5" />
        Click to upload
        <span className="text-xs text-gray-600">PNG, SVG, JPEG, WebP</span>
        <input
          ref={inputRef}
          data-testid={testId}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
          multiple={type === 'brand'}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {error && (
        <div className="mt-1.5 text-xs text-red-400">{error}</div>
      )}

      {logos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {logos.map((logo) => (
            <div
              key={logo.id}
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-300"
            >
              <ImageIcon className="h-3 w-3 text-gray-500" />
              <span className="max-w-[120px] truncate">{logo.name}</span>
              <button
                data-testid={`remove-logo-${logo.id}`}
                onClick={() => onRemove(logo.id)}
                className="ml-0.5 rounded p-0.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type LogosUpdate = LogoEntry[] | ((prev: LogoEntry[]) => LogoEntry[]);

interface LogoUploaderProps {
  /** Accepts either new array or updater function (so batched adds e.g. multiple brand logos don't overwrite) */
  onLogosChange: (next: LogosUpdate) => void;
  /** When provided, use parent's list (controlled) so uploaded logos stay in sync with preview/save */
  logos?: LogoEntry[];
  /** Retail Promo only: saved company logos to show in sidebar */
  savedLogos?: SavedLogoEntry[];
  /** Current company logo data URI (from upload or selected saved) */
  currentCompanyLogoDataUri?: string;
  /** When set, show under company section so user knows why preview/save isn't available */
  companyLogoLoadError?: string | null;
  /** When true, show "Loading image…" so user knows the upload is being processed */
  companyLogoLoading?: boolean;
  /** Id of saved logo currently selected as company logo */
  selectedSavedLogoId?: string | null;
  onSelectSavedLogo?: (id: string) => void;
  onSaveCurrentLogo?: () => void;
  onRemoveSavedLogo?: (id: string) => void;
  isSavedLogosFull?: boolean;
  /** STORY-49: saved brand logos for sidebar library */
  savedBrandLogos?: SavedBrandLogoEntry[];
  /** Current brand logo data URIs (from uploads or selected saved) */
  currentBrandLogoDataUris?: string[];
  onSelectSavedBrandLogo?: (id: string) => void;
  onSaveCurrentBrandLogos?: () => void;
  onRemoveSavedBrandLogo?: (id: string) => void;
  isSavedBrandLogosFull?: boolean;
}

export default function LogoUploader({
  onLogosChange,
  logos: logosProp,
  savedLogos = [],
  currentCompanyLogoDataUri,
  companyLogoLoadError = null,
  companyLogoLoading = false,
  selectedSavedLogoId = null,
  onSelectSavedLogo,
  onSaveCurrentLogo,
  onRemoveSavedLogo,
  isSavedLogosFull = false,
  savedBrandLogos = [],
  currentBrandLogoDataUris = [],
  onSelectSavedBrandLogo,
  onSaveCurrentBrandLogos,
  onRemoveSavedBrandLogo,
  isSavedBrandLogosFull = false,
}: LogoUploaderProps) {
  const [internalLogos, setInternalLogos] = useState<LogoEntry[]>([]);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [brandError, setBrandError] = useState<string | null>(null);

  const logos = logosProp !== undefined ? logosProp : internalLogos;

  const update = useCallback(
    (updater: LogosUpdate) => {
      onLogosChange(updater);
      if (logosProp === undefined) {
        const next = typeof updater === 'function' ? updater(internalLogos) : updater;
        setInternalLogos(next);
      }
    },
    [onLogosChange, logosProp, internalLogos],
  );

  const addLogo = useCallback(
    (entryOrEntries: LogoEntry | LogoEntry[]) => {
      const entries = Array.isArray(entryOrEntries) ? entryOrEntries : [entryOrEntries];
      if (entries.length === 0) return;
      if (logosProp !== undefined) {
        const current = logos;
        const next =
          entries[0]!.type === 'company'
            ? [...current.filter((l) => l.type !== 'company'), ...entries]
            : [...current, ...entries];
        onLogosChange(next);
      } else {
        entries.forEach((entry) => {
          update((prev) =>
            entry.type === 'company'
              ? [...prev.filter((l) => l.type !== 'company'), entry]
              : [...prev, entry],
          );
        });
      }
    },
    [logosProp, logos, update, onLogosChange],
  );

  const removeLogo = useCallback(
    (id: string) => {
      if (logosProp !== undefined) {
        onLogosChange(logos.filter((l) => l.id !== id));
      } else {
        update((prev) => prev.filter((l) => l.id !== id));
      }
    },
    [logosProp, logos, update, onLogosChange],
  );

  const companyLogos = logos.filter((l) => l.type === 'company');
  const brandLogos = logos.filter((l) => l.type === 'brand');
  // Use companyLogos.length (synchronous) so the section appears in the same render
  // cycle as the thumbnail — avoids a second layout pop when the async data URI resolves.
  const showSavedSection =
    (savedLogos.length > 0 || companyLogos.length > 0) &&
    (onSaveCurrentLogo != null || onSelectSavedLogo != null || onRemoveSavedLogo != null);
  const showSavedBrandSection =
    (savedBrandLogos.length > 0 || currentBrandLogoDataUris.length > 0 || brandLogos.length > 0) &&
    (onSaveCurrentBrandLogos != null || onSelectSavedBrandLogo != null || onRemoveSavedBrandLogo != null);

  return (
    <div>
      <LogoUploadZone
        label="Company Logo"
        sublabel="Your logo — shown on every ad"
        type="company"
        testId="company-logo-input"
        icon={<Building2 className="h-3.5 w-3.5 text-orange-500" />}
        logos={companyLogos}
        onAdd={addLogo}
        onRemove={removeLogo}
        error={companyError ?? companyLogoLoadError}
        onError={setCompanyError}
      />

      {showSavedSection && (
        <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-500">
              <Bookmark className="h-3.5 w-3.5 text-orange-500/80" />
              Saved company logos
            </span>
          </div>
          {(currentCompanyLogoDataUri || companyLogoLoading) && onSaveCurrentLogo && (
            <div className="mb-3">
              {companyLogoLoading ? (
                <p className="py-2 text-center text-xs text-gray-500" data-testid="company-logo-loading">
                  Loading image…
                </p>
              ) : (
                <button
                  type="button"
                  onClick={onSaveCurrentLogo}
                  data-testid="save-current-logo"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 py-2 text-xs font-medium text-gray-300 transition hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-400 disabled:opacity-60"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  Save this logo
                </button>
              )}
              {isSavedLogosFull && (
                <p className="mt-1 text-xs text-gray-500">
                  Max saved logos reached. Saving will replace the oldest.
                </p>
              )}
            </div>
          )}
          {savedLogos.length > 0 && (
            <ul className="space-y-2" role="list" aria-label="Saved company logos">
              {savedLogos.map((saved) => (
                <li
                  key={saved.id}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-2 transition ${
                    selectedSavedLogoId === saved.id
                      ? 'border-orange-500/40 bg-orange-500/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectSavedLogo?.(saved.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded p-1 text-left focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    data-testid={`use-saved-logo-${saved.id}`}
                    aria-label={`Use ${saved.name}`}
                  >
                    <img
                      src={saved.dataUri}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded border border-white/10 object-contain bg-white/5"
                    />
                    <span className="min-w-0 truncate text-xs text-gray-300">{saved.name}</span>
                  </button>
                  {onRemoveSavedLogo && (
                    <button
                      type="button"
                      onClick={() => onRemoveSavedLogo(saved.id)}
                      data-testid={`remove-saved-logo-${saved.id}`}
                      aria-label={`Remove ${saved.name} from saved`}
                      className="shrink-0 rounded p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <LogoUploadZone
        label="Brand Logos"
        sublabel="Optional — brand/product logos (Samsung, Nike, etc.)"
        type="brand"
        testId="brand-logo-input"
        icon={<ImageIcon className="h-3.5 w-3.5 text-purple-500" />}
        logos={brandLogos}
        onAdd={addLogo}
        onRemove={removeLogo}
        error={brandError}
        onError={setBrandError}
      />

      {showSavedBrandSection && (
        <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-500">
              <Bookmark className="h-3.5 w-3.5 text-purple-500/80" />
              Saved brand logos
            </span>
          </div>
          {currentBrandLogoDataUris.length > 0 && onSaveCurrentBrandLogos && (
            <div className="mb-3">
              <button
                type="button"
                onClick={onSaveCurrentBrandLogos}
                data-testid="save-current-brand-logos"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 py-2 text-xs font-medium text-gray-300 transition hover:border-purple-500/40 hover:bg-purple-500/10 hover:text-purple-400 disabled:opacity-60"
              >
                <Bookmark className="h-3.5 w-3.5" />
                Save current brand logos
              </button>
              {isSavedBrandLogosFull && (
                <p className="mt-1 text-xs text-gray-500">
                  Max saved brand logos reached. Saving will replace the oldest.
                </p>
              )}
            </div>
          )}
          {savedBrandLogos.length > 0 && (
            <ul className="space-y-2" role="list" aria-label="Saved brand logos">
              {savedBrandLogos.map((saved) => (
                <li
                  key={saved.id}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-2 transition"
                >
                  <button
                    type="button"
                    onClick={() => onSelectSavedBrandLogo?.(saved.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded p-1 text-left focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    data-testid={`use-saved-brand-logo-${saved.id}`}
                    aria-label={`Add ${saved.name} to ad`}
                  >
                    <img
                      src={saved.dataUri}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded border border-white/10 object-contain bg-white/5"
                    />
                    <span className="min-w-0 truncate text-xs text-gray-300">{saved.name}</span>
                  </button>
                  {onRemoveSavedBrandLogo && (
                    <button
                      type="button"
                      onClick={() => onRemoveSavedBrandLogo(saved.id)}
                      data-testid={`remove-saved-brand-logo-${saved.id}`}
                      aria-label={`Remove ${saved.name} from saved`}
                      className="shrink-0 rounded p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
