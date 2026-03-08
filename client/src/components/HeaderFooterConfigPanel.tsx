/**
 * Unified Header/Footer Configuration Panel
 * Left panel for users to configure and manage header/footer templates
 */

import React, { useState } from 'react';
import { HeaderConfig, FooterConfig, HeaderOption, FooterOption } from '@/lib/ad-config-schema';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Upload, Save, Copy, Trash2, Plus } from 'lucide-react';

interface HeaderFooterConfigPanelProps {
  header: HeaderConfig;
  footer: FooterConfig;
  onHeaderChange: (header: HeaderConfig) => void;
  onFooterChange: (footer: FooterConfig) => void;
  onSaveTemplate?: (name: string, type: 'header' | 'footer') => void;
  onLoadTemplate?: (templateId: string, type: 'header' | 'footer') => void;
  templates?: Array<{ id: string; name: string; type: 'header' | 'footer'; config: any }>;
}

export const HeaderFooterConfigPanel: React.FC<HeaderFooterConfigPanelProps> = ({
  header,
  footer,
  onHeaderChange,
  onFooterChange,
  onSaveTemplate,
  onLoadTemplate,
  templates = [],
}) => {
  const [activeTab, setActiveTab] = useState<'header' | 'footer'>('header');
  const [templateName, setTemplateName] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Header Options
  const headerOptions: { value: HeaderOption; label: string; icon: string }[] = [
    { value: 'logo', label: 'Logo', icon: '🏢' },
    { value: 'badge', label: 'Badge', icon: '🏷️' },
    { value: 'discount', label: 'Discount', icon: '💰' },
    { value: 'tagline', label: 'Tagline', icon: '✨' },
    { value: 'headline', label: 'Headline', icon: '📝' },
  ];

  // Footer Options
  const footerOptions: { value: FooterOption; label: string; icon: string }[] = [
    { value: 'cta-button', label: 'CTA Button', icon: '🔘' },
    { value: 'contact', label: 'Contact', icon: '📞' },
    { value: 'social', label: 'Social', icon: '📱' },
    { value: 'qr-code', label: 'QR Code', icon: '📲' },
    { value: 'trust-badges', label: 'Trust Badges', icon: '✓' },
    { value: 'terms', label: 'Terms', icon: '⚖️' },
  ];

  const handleHeaderOptionToggle = (option: HeaderOption) => {
    const newOptions = header.options.includes(option)
      ? header.options.filter(o => o !== option)
      : [...header.options, option];
    onHeaderChange({ ...header, options: newOptions });
  };

  const handleFooterOptionToggle = (option: FooterOption) => {
    const newOptions = footer.options.includes(option)
      ? footer.options.filter(o => o !== option)
      : [...footer.options, option];
    onFooterChange({ ...footer, options: newOptions });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setLogoPreview(url);
        onHeaderChange({
          ...header,
          logo: { ...header.logo, url },
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const renderHeaderConfig = () => (
    <div className="space-y-6">
      {/* Header Options */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Header Elements</h3>
        <div className="space-y-2">
          {headerOptions.map(option => (
            <label key={option.value} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={header.options.includes(option.value)}
                onChange={() => handleHeaderOptionToggle(option.value)}
                className="w-4 h-4"
              />
              <span className="text-sm">{option.icon} {option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Logo Upload */}
      {header.options.includes('logo') && (
        <div>
          <label className="text-sm font-semibold block mb-2">Upload Logo</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            {logoPreview ? (
              <div className="space-y-2">
                <img src={logoPreview} alt="Logo preview" className="h-12 mx-auto" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Change Logo
                </Button>
              </div>
            ) : (
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Logo
                </Button>
              </div>
            )}
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Badge */}
      {header.options.includes('badge') && (
        <div>
          <label className="text-sm font-semibold block mb-2">Badge Text</label>
          <Input
            value={header.badge?.text || ''}
            onChange={(e) =>
              onHeaderChange({
                ...header,
                badge: { ...header.badge, text: e.target.value },
              })
            }
            placeholder="e.g., LIMITED TIME OFFER"
          />
        </div>
      )}

      {/* Discount */}
      {header.options.includes('discount') && (
        <div>
          <label className="text-sm font-semibold block mb-2">Discount</label>
          <div className="flex gap-2">
            <Input
              value={(header.discount?.amount || 0).toString()}
              onChange={(e) =>
                onHeaderChange({
                  ...header,
                  discount: { ...header.discount, amount: parseInt(e.target.value) },
                })
              }
              placeholder="Amount"
              className="flex-1"
            />
            <select
              value={header.discount?.unit || '%'}
              onChange={(e) =>
                onHeaderChange({
                  ...header,
                  discount: { ...header.discount, unit: e.target.value as '%' | '$' | 'fixed' },
                })
              }
              className="px-3 border rounded"
            >
              <option value="%">%</option>
              <option value="$">$</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
        </div>
      )}

      {/* Tagline */}
      {header.options.includes('tagline') && (
        <div>
          <label className="text-sm font-semibold block mb-2">Tagline</label>
            <Input
              value={header.tagline || ''}
              onChange={(e) => onHeaderChange({ ...header, tagline: e.target.value as string })}
              placeholder="e.g., Premium Quality"
            />
        </div>
      )}

      {/* Headline */}
      {header.options.includes('headline') && (
        <div>
          <label className="text-sm font-semibold block mb-2">Headline</label>
            <Input
              value={header.headline || ''}
              onChange={(e) => onHeaderChange({ ...header, headline: e.target.value as string })}
              placeholder="e.g., Best Deals Ever"
            />
        </div>
      )}

      {/* Colors */}
      <div>
        <label className="text-sm font-semibold block mb-2">Colors</label>
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <label className="text-xs w-24">Background</label>
            <input
              type="color"
              value={header.backgroundColor || '#FF6B35'}
              onChange={(e) => onHeaderChange({ ...header, backgroundColor: e.target.value })}
              className="w-12 h-8 rounded cursor-pointer"
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs w-24">Text</label>
            <input
              type="color"
              value={header.textColor || '#FFFFFF'}
              onChange={(e) => onHeaderChange({ ...header, textColor: e.target.value })}
              className="w-12 h-8 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Height & Padding */}
      <div>
        <label className="text-sm font-semibold block mb-2">Dimensions</label>
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <label className="text-xs w-24">Height (px)</label>
            <Input
              type="number"
              value={(header.height || 120).toString()}
              onChange={(e) => onHeaderChange({ ...header, height: parseInt(e.target.value) })}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs w-24">Padding (px)</label>
            <Input
              type="number"
              value={(header.padding || 16).toString()}
              onChange={(e) => onHeaderChange({ ...header, padding: parseInt(e.target.value) })}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Save Template */}
      <div className="pt-4 border-t">
        <div className="flex gap-2 mb-2">
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name"
            className="text-sm"
          />
          <Button
            size="sm"
            onClick={() => {
              if (templateName && onSaveTemplate) {
                onSaveTemplate(templateName, 'header');
                setTemplateName('');
              }
            }}
          >
            <Save className="w-4 h-4" />
          </Button>
        </div>

        {/* Saved Templates */}
        {templates.filter(t => t.type === 'header').length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold">Saved Templates</p>
            {templates
              .filter(t => t.type === 'header')
              .map(template => (
                <div key={template.id} className="flex gap-1 items-center text-xs">
                  <Badge variant="outline">{template.name}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onLoadTemplate?.(template.id, 'header')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderFooterConfig = () => (
    <div className="space-y-6">
      {/* Footer Options */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Footer Elements</h3>
        <div className="space-y-2">
          {footerOptions.map(option => (
            <label key={option.value} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={footer.options.includes(option.value)}
                onChange={() => handleFooterOptionToggle(option.value)}
                className="w-4 h-4"
              />
              <span className="text-sm">{option.icon} {option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* CTA Button */}
      {footer.options.includes('cta-button') && (
        <div>
          <label className="text-sm font-semibold block mb-2">CTA Button</label>
          <div className="space-y-2">
            <Input
              value={footer.cta?.text || ''}
              onChange={(e) =>
                onFooterChange({
                  ...footer,
                  cta: { ...footer.cta, text: e.target.value as string },
                })
              }
              placeholder="Button text (e.g., Shop Now)"
            />
            <Input
              value={footer.cta?.url || ''}
              onChange={(e) =>
                onFooterChange({
                  ...footer,
                  cta: { ...footer.cta, url: e.target.value },
                })
              }
              placeholder="Button URL"
            />
          </div>
        </div>
      )}

      {/* Contact */}
      {footer.options.includes('contact') && (
        <div>
          <label className="text-sm font-semibold block mb-2">Contact Info</label>
          <div className="space-y-2">
            <Input
              value={footer.contact?.phone || ''}
              onChange={(e) =>
                onFooterChange({
                  ...footer,
                  contact: { ...footer.contact, phone: e.target.value as string },
                })
              }
              placeholder="Phone"
            />
            <Input
              value={footer.contact?.website || ''}
              onChange={(e) =>
                onFooterChange({
                  ...footer,
                  contact: { ...footer.contact, website: e.target.value as string },
                })
              }
              placeholder="Website"
            />
            <Input
              value={footer.contact?.address || ''}
              onChange={(e) =>
                onFooterChange({
                  ...footer,
                  contact: { ...footer.contact, address: e.target.value as string },
                })
              }
              placeholder="Address"
            />
          </div>
        </div>
      )}

      {/* Social */}
      {footer.options.includes('social') && (
        <div>
          <label className="text-sm font-semibold block mb-2">Social Media</label>
          <div className="space-y-2">
            <Input
              value={footer.social?.facebook || ''}
              onChange={(e) =>
                onFooterChange({
                  ...footer,
                  social: { ...footer.social, facebook: e.target.value },
                })
              }
              placeholder="Facebook URL"
            />
            <Input
              value={footer.social?.instagram || ''}
              onChange={(e) =>
                onFooterChange({
                  ...footer,
                  social: { ...footer.social, instagram: e.target.value },
                })
              }
              placeholder="Instagram URL"
            />
            <Input
              value={footer.social?.tiktok || ''}
              onChange={(e) =>
                onFooterChange({
                  ...footer,
                  social: { ...footer.social, tiktok: e.target.value },
                })
              }
              placeholder="TikTok URL"
            />
          </div>
        </div>
      )}

      {/* QR Code */}
      {footer.options.includes('qr-code') && (
        <div>
          <label className="text-sm font-semibold block mb-2">QR Code URL</label>
          <Input
            value={footer.qrCode?.url || ''}
            onChange={(e) =>
              onFooterChange({
                ...footer,
                qrCode: { ...footer.qrCode, url: e.target.value },
              })
            }
            placeholder="https://example.com"
          />
        </div>
      )}

      {/* Trust Badges */}
      {footer.options.includes('trust-badges') && (
        <div>
          <label className="text-sm font-semibold block mb-2">Trust Badges</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={footer.trustBadges?.secure || false}
                onChange={(e) =>
                  onFooterChange({
                    ...footer,
                    trustBadges: { ...footer.trustBadges, secure: e.target.checked },
                  })
                }
                className="w-4 h-4"
              />
              <span className="text-sm">🔒 Secure</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={footer.trustBadges?.certified || false}
                onChange={(e) =>
                  onFooterChange({
                    ...footer,
                    trustBadges: { ...footer.trustBadges, certified: e.target.checked },
                  })
                }
                className="w-4 h-4"
              />
              <span className="text-sm">✓ Certified</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={footer.trustBadges?.verified || false}
                onChange={(e) =>
                  onFooterChange({
                    ...footer,
                    trustBadges: { ...footer.trustBadges, verified: e.target.checked },
                  })
                }
                className="w-4 h-4"
              />
              <span className="text-sm">✓ Verified</span>
            </label>
          </div>
        </div>
      )}

      {/* Colors */}
      <div>
        <label className="text-sm font-semibold block mb-2">Colors</label>
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <label className="text-xs w-24">Background</label>
            <input
              type="color"
              value={footer.backgroundColor || '#004E89'}
              onChange={(e) => onFooterChange({ ...footer, backgroundColor: e.target.value })}
              className="w-12 h-8 rounded cursor-pointer"
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs w-24">Text</label>
            <input
              type="color"
              value={footer.textColor || '#FFFFFF'}
              onChange={(e) => onFooterChange({ ...footer, textColor: e.target.value })}
              className="w-12 h-8 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Height & Padding */}
      <div>
        <label className="text-sm font-semibold block mb-2">Dimensions</label>
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <label className="text-xs w-24">Height (px)</label>
            <Input
              type="number"
              value={(footer.height || 100).toString()}
              onChange={(e) => onFooterChange({ ...footer, height: parseInt(e.target.value) })}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs w-24">Padding (px)</label>
            <Input
              type="number"
              value={(footer.padding || 16).toString()}
              onChange={(e) => onFooterChange({ ...footer, padding: parseInt(e.target.value) })}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Save Template */}
      <div className="pt-4 border-t">
        <div className="flex gap-2 mb-2">
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name"
            className="text-sm"
          />
          <Button
            size="sm"
            onClick={() => {
              if (templateName && onSaveTemplate) {
                onSaveTemplate(templateName, 'footer');
                setTemplateName('');
              }
            }}
          >
            <Save className="w-4 h-4" />
          </Button>
        </div>

        {/* Saved Templates */}
        {templates.filter(t => t.type === 'footer').length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold">Saved Templates</p>
            {templates
              .filter(t => t.type === 'footer')
              .map(template => (
                <div key={template.id} className="flex gap-1 items-center text-xs">
                  <Badge variant="outline">{template.name}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onLoadTemplate?.(template.id, 'footer')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card className="w-full h-full p-4 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Header & Footer</h2>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'header' | 'footer')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="header">Header</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
        </TabsList>

        <TabsContent value="header" className="mt-4">
          {renderHeaderConfig()}
        </TabsContent>

        <TabsContent value="footer" className="mt-4">
          {renderFooterConfig()}
        </TabsContent>
      </Tabs>
    </Card>
  );
};
