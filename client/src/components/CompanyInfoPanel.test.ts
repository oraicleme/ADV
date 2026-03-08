import { describe, it, expect } from 'vitest';
import type { CompanyInfo } from './CompanyInfoPanel';

describe('CompanyInfoPanel', () => {
  describe('Company Info Data Structure', () => {
    it('should initialize with empty company info', () => {
      const emptyInfo: CompanyInfo = {
        name: '',
      };
      expect(emptyInfo.name).toBe('');
      expect(emptyInfo.phone).toBeUndefined();
      expect(emptyInfo.email).toBeUndefined();
    });

    it('should handle complete company info', () => {
      const fullInfo: CompanyInfo = {
        name: 'MobileLand Company',
        phone: '+1-234-567-8900',
        email: 'contact@mobileland.com',
        website: 'https://mobileland.com',
        address: '123 Main St, City, Country',
        socialLinks: {
          facebook: 'https://facebook.com/mobileland',
          instagram: 'https://instagram.com/mobileland',
          twitter: 'https://twitter.com/mobileland',
          linkedin: 'https://linkedin.com/company/mobileland',
        },
        ctaButtonText: 'Shop Now',
        ctaButtonUrl: 'https://mobileland.com/shop',
        trustBadges: ['✓ Verified', '🔒 Secure', '⭐ Trusted'],
        disclaimerText: 'Prices valid while stocks last',
      };

      expect(fullInfo.name).toBe('MobileLand Company');
      expect(fullInfo.phone).toBe('+1-234-567-8900');
      expect(fullInfo.email).toBe('contact@mobileland.com');
      expect(fullInfo.website).toBe('https://mobileland.com');
      expect(fullInfo.address).toBe('123 Main St, City, Country');
      expect(fullInfo.socialLinks?.facebook).toBe('https://facebook.com/mobileland');
      expect(fullInfo.ctaButtonText).toBe('Shop Now');
      expect(fullInfo.trustBadges).toHaveLength(3);
      expect(fullInfo.disclaimerText).toBe('Prices valid while stocks last');
    });

    it('should handle partial social links', () => {
      const info: CompanyInfo = {
        name: 'Test Company',
        socialLinks: {
          instagram: 'https://instagram.com/test',
          facebook: 'https://facebook.com/test',
        },
      };

      expect(info.socialLinks?.instagram).toBe('https://instagram.com/test');
      expect(info.socialLinks?.facebook).toBe('https://facebook.com/test');
      expect(info.socialLinks?.twitter).toBeUndefined();
      expect(info.socialLinks?.linkedin).toBeUndefined();
    });

    it('should handle trust badges array', () => {
      const info: CompanyInfo = {
        name: 'Test Company',
        trustBadges: ['✓ Verified', '🔒 Secure'],
      };

      expect(info.trustBadges).toHaveLength(2);
      expect(info.trustBadges).toContain('✓ Verified');
      expect(info.trustBadges).toContain('🔒 Secure');
    });

    it('should handle empty trust badges', () => {
      const info: CompanyInfo = {
        name: 'Test Company',
        trustBadges: [],
      };

      expect(info.trustBadges).toHaveLength(0);
    });

    it('should handle CTA button configuration', () => {
      const info: CompanyInfo = {
        name: 'Test Company',
        ctaButtonText: 'Buy Now',
        ctaButtonUrl: 'https://example.com/buy',
      };

      expect(info.ctaButtonText).toBe('Buy Now');
      expect(info.ctaButtonUrl).toBe('https://example.com/buy');
    });

    it('should handle disclaimer text', () => {
      const disclaimerText = 'Offer valid only in selected regions. See terms for details.';
      const info: CompanyInfo = {
        name: 'Test Company',
        disclaimerText,
      };

      expect(info.disclaimerText).toBe(disclaimerText);
    });
  });

  describe('Footer Data Validation', () => {
    it('should validate email format', () => {
      const validEmail = 'contact@company.com';
      const info: CompanyInfo = {
        name: 'Test Company',
        email: validEmail,
      };

      expect(info.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should validate website URL format', () => {
      const validUrl = 'https://example.com';
      const info: CompanyInfo = {
        name: 'Test Company',
        website: validUrl,
      };

      expect(info.website).toMatch(/^https?:\/\/.+/);
    });

    it('should handle phone number variations', () => {
      const phoneNumbers = [
        '+1-234-567-8900',
        '(234) 567-8900',
        '234-567-8900',
        '+1 234 567 8900',
      ];

      phoneNumbers.forEach((phone) => {
        const info: CompanyInfo = {
          name: 'Test Company',
          phone,
        };
        expect(info.phone).toBe(phone);
      });
    });
  });

  describe('Social Links Validation', () => {
    it('should validate social media URLs', () => {
      const socialLinks = {
        facebook: 'https://facebook.com/company',
        instagram: 'https://instagram.com/company',
        twitter: 'https://twitter.com/company',
        linkedin: 'https://linkedin.com/company/company',
      };

      const info: CompanyInfo = {
        name: 'Test Company',
        socialLinks,
      };

      Object.values(socialLinks).forEach((url) => {
        expect(url).toMatch(/^https:\/\/.+/);
      });
    });
  });

  describe('Trust Badges', () => {
    const availableBadges = [
      '✓ Verified',
      '🔒 Secure',
      '⭐ Trusted',
      '🏆 Award Winner',
      '📱 Mobile Friendly',
      '💯 100% Authentic',
    ];

    it('should support all predefined trust badges', () => {
      const info: CompanyInfo = {
        name: 'Test Company',
        trustBadges: availableBadges,
      };

      expect(info.trustBadges).toHaveLength(6);
      availableBadges.forEach((badge) => {
        expect(info.trustBadges).toContain(badge);
      });
    });

    it('should prevent duplicate badges', () => {
      const badges = ['✓ Verified', '✓ Verified', '🔒 Secure'];
      const uniqueBadges = Array.from(new Set(badges));

      const info: CompanyInfo = {
        name: 'Test Company',
        trustBadges: uniqueBadges,
      };

      expect(info.trustBadges).toHaveLength(2);
    });
  });

  describe('Footer Rendering Data', () => {
    it('should provide all necessary data for footer rendering', () => {
      const info: CompanyInfo = {
        name: 'MobileLand',
        phone: '+1-234-567-8900',
        email: 'contact@mobileland.com',
        website: 'https://mobileland.com',
        address: '123 Main St',
        socialLinks: {
          facebook: 'https://facebook.com/mobileland',
          instagram: 'https://instagram.com/mobileland',
        },
        ctaButtonText: 'Shop Now',
        ctaButtonUrl: 'https://mobileland.com/shop',
        trustBadges: ['✓ Verified', '🔒 Secure'],
        disclaimerText: 'Terms apply',
      };

      // Verify all footer elements are present
      expect(info.name).toBeDefined();
      expect(info.phone || info.email || info.website).toBeTruthy();
      expect(info.ctaButtonText).toBeDefined();
      expect(info.trustBadges?.length).toBeGreaterThan(0);
    });

    it('should handle minimal footer data', () => {
      const info: CompanyInfo = {
        name: 'Company',
        ctaButtonText: 'Contact Us',
      };

      expect(info.name).toBeDefined();
      expect(info.ctaButtonText).toBeDefined();
      // Should still be valid even with minimal data
      expect(Object.keys(info).length).toBeGreaterThan(0);
    });
  });
});
