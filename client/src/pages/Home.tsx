import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

/**
 * Home page for Oraicle Retail Promo Designer
 * Landing page with link to the agent
 */
export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-700/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310419663030543924/aKypLJ8kKMin8BXFMHjWjn/oraicle-dark-logo_b9643976.png" alt="Oraicle" className="h-8 w-auto" />
          </div>
          <div>
            {loading ? (
              <div className="h-10 w-24 bg-slate-700 rounded animate-pulse" />
            ) : (
              <a href={getLoginUrl()}>
                <Button className="bg-teal-500 hover:bg-teal-600">
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
              <div className="inline-block px-3 py-1 bg-teal-500/20 border border-teal-500/50 rounded-full text-sm text-teal-300">
                ✨ AI-Powered Ad Designer
              </div>
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                AI-Powered Retail Ads
                <span className="text-teal-400"> Powered by Oraicle</span>
              </h1>
              <p className="text-xl text-slate-300 leading-relaxed">
                Transform your product data into stunning retail ads in seconds. Powered by Oraicle's affordable AI infrastructure with LLM credits and specialized tools. No hallucinations, no manual work.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-teal-400" />
                </div>
                <span className="text-slate-300">AI-powered copy generation — multiple AI agents create, refine, and optimize ad copy for maximum engagement</span>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-teal-400" />
                </div>
                <span className="text-slate-300">Multiple ad layouts — hero banners, product grids, category showcases, and promotional templates</span>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-teal-400" />
                </div>
                <span className="text-slate-300">Format presets — Instagram, Facebook, TikTok, Email, WhatsApp, Telegram, and more</span>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-teal-400" />
                </div>
                <span className="text-slate-300">Product data import — upload manually, import from Excel/CSV, or connect via API</span>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-teal-400" />
                </div>
                <span className="text-slate-300">Powered by Oraicle LLM credits — up to 95% lower costs than proprietary AI APIs</span>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-teal-400" />
                </div>
                <span className="text-slate-300">Product photos — upload directly, auto-detect from URLs, or fetch via API integration</span>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-teal-400" />
                </div>
                <span className="text-slate-300">Real-time pricing with VAT — accurate calculations, zero hallucinations, instant updates</span>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-4">
              {isAuthenticated ? (
                <Link href="/agents/retail-promo">
                  <Button size="lg" className="bg-teal-500 hover:bg-teal-600 text-white gap-2">
                    Launch Designer <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="lg" className="bg-teal-500 hover:bg-teal-600 text-white gap-2">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 rounded-2xl blur-3xl" />
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
            <div className="text-3xl font-bold text-teal-400">28+ Models</div>
            <div className="text-slate-400 mt-2">Oraicle AI Models</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-teal-400">70% Savings</div>
            <div className="text-slate-400 mt-2">vs. Proprietary APIs</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-teal-400">0% Manual</div>
            <div className="text-slate-400 mt-2">Work Required</div>
          </div>
        </div>
      </main>
    </div>
  );
}
