import React, { useState } from 'react';
import { ChevronDown, Plus, Trash2, Globe, Mail, Phone, MapPin, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

export interface CompanyInfo {
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  ctaButtonText?: string;
  ctaButtonUrl?: string;
  trustBadges?: string[];
  disclaimerText?: string;
}

interface CompanyInfoPanelProps {
  companyInfo: CompanyInfo;
  onCompanyInfoChange: (info: CompanyInfo) => void;
  isExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
}

const SOCIAL_ICONS = [
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'twitter', label: 'Twitter', Icon: Twitter },
  { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
] as const;

const TRUST_BADGE_OPTIONS = [
  '✓ Verified',
  '🔒 Secure',
  '⭐ Trusted',
  '🏆 Award Winner',
  '📱 Mobile Friendly',
  '💯 100% Authentic',
];

export function CompanyInfoPanel({
  companyInfo,
  onCompanyInfoChange,
  isExpanded = true,
  onToggleExpand,
}: CompanyInfoPanelProps) {
  const [socialInput, setSocialInput] = useState('');

  const handleFieldChange = (field: keyof CompanyInfo, value: any) => {
    onCompanyInfoChange({
      ...companyInfo,
      [field]: value,
    });
  };

  const handleSocialChange = (platform: string, value: string) => {
    onCompanyInfoChange({
      ...companyInfo,
      socialLinks: {
        ...companyInfo.socialLinks,
        [platform]: value || undefined,
      },
    });
  };

  const handleAddTrustBadge = (badge: string) => {
    const current = companyInfo.trustBadges || [];
    if (!current.includes(badge)) {
      onCompanyInfoChange({
        ...companyInfo,
        trustBadges: [...current, badge],
      });
    }
  };

  const handleRemoveTrustBadge = (badge: string) => {
    onCompanyInfoChange({
      ...companyInfo,
      trustBadges: (companyInfo.trustBadges || []).filter((b) => b !== badge),
    });
  };

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-white/5">
      {/* Header */}
      <button
        onClick={() => onToggleExpand?.(!isExpanded)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/10 transition"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white text-sm font-bold">
            4
          </div>
          <span className="font-semibold text-white">Company Info & Footer</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-4 space-y-6 border-t border-white/10">
          {/* Company Name */}
          <div>
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide block mb-2">
              Company Name
            </label>
            <Input
              value={companyInfo.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Your company name"
              className="bg-white/5 border-white/10"
            />
          </div>

          {/* Contact Information */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide block">
              Contact Information
            </label>

            {/* Phone */}
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500 shrink-0" />
              <Input
                value={companyInfo.phone || ''}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                placeholder="Phone number"
                className="bg-white/5 border-white/10 text-sm"
              />
            </div>

            {/* Email */}
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500 shrink-0" />
              <Input
                value={companyInfo.email || ''}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="Email address"
                className="bg-white/5 border-white/10 text-sm"
                type="email"
              />
            </div>

            {/* Website */}
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500 shrink-0" />
              <Input
                value={companyInfo.website || ''}
                onChange={(e) => handleFieldChange('website', e.target.value)}
                placeholder="https://yoursite.com"
                className="bg-white/5 border-white/10 text-sm"
              />
            </div>

            {/* Address */}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
              <Input
                value={companyInfo.address || ''}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                placeholder="Street address"
                className="bg-white/5 border-white/10 text-sm"
              />
            </div>
          </div>

          {/* Social Media Links */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide block">
              Social Media
            </label>
            {SOCIAL_ICONS.map(({ key, label, Icon }) => (
              <div key={key} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                <Input
                  value={companyInfo.socialLinks?.[key as keyof typeof companyInfo.socialLinks] || ''}
                  onChange={(e) => handleSocialChange(key, e.target.value)}
                  placeholder={`${label} URL`}
                  className="bg-white/5 border-white/10 text-sm"
                />
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide block">
              CTA Button
            </label>
            <Input
              value={companyInfo.ctaButtonText || ''}
              onChange={(e) => handleFieldChange('ctaButtonText', e.target.value)}
              placeholder="Button text (e.g., Shop Now)"
              className="bg-white/5 border-white/10 text-sm"
            />
            <Input
              value={companyInfo.ctaButtonUrl || ''}
              onChange={(e) => handleFieldChange('ctaButtonUrl', e.target.value)}
              placeholder="Button URL"
              className="bg-white/5 border-white/10 text-sm"
            />
          </div>

          {/* Trust Badges */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide block">
              Trust Badges
            </label>
            <div className="space-y-2">
              {/* Selected Badges */}
              {((companyInfo.trustBadges ?? []).length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {(companyInfo.trustBadges ?? []).map((badge) => (
                    <div
                      key={badge}
                      className="flex items-center gap-2 px-2 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-xs text-orange-300"
                    >
                      <span>{badge}</span>
                      <button
                        onClick={() => handleRemoveTrustBadge(badge)}
                        className="hover:text-orange-200 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Available Badges */}
              <div className="space-y-2">
                {TRUST_BADGE_OPTIONS.map((badge) => (
                  <button
                    key={badge}
                    onClick={() => handleAddTrustBadge(badge)}
                    disabled={(companyInfo.trustBadges ?? []).includes(badge)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm text-left"
                  >
                    <Plus className="w-3 h-3" />
                    {badge}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div>
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide block mb-2">
              Disclaimer Text
            </label>
            <textarea
              value={companyInfo.disclaimerText || ''}
              onChange={(e) => handleFieldChange('disclaimerText', e.target.value)}
              placeholder="Terms, conditions, or disclaimer text..."
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 resize-none"
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  );
}
