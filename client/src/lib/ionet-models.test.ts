import { describe, it, expect } from 'vitest';
import {
  AD_COPY_MODELS,
  VISION_MODELS,
  getAdCopyModels,
  getVisionModels,
  pickModel,
} from './ionet-models';

describe('ionet-models', () => {
  describe('getAdCopyModels', () => {
    it('returns default primary and fallback when env is not set', () => {
      const models = getAdCopyModels();
      expect(models.primary).toBe(AD_COPY_MODELS.primary);
      expect(models.fallback).toBe(AD_COPY_MODELS.fallback);
    });
  });

  describe('getVisionModels', () => {
    it('returns default primary and fallback when env is not set', () => {
      const models = getVisionModels();
      expect(models.primary).toBe(VISION_MODELS.primary);
      expect(models.fallback).toBe(VISION_MODELS.fallback);
    });
  });

  describe('pickModel', () => {
    it('returns first candidate that exists in available list', () => {
      const available = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'];
      expect(pickModel(available, 'openai/gpt-oss-120b', 'openai/gpt-oss-20b')).toBe(
        'openai/gpt-oss-120b'
      );
    });
    it('is case-insensitive', () => {
      const available = ['OpenAI/GPT-OSS-120B'];
      expect(pickModel(available, 'openai/gpt-oss-120b')).toBe('openai/gpt-oss-120b');
    });
    it('returns undefined when no candidate is available', () => {
      const available = ['other/model'];
      expect(pickModel(available, 'openai/gpt-oss-120b')).toBeUndefined();
    });
  });
});
