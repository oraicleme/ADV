import { Product } from "@shared/types";

interface CTAButton {
  id: string;
  text: string;
}

interface AdPreviewProps {
  headline: string;
  badge: string;
  ctaButtons: CTAButton[];
  disclaimer: string;
  layout: "single-hero" | "grid-2-6" | "category-groups" | "sale-discount";
  format: "viber-ig-story" | "instagram-post" | "facebook-ad" | "custom";
  backgroundColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl?: string;
  products: Product[];
  dimensions: { width: number; height: number };
}

export default function AdPreview({
  headline,
  badge,
  ctaButtons,
  disclaimer,
  layout,
  backgroundColor,
  accentColor,
  fontFamily,
  logoUrl,
  products,
  dimensions,
}: AdPreviewProps) {
  const fontFamilyMap: Record<string, string> = {
    "System Sans": "system-ui, -apple-system, sans-serif",
    "Georgia Serif": "Georgia, serif",
    "Courier Mono": "Courier New, monospace",
    "Impact Bold": "Impact, sans-serif",
    "Verdana Clean": "Verdana, sans-serif",
  };

  const scale = Math.min(400 / dimensions.width, 600 / dimensions.height);

  return (
    <div
      className="relative overflow-hidden rounded-lg shadow-2xl"
      style={{
        width: dimensions.width * scale,
        height: dimensions.height * scale,
        backgroundColor,
        fontFamily: fontFamilyMap[fontFamily],
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      {/* Background */}
      <div className="absolute inset-0" style={{ backgroundColor }} />

      {/* Content */}
      <div className="relative h-full flex flex-col p-6 text-foreground">
        {/* Logo */}
        {logoUrl && (
          <div className="mb-4">
            <img src={logoUrl} alt="Logo" className="h-12 object-contain" />
          </div>
        )}

        {/* Headline */}
        {headline && (
          <h1
            className="text-3xl font-bold mb-4 line-clamp-3"
            style={{ color: accentColor }}
          >
            {headline}
          </h1>
        )}

        {/* Badge */}
        {badge && (
          <div
            className="inline-block px-4 py-2 rounded-full text-white font-bold mb-4 w-fit"
            style={{ backgroundColor: accentColor }}
          >
            {badge}
          </div>
        )}

        {/* Products Grid */}
        {products.length > 0 && (
          <div className="mb-4 flex-1 overflow-hidden">
            {layout === "single-hero" && products[0] && (
              <div className="flex items-center justify-center h-full">
                {products[0].photoUrl && (
                  <img
                    src={products[0].photoUrl}
                    alt={products[0].name}
                    className="max-h-48 max-w-full object-contain"
                  />
                )}
              </div>
            )}

            {layout === "grid-2-6" && (
              <div className="grid grid-cols-2 gap-2 h-full">
                {products.slice(0, 6).map((product) => (
                  <div key={product.id} className="flex flex-col items-center justify-center bg-white/10 rounded p-2">
                    {product.photoUrl && (
                      <img
                        src={product.photoUrl}
                        alt={product.name}
                        className="h-16 object-contain mb-1"
                      />
                    )}
                    <p className="text-xs text-center line-clamp-2">{product.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CTA Buttons */}
        {ctaButtons.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {ctaButtons.map((btn) => (
              <button
                key={btn.id}
                className="px-4 py-2 rounded font-bold text-white"
                style={{ backgroundColor: accentColor }}
              >
                {btn.text}
              </button>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        {disclaimer && (
          <p className="text-xs text-muted-foreground mt-auto">{disclaimer}</p>
        )}
      </div>

      {/* Placeholder if no content */}
      {!headline && !badge && ctaButtons.length === 0 && products.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <p className="text-center">Your ad will appear here.</p>
        </div>
      )}
    </div>
  );
}
