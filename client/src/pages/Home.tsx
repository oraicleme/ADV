import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Moon, Sun } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { useState, useEffect } from "react";

/**
 * Home page for Oraicle Retail Promo Designer
 * Landing page with link to the agent
 */
export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white'
        : 'bg-gradient-to-br from-white via-slate-50 to-white text-slate-900'
    }`}>
      {/* Navigation */}
      <nav className={`border-b backdrop-blur-sm ${
        isDark
          ? 'border-slate-700/50'
          : 'border-slate-200/50 bg-white/50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 flex-shrink-0">
            <img 
              src={isDark 
                ? "https://d2xsxph8kpxj0f.cloudfront.net/310419663030543924/aKypLJ8kKMin8BXFMHjWjn/oraicle-dark-logo_b9643976.png"
                : "https://d2xsxph8kpxj0f.cloudfront.net/310419663030543924/aKypLJ8kKMin8BXFMHjWjn/Oraicle3_5e0a51a3.png"
              } 
              alt="Oraicle" 
              className="h-10 sm:h-12 md:h-14 w-auto" 
            />
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-lg transition-colors ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {loading ? (
              <div className="h-10 w-20 sm:w-24 bg-slate-700 rounded animate-pulse" />
            ) : (
              <a href={getLoginUrl()}>
                <Button className="bg-teal-500 hover:bg-teal-600 text-white text-sm sm:text-base">
                  Sign In
                </Button>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left Column */}
          <div className="space-y-6 md:space-y-8">
            <div className="space-y-4 md:space-y-6">
              <div className={`inline-block px-3 py-1 rounded-full text-sm ${
                isDark
                  ? 'bg-teal-500/20 border border-teal-500/50 text-teal-300'
                  : 'bg-blue-100 border border-blue-300 text-blue-700'
              }`}>
                ✨ AI-Powered Ad Designer
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
                AI-Powered Retail Ads
                <span className={isDark ? 'text-teal-400' : 'text-blue-600'}> Powered by Oraicle</span>
              </h1>
              <p className={`text-lg md:text-xl leading-relaxed ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}>
                Transform your product data into stunning retail ads in seconds. Powered by Oraicle's affordable AI infrastructure with LLM credits and specialized tools. No hallucinations, no manual work.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3 md:space-y-4">
              <div className="flex gap-3 items-start">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  isDark
                    ? 'bg-teal-500/20'
                    : 'bg-blue-100'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isDark ? 'bg-teal-400' : 'bg-blue-600'
                  }`} />
                </div>
                <span className={isDark ? 'text-slate-300 text-sm md:text-base' : 'text-slate-700 text-sm md:text-base'}>AI-powered copy generation — multiple AI agents create, refine, and optimize ad copy for maximum engagement</span>
              </div>
              <div className="flex gap-3 items-start">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  isDark
                    ? 'bg-teal-500/20'
                    : 'bg-blue-100'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isDark ? 'bg-teal-400' : 'bg-blue-600'
                  }`} />
                </div>
                <span className={isDark ? 'text-slate-300 text-sm md:text-base' : 'text-slate-700 text-sm md:text-base'}>Multiple ad layouts — hero banners, product grids, category showcases, and promotional templates</span>
              </div>
              <div className="flex gap-3 items-start">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  isDark
                    ? 'bg-teal-500/20'
                    : 'bg-blue-100'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isDark ? 'bg-teal-400' : 'bg-blue-600'
                  }`} />
                </div>
                <span className={isDark ? 'text-slate-300 text-sm md:text-base' : 'text-slate-700 text-sm md:text-base'}>Format presets — Instagram, Facebook, TikTok, Email, WhatsApp, Telegram, and more</span>
              </div>
              <div className="flex gap-3 items-start">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  isDark
                    ? 'bg-teal-500/20'
                    : 'bg-blue-100'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isDark ? 'bg-teal-400' : 'bg-blue-600'
                  }`} />
                </div>
                <span className={isDark ? 'text-slate-300 text-sm md:text-base' : 'text-slate-700 text-sm md:text-base'}>Product data import — upload manually, import from Excel/CSV, or connect via API</span>
              </div>
              <div className="flex gap-3 items-start">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  isDark
                    ? 'bg-teal-500/20'
                    : 'bg-blue-100'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isDark ? 'bg-teal-400' : 'bg-blue-600'
                  }`} />
                </div>
                <span className={isDark ? 'text-slate-300 text-sm md:text-base' : 'text-slate-700 text-sm md:text-base'}>Powered by Oraicle LLM credits — up to 95% lower costs than proprietary AI APIs</span>
              </div>
              <div className="flex gap-3 items-start">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  isDark
                    ? 'bg-teal-500/20'
                    : 'bg-blue-100'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isDark ? 'bg-teal-400' : 'bg-blue-600'
                  }`} />
                </div>
                <span className={isDark ? 'text-slate-300 text-sm md:text-base' : 'text-slate-700 text-sm md:text-base'}>Product photos — upload directly, auto-detect from URLs, or fetch via API integration</span>
              </div>
              <div className="flex gap-3 items-start">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  isDark
                    ? 'bg-teal-500/20'
                    : 'bg-blue-100'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isDark ? 'bg-teal-400' : 'bg-blue-600'
                  }`} />
                </div>
                <span className={isDark ? 'text-slate-300 text-sm md:text-base' : 'text-slate-700 text-sm md:text-base'}>Real-time pricing with VAT — accurate calculations, zero hallucinations, instant updates</span>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-4">
              {isAuthenticated ? (
                <Link href="/agents/retail-promo">
                  <Button size="lg" className="bg-teal-500 hover:bg-teal-600 text-white gap-2 w-full sm:w-auto">
                    Launch Designer <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <a href={getLoginUrl()} className="block">
                  <Button size="lg" className="bg-teal-500 hover:bg-teal-600 text-white gap-2 w-full sm:w-auto">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="relative hidden md:block">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 rounded-2xl blur-3xl" />
            <div className={`relative border rounded-2xl p-8 backdrop-blur-sm ${
              isDark
                ? 'bg-slate-800/50 border-slate-700/50'
                : 'bg-slate-100/50 border-slate-300/50'
            }`}>
              <div className="space-y-4">
                <div className={`h-4 rounded w-3/4 ${
                  isDark ? 'bg-slate-700' : 'bg-slate-300'
                }`} />
                <div className={`h-4 rounded w-1/2 ${
                  isDark ? 'bg-slate-700' : 'bg-slate-300'
                }`} />
                <div className="mt-6 space-y-3">
                  <div className={`h-32 rounded ${
                    isDark ? 'bg-slate-700' : 'bg-slate-300'
                  }`} />
                  <div className={`h-32 rounded ${
                    isDark ? 'bg-slate-700' : 'bg-slate-300'
                  }`} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className={`grid sm:grid-cols-3 gap-6 sm:gap-8 mt-16 md:mt-20 pt-12 md:pt-20 border-t ${
          isDark
            ? 'border-slate-700/50'
            : 'border-slate-300/50'
        }`}>
          <div className="text-center">
            <div className={`text-3xl sm:text-4xl md:text-5xl font-bold ${
              isDark ? 'text-teal-400' : 'text-blue-600'
            }`}>28+</div>
            <div className={`mt-2 text-sm sm:text-base ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>Oraicle AI Models</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl sm:text-4xl md:text-5xl font-bold ${
              isDark ? 'text-teal-400' : 'text-blue-600'
            }`}>70%</div>
            <div className={`mt-2 text-sm sm:text-base ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>Cost Savings</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl sm:text-4xl md:text-5xl font-bold ${
              isDark ? 'text-teal-400' : 'text-blue-600'
            }`}>0%</div>
            <div className={`mt-2 text-sm sm:text-base ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>Manual Work</div>
          </div>
        </div>
      </main>
    </div>
  );
}
