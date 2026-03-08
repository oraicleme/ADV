/**
 * Professional Ad Canvas Component
 * Supports all header/footer/layout/format combinations
 */

import React, { useRef, useEffect, useState } from 'react';
import { AdConfig, FORMAT_PRESETS, STYLE_PRESETS } from '@/lib/ad-config-schema';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';

interface ProfessionalAdCanvasProps {
  config: AdConfig;
  products?: Array<{
    id: string;
    name: string;
    price: number;
    image?: string;
    discount?: number;
  }>;
  onExport?: (canvas: HTMLCanvasElement) => void;
}

export const ProfessionalAdCanvas: React.FC<ProfessionalAdCanvasProps> = ({
  config,
  products = [],
  onExport,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const preset = FORMAT_PRESETS[config.format];
  const stylePreset = STYLE_PRESETS[config.style];

  // Calculate responsive scale
  useEffect(() => {
    if (canvasRef.current) {
      const containerWidth = canvasRef.current.parentElement?.clientWidth || 400;
      const calculatedScale = Math.min(containerWidth / preset.width, 1);
      setScale(calculatedScale);
    }
  }, [preset.width]);

  const renderHeader = () => {
    if (!config.header.enabled) return null;

    return (
      <div
        style={{
          backgroundColor: config.header.backgroundColor || stylePreset.primaryColor,
          color: config.header.textColor || '#FFFFFF',
          height: config.header.height,
          padding: config.header.padding,
          display: 'flex',
          alignItems: 'center',
          justifyContent: config.header.alignment || 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Logo */}
        {config.header.options.includes('logo') && config.header.logo?.url && (
          <img
            src={config.header.logo.url}
            alt="Logo"
            style={{
              width: config.header.logo.width || 40,
              height: config.header.logo.height || 40,
              objectFit: 'contain',
            }}
          />
        )}

        {/* Badge */}
        {config.header.options.includes('badge') && config.header.badge && (
          <div
            style={{
              backgroundColor: config.header.badge.backgroundColor || '#FF6B35',
              color: config.header.badge.textColor || '#FFFFFF',
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 'bold',
              textTransform: 'uppercase',
            }}
          >
            {config.header.badge.text}
          </div>
        )}

        {/* Discount */}
        {config.header.options.includes('discount') && config.header.discount && (
          <div
            style={{
              backgroundColor: config.header.discount.backgroundColor || '#FF6B35',
              color: '#FFFFFF',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 18,
              fontWeight: 'bold',
            }}
          >
            {config.header.discount.amount}
            {config.header.discount.unit}
          </div>
        )}

        {/* Tagline */}
        {config.header.options.includes('tagline') && config.header.tagline && (
          <div style={{ fontSize: 14, fontStyle: 'italic' }}>
            {config.header.tagline}
          </div>
        )}

        {/* Headline */}
        {config.header.options.includes('headline') && config.header.headline && (
          <div style={{ fontSize: 20, fontWeight: 'bold' }}>
            {config.header.headline}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    const contentProducts = products.filter(p =>
      config.content.products.ids.includes(p.id)
    );

    switch (config.content.layout) {
      case 'single-product':
        return renderSingleProduct(contentProducts[0]);
      case 'product-grid-2':
        return renderProductGrid(contentProducts, 2);
      case 'product-grid-3':
        return renderProductGrid(contentProducts, 3);
      case 'product-grid-4':
        return renderProductGrid(contentProducts, 4);
      case 'product-carousel':
        return renderProductCarousel(contentProducts);
      case 'product-with-specs':
        return renderProductWithSpecs(contentProducts[0]);
      case 'product-with-price':
        return renderProductWithPrice(contentProducts[0]);
      case 'hero-image':
        return renderHeroImage(contentProducts[0]);
      case 'text-focused':
        return renderTextFocused();
      default:
        return null;
    }
  };

  const renderSingleProduct = (product?: typeof products[0]) => {
    if (!product) return null;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: config.content.padding,
          backgroundColor: config.content.backgroundColor,
          gap: 16,
        }}
      >
        {config.content.products.showImage && product.image && (
          <img
            src={product.image}
            alt={product.name}
            style={{
              maxWidth: '100%',
              height: config.content.imageHeight || 300,
              objectFit: 'cover',
              borderRadius: config.content.borderRadius,
            }}
          />
        )}
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '8px 0', fontSize: 18, fontWeight: 'bold' }}>
            {product.name}
          </h3>
          {config.content.products.showPrice && (
            <div style={{ fontSize: 24, fontWeight: 'bold', color: config.primaryColor }}>
              ${product.price.toFixed(2)}
            </div>
          )}
          {config.content.products.showDiscount && product.discount && (
            <div style={{ fontSize: 14, color: '#FF6B35' }}>
              Save {product.discount}%
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProductGrid = (prods: typeof products, columns: number) => {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 12,
          padding: config.content.padding,
          backgroundColor: config.content.backgroundColor,
        }}
      >
        {prods.map(product => (
          <div key={product.id} style={{ textAlign: 'center' }}>
            {config.content.products.showImage && product.image && (
              <img
                src={product.image}
                alt={product.name}
                style={{
                  width: '100%',
                  height: 150,
                  objectFit: 'cover',
                  borderRadius: config.content.borderRadius,
                  marginBottom: 8,
                }}
              />
            )}
            <div style={{ fontSize: 12, fontWeight: 'bold' }}>{product.name}</div>
            {config.content.products.showPrice && (
              <div style={{ fontSize: 14, color: config.primaryColor, fontWeight: 'bold' }}>
                ${product.price.toFixed(2)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderProductCarousel = (prods: typeof products) => {
    return (
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 12,
          padding: config.content.padding,
          backgroundColor: config.content.backgroundColor,
        }}
      >
        {prods.map(product => (
          <div key={product.id} style={{ minWidth: 200, textAlign: 'center' }}>
            {config.content.products.showImage && product.image && (
              <img
                src={product.image}
                alt={product.name}
                style={{
                  width: '100%',
                  height: 200,
                  objectFit: 'cover',
                  borderRadius: config.content.borderRadius,
                  marginBottom: 8,
                }}
              />
            )}
            <div style={{ fontSize: 12, fontWeight: 'bold' }}>{product.name}</div>
            {config.content.products.showPrice && (
              <div style={{ fontSize: 14, color: config.primaryColor, fontWeight: 'bold' }}>
                ${product.price.toFixed(2)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderProductWithSpecs = (product?: typeof products[0]) => {
    if (!product) return null;

    return (
      <div
        style={{
          display: 'flex',
          gap: 16,
          padding: config.content.padding,
          backgroundColor: config.content.backgroundColor,
        }}
      >
        {config.content.products.showImage && product.image && (
          <img
            src={product.image}
            alt={product.name}
            style={{
              width: 200,
              height: 200,
              objectFit: 'cover',
              borderRadius: config.content.borderRadius,
            }}
          />
        )}
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 'bold', margin: '0 0 8px 0' }}>
            {product.name}
          </h3>
          {config.content.features && (
            <ul style={{ fontSize: 12, margin: '8px 0', paddingLeft: 16 }}>
              {config.content.features.map((feature, idx) => (
                <li key={idx}>{feature}</li>
              ))}
            </ul>
          )}
          {config.content.products.showPrice && (
            <div style={{ fontSize: 20, fontWeight: 'bold', color: config.primaryColor }}>
              ${product.price.toFixed(2)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProductWithPrice = (product?: typeof products[0]) => {
    if (!product) return null;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: config.content.padding,
          backgroundColor: config.content.backgroundColor,
          gap: 16,
        }}
      >
        {config.content.products.showImage && product.image && (
          <img
            src={product.image}
            alt={product.name}
            style={{
              maxWidth: '100%',
              height: config.content.imageHeight || 250,
              objectFit: 'cover',
              borderRadius: config.content.borderRadius,
            }}
          />
        )}
        <div
          style={{
            backgroundColor: config.accentColor || '#F7B801',
            color: '#000000',
            padding: 16,
            borderRadius: 8,
            textAlign: 'center',
            width: '100%',
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 'bold' }}>
            ${product.price.toFixed(2)}
          </div>
          <div style={{ fontSize: 12 }}>{product.name}</div>
        </div>
      </div>
    );
  };

  const renderHeroImage = (product?: typeof products[0]) => {
    if (!product?.image) return null;

    return (
      <div
        style={{
          backgroundImage: `url(${product.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: '#FFFFFF',
            padding: 32,
            borderRadius: 8,
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>
            {product.name}
          </h2>
          {config.content.products.showPrice && (
            <div style={{ fontSize: 24, fontWeight: 'bold', marginTop: 8 }}>
              ${product.price.toFixed(2)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTextFocused = () => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: config.content.padding,
          backgroundColor: config.content.backgroundColor,
          gap: 16,
          textAlign: 'center',
        }}
      >
        {config.content.title && (
          <h2 style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>
            {config.content.title}
          </h2>
        )}
        {config.content.description && (
          <p style={{ fontSize: 14, margin: 0 }}>
            {config.content.description}
          </p>
        )}
        {config.content.features && (
          <ul style={{ fontSize: 12, margin: '8px 0', paddingLeft: 16 }}>
            {config.content.features.map((feature, idx) => (
              <li key={idx}>{feature}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const renderFooter = () => {
    if (!config.footer.enabled) return null;

    return (
      <div
        style={{
          backgroundColor: config.footer.backgroundColor || STYLE_PRESETS[config.style].secondaryColor,
          color: config.footer.textColor || '#000000',
          height: config.footer.height,
          padding: config.footer.padding,
          display: 'flex',
          alignItems: 'center',
          justifyContent: config.footer.alignment || 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* CTA Button */}
        {config.footer.options.includes('cta-button') && config.footer.cta && (
          <button
            style={{
              backgroundColor: config.footer.cta.backgroundColor,
              color: config.footer.cta.textColor,
              border: 'none',
              padding: '12px 24px',
              borderRadius: config.footer.cta.borderRadius,
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {config.footer.cta.text}
          </button>
        )}

        {/* Contact Info */}
        {config.footer.options.includes('contact') && config.footer.contact && (
          <div style={{ fontSize: 12, display: 'flex', gap: 16 }}>
            {config.footer.contact.phone && <span>📞 {config.footer.contact.phone}</span>}
            {config.footer.contact.website && <span>🌐 {config.footer.contact.website}</span>}
          </div>
        )}

        {/* Social Icons */}
        {config.footer.options.includes('social') && config.footer.social && (
          <div style={{ display: 'flex', gap: 8 }}>
            {config.footer.social.facebook && <span>f</span>}
            {config.footer.social.instagram && <span>📷</span>}
            {config.footer.social.tiktok && <span>🎵</span>}
            {config.footer.social.whatsapp && <span>💬</span>}
          </div>
        )}

        {/* QR Code */}
        {config.footer.options.includes('qr-code') && config.footer.qrCode?.url && (
          <div style={{ width: config.footer.qrCode.size || 60 }}>
            <QRCodeSVG value={config.footer.qrCode.url} size={config.footer.qrCode.size || 60} />
          </div>
        )}

        {/* Trust Badges */}
        {config.footer.options.includes('trust-badges') && config.footer.trustBadges && (
          <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
            {config.footer.trustBadges.secure && <span>🔒 Secure</span>}
            {config.footer.trustBadges.certified && <span>✓ Certified</span>}
            {config.footer.trustBadges.verified && <span>✓ Verified</span>}
          </div>
        )}

        {/* Terms */}
        {config.footer.options.includes('terms') && config.footer.terms && (
          <div style={{ fontSize: 10, opacity: 0.7 }}>
            {config.footer.terms}
          </div>
        )}
      </div>
    );
  };

  const canvasHeight = (config.header.height || 120) + (config.footer.height || 100) + 400; // Approximate content height

  return (
    <Card className="w-full p-4">
      <div
        ref={canvasRef}
        style={{
          width: preset.width,
          height: canvasHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: config.fontFamily || 'Arial, sans-serif',
        }}
      >
        {renderHeader()}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {renderContent()}
        </div>
        {renderFooter()}
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <Button
          onClick={() => {
            if (canvasRef.current && onExport) {
              // Convert div to canvas and export
              onExport(canvasRef.current as any);
            }
          }}
        >
          Export as PNG
        </Button>
        <Button variant="outline">
          Export as HTML
        </Button>
      </div>
    </Card>
  );
};
