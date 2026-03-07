import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

/**
 * Home page for Oraicle Retail Promo Designer
 * Landing page with link to the agent
 */
export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-700/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold">Oraicle</span>
          </div>
          <div>
            {loading ? (
              <div className="h-10 w-24 bg-slate-700 rounded animate-pulse" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-300">{user?.name || user?.email}</span>
                <Link href="/agents/retail-promo">
                  <Button className="bg-orange-500 hover:bg-orange-600">
                    Open Designer
                  </Button>
                </Link>
              </div>
            ) : (
              <a href={getLoginUrl()}>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  Sign In
                </Button>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-block px-3 py-1 bg-orange-500/20 border border-orange-500/50 rounded-full text-sm text-orange-300">
                ✨ AI-Powered Ad Designer
              </div>
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                From spreadsheet to ad
                <span className="text-orange-400"> in one click</span>
              </h1>
              <p className="text-xl text-slate-300 leading-relaxed">
                Upload your Excel/CSV with product data and images — get ready-to-post Viber/Instagram ads with accurate prices, codes, and copy. No hallucinations, no manual work.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                </div>
                <span className="text-slate-300">Multiple layouts — hero, grid, category groups, sale/discount</span>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                </div>
                <span className="text-slate-300">Format presets — Viber/IG Story, Instagram Post, Facebook Ad</span>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                </div>
                <span className="text-slate-300">Excel/CSV upload — auto-detects columns, names, and prices</span>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                </div>
                <span className="text-slate-300">Product photos — upload and assign to products</span>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                </div>
                <span className="text-slate-300">Accurate pricing with VAT — zero hallucinations</span>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-4">
              {isAuthenticated ? (
                <Link href="/agents/retail-promo">
                  <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                    Launch Designer <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-2xl blur-3xl" />
            <div className="relative bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm">
              <div className="space-y-4">
                <div className="h-4 bg-slate-700 rounded w-3/4" />
                <div className="h-4 bg-slate-700 rounded w-1/2" />
                <div className="mt-6 space-y-3">
                  <div className="h-32 bg-slate-700 rounded" />
                  <div className="h-32 bg-slate-700 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 pt-20 border-t border-slate-700/50">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400">1080×1920</div>
            <div className="text-slate-400 mt-2">Viber/IG Story format</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400">0%</div>
            <div className="text-slate-400 mt-2">Manual work required</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400">100%</div>
            <div className="text-slate-400 mt-2">Accurate pricing</div>
          </div>
        </div>
      </main>
    </div>
  );
}
