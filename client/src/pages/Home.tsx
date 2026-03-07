import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Upload, Zap, Share2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-orange-500" />
            <h1 className="text-2xl font-bold">Oraicle</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <p className="text-sm text-muted-foreground">{user?.name || user?.email}</p>
                <Button onClick={() => navigate("/editor")} size="lg">
                  Open Editor
                </Button>
              </>
            ) : (
              <Button onClick={() => (window.location.href = getLoginUrl())} size="lg">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center space-y-6">
          <h2 className="text-5xl font-bold tracking-tight">
            Create Professional Ads in Minutes
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your product data and logos into stunning promotional ads for any platform using AI-powered design.
          </p>
          {isAuthenticated ? (
            <Button onClick={() => navigate("/editor")} size="lg" className="text-lg h-12 px-8">
              Start Creating Ads
            </Button>
          ) : (
            <Button onClick={() => (window.location.href = getLoginUrl())} size="lg" className="text-lg h-12 px-8">
              Get Started Free
            </Button>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">Powerful Features</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 space-y-4">
            <Upload className="h-8 w-8 text-orange-500" />
            <h4 className="font-semibold">Easy Import</h4>
            <p className="text-sm text-muted-foreground">
              Upload products from Excel, CSV, or paste text data directly
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <Zap className="h-8 w-8 text-orange-500" />
            <h4 className="font-semibold">AI Design</h4>
            <p className="text-sm text-muted-foreground">
              Get intelligent design suggestions powered by advanced AI models
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <Sparkles className="h-8 w-8 text-orange-500" />
            <h4 className="font-semibold">Multi-Format</h4>
            <p className="text-sm text-muted-foreground">
              Export for Viber, Instagram, Facebook, and custom dimensions
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <Share2 className="h-8 w-8 text-orange-500" />
            <h4 className="font-semibold">Share & Save</h4>
            <p className="text-sm text-muted-foreground">
              Save your creatives and share via public URLs
            </p>
          </Card>
        </div>
      </section>

      {/* Supported Formats */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">Supported Ad Formats</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { name: "Viber / IG Story", dims: "1080 × 1920" },
            { name: "Instagram Post", dims: "1080 × 1080" },
            { name: "Facebook Ad", dims: "1200 × 628" },
            { name: "Custom Size", dims: "Any dimensions" },
          ].map((format) => (
            <Card key={format.name} className="p-6 text-center">
              <p className="font-semibold">{format.name}</p>
              <p className="text-sm text-muted-foreground">{format.dims}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h3 className="text-3xl font-bold mb-6">Ready to Create?</h3>
        <p className="text-lg text-muted-foreground mb-8">
          Start designing professional ads for your products today
        </p>
        {isAuthenticated ? (
          <Button onClick={() => navigate("/editor")} size="lg" className="text-lg h-12 px-8">
            Open Ad Designer
          </Button>
        ) : (
          <Button onClick={() => (window.location.href = getLoginUrl())} size="lg" className="text-lg h-12 px-8">
            Sign In to Start
          </Button>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/50 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 Oraicle. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
