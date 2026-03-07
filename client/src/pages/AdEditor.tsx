import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Download, Save } from "lucide-react";
import ProductImport from "@/components/ProductImport";
import AssetUpload from "@/components/AssetUpload";
import AdPreview from "@/components/AdPreview";
import AIAssistant from "@/components/AIAssistant";

type LayoutType = "single-hero" | "grid-2-6" | "category-groups" | "sale-discount";
type FormatType = "viber-ig-story" | "instagram-post" | "facebook-ad" | "custom";

interface CTAButton {
  id: string;
  text: string;
}

export default function AdEditor() {
  // Ad configuration state
  const [headline, setHeadline] = useState("");
  const [badge, setBadge] = useState("");
  const [ctaButtons, setCtaButtons] = useState<CTAButton[]>([]);
  const [disclaimer, setDisclaimer] = useState("");
  const [layout, setLayout] = useState<LayoutType>("single-hero");
  const [format, setFormat] = useState<FormatType>("viber-ig-story");
  const [customWidth, setCustomWidth] = useState<number | undefined>();
  const [customHeight, setCustomHeight] = useState<number | undefined>();
  const [backgroundColor, setBackgroundColor] = useState("#f8fafc");
  const [accentColor, setAccentColor] = useState("#f97316");
  const [fontFamily, setFontFamily] = useState("System Sans");
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  // UI state
  const [ctaInput, setCtaInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Queries
  const { data: products } = trpc.products.list.useQuery();
  const { data: ads } = trpc.ads.list.useQuery();
  const saveAdMutation = trpc.ads.save.useMutation();

  const formatDimensions: Record<FormatType, { width: number; height: number }> = {
    "viber-ig-story": { width: 1080, height: 1920 },
    "instagram-post": { width: 1080, height: 1080 },
    "facebook-ad": { width: 1200, height: 628 },
    custom: { width: customWidth || 1080, height: customHeight || 1080 },
  };

  const colorPalette = [
    "#f8fafc", "#f1f5f9", "#ffffff", "#fef3c7", "#fecaca",
    "#bfdbfe", "#bbf7d0", "#e9d5ff", "#1e293b", "#000000",
    "#f97316", "#ef4444",
  ];

  const fontFamilies = ["System Sans", "Georgia Serif", "Courier Mono", "Impact Bold", "Verdana Clean"];

  const addCTAButton = () => {
    if (ctaInput.trim()) {
      setCtaButtons([...ctaButtons, { id: Date.now().toString(), text: ctaInput }]);
      setCtaInput("");
    }
  };

  const removeCTAButton = (id: string) => {
    setCtaButtons(ctaButtons.filter((btn) => btn.id !== id));
  };

  const handleSaveAd = async () => {
    setIsLoading(true);
    try {
      await saveAdMutation.mutateAsync({
        headline,
        badge,
        ctaButtons: JSON.stringify(ctaButtons),
        disclaimer,
        layout,
        format,
        customWidth,
        customHeight,
        backgroundColor,
        accentColor,
        fontFamily,
        logoUrl,
        productIds: JSON.stringify(selectedProductIds),
      });
      // Show success message
      alert("Ad saved successfully!");
    } catch (error) {
      console.error("Failed to save ad:", error);
      alert("Failed to save ad");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: "html" | "png" | "jpeg") => {
    // TODO: Implement export functionality
    alert(`Export as ${format} coming soon!`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen flex-col">
        {/* Header */}
        <div className="border-b bg-card p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Ad Designer</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleExport("html")}>
                <Download className="mr-2 h-4 w-4" /> Export HTML
              </Button>
              <Button variant="outline" onClick={() => handleExport("png")}>
                <Download className="mr-2 h-4 w-4" /> Export PNG
              </Button>
              <Button onClick={handleSaveAd} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Ad
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Controls */}
          <div className="w-80 overflow-y-auto border-r bg-card p-4">
            <Tabs defaultValue="design" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="design">Design</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="ai">AI</TabsTrigger>
              </TabsList>

              {/* Design Tab */}
              <TabsContent value="design" className="space-y-4">
                <div>
                  <Label>Headline</Label>
                  <Input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value.slice(0, 200))}
                    placeholder="Your headline…"
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{headline.length}/200</p>
                </div>

                <div>
                  <Label>Badge Text</Label>
                  <Input
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="e.g. 30% OFF"
                    maxLength={100}
                  />
                </div>

                <div>
                  <Label>CTA Buttons</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={ctaInput}
                      onChange={(e) => setCtaInput(e.target.value)}
                      placeholder="Button text"
                      onKeyPress={(e) => e.key === "Enter" && addCTAButton()}
                    />
                    <Button size="sm" onClick={addCTAButton}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {ctaButtons.map((btn) => (
                      <div key={btn.id} className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                        <span>{btn.text}</span>
                        <button onClick={() => removeCTAButton(btn.id)} className="text-destructive hover:text-destructive/80">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Disclaimer</Label>
                  <Input
                    value={disclaimer}
                    onChange={(e) => setDisclaimer(e.target.value)}
                    placeholder="Disclaimer / footer text (optional)"
                  />
                </div>

                <div>
                  <Label>Layout</Label>
                  <Select value={layout} onValueChange={(v) => setLayout(v as LayoutType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single-hero">Single Product Hero</SelectItem>
                      <SelectItem value="grid-2-6">Product Grid (2-6)</SelectItem>
                      <SelectItem value="category-groups">By Category</SelectItem>
                      <SelectItem value="sale-discount">Sale / Discount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Format</Label>
                  <Select value={format} onValueChange={(v) => setFormat(v as FormatType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viber-ig-story">Viber / IG Story (1080x1920)</SelectItem>
                      <SelectItem value="instagram-post">Instagram Post (1080x1080)</SelectItem>
                      <SelectItem value="facebook-ad">Facebook Ad (1200x628)</SelectItem>
                      <SelectItem value="custom">Custom Dimensions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {format === "custom" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Width</Label>
                      <Input
                        type="number"
                        value={customWidth || ""}
                        onChange={(e) => setCustomWidth(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="Width"
                      />
                    </div>
                    <div>
                      <Label>Height</Label>
                      <Input
                        type="number"
                        value={customHeight || ""}
                        onChange={(e) => setCustomHeight(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="Height"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label>Background Color</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {colorPalette.map((color) => (
                      <button
                        key={color}
                        className={`w-full aspect-square rounded border-2 ${
                          backgroundColor === color ? "border-foreground" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setBackgroundColor(color)}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Accent Color</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {colorPalette.map((color) => (
                      <button
                        key={color}
                        className={`w-full aspect-square rounded border-2 ${
                          accentColor === color ? "border-foreground" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setAccentColor(color)}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Font Family</Label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontFamilies.map((font) => (
                        <SelectItem key={font} value={font}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Products Tab */}
              <TabsContent value="products" className="space-y-4">
                <ProductImport onProductsImported={() => {}} />
                <div>
                  <Label>Select Products</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {products?.map((product) => (
                      <div key={product.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`product-${product.id}`}
                          checked={selectedProductIds.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProductIds([...selectedProductIds, product.id]);
                            } else {
                              setSelectedProductIds(selectedProductIds.filter((id) => id !== product.id));
                            }
                          }}
                        />
                        <label htmlFor={`product-${product.id}`} className="text-sm cursor-pointer flex-1">
                          {product.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <AssetUpload onAssetUploaded={(url: string) => setLogoUrl(url)} />
              </TabsContent>

              {/* AI Tab */}
              <TabsContent value="ai">
                <AIAssistant onDesignGenerated={(design: Record<string, unknown>) => {
                  // TODO: Apply AI-generated design to current ad
                  console.log("AI design:", design);
                }} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Center - Preview */}
          <div className="flex-1 overflow-auto bg-muted p-4">
            <div className="flex items-center justify-center min-h-full">
              <AdPreview
                headline={headline}
                badge={badge}
                ctaButtons={ctaButtons}
                disclaimer={disclaimer}
                layout={layout}
                format={format}
                backgroundColor={backgroundColor}
                accentColor={accentColor}
                fontFamily={fontFamily}
                logoUrl={logoUrl}
                products={products?.filter((p) => selectedProductIds.includes(p.id)) || []}
                dimensions={formatDimensions[format]}
              />
            </div>
          </div>

          {/* Right Sidebar - AI Assistant */}
          <div className="w-80 border-l bg-card p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4">Ad History</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {ads?.map((ad) => (
                <Card key={ad.id} className="p-2 text-sm cursor-pointer hover:bg-muted">
                  <p className="font-medium truncate">{ad.headline || "Untitled"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(ad.createdAt).toLocaleDateString()}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
