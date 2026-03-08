import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Moon, Sun, Sparkles, Layers, Share2, Database } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { useState, useEffect } from "react";

/**
 * Home page for Oraicle Retail Promo Designer
 * Single-screen landing page — fits in one viewport on desktop
 */
export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
  }, []);

  const features = [
    { icon: Sparkles, label: "AI Copy Generation", desc: "Multi-agent ad copy" },
    { icon: Layers, label: "Multiple Layouts", desc: "Hero, grid, promo templates" },
    { icon: Share2, label: "All Channels", desc: "Social, email, messaging" },
    { icon: Database, label: "Easy Import", desc: "Excel, API, or manual" },
  ];

  return (
    <div className={`h-screen flex flex-col overflow-hidden transition-colors duration-300 ${
      isDark
        ? 'bg-slate-950 text-white'
        : 'bg-white text-slate-900'
    }`}>
      {/* Subtle background gradient */}
      <div className={`absolute inset-0 pointer-events-none ${
        isDark
          ? 'bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(14,165,233,0.15),transparent)]'
          : 'bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(14,165,233,0.08),transparent)]'
      }`} />

      {/* Navigation — compact */}
      <nav className={`relative z-10 border-b shrink-0 ${
        isDark ? 'border-white/5' : 'border-slate-100'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex justify-between items-center">
          <img 
            src={isDark 
              ? "https://d2xsxph8kpxj0f.cloudfront.net/310419663030543924/aKypLJ8kKMin8BXFMHjWjn/oraicle-dark-logo_b9643976.png"
              : "https://d2xsxph8kpxj0f.cloudfront.net/310419663030543924/aKypLJ8kKMin8BXFMHjWjn/Oraicle3_5e0a51a3.png"
            } 
            alt="Oraicle" 
            className="h-7 sm:h-8 w-auto" 
          />
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark
                  ? 'hover:bg-white/10 text-slate-400 hover:text-white'
                  : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {loading ? (
              <div className="h-8 w-16 bg-slate-700 rounded animate-pulse" />
            ) : (
              <a href={getLoginUrl()}>
                <Button size="sm" className={`text-xs font-medium ${
                  isDark
                    ? 'bg-white text-slate-900 hover:bg-slate-200'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}>
                  Sign In
                </Button>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content — fills remaining viewport */}
      <main className="relative z-10 flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            
            {/* Left Column — Message */}
            <div className="space-y-5 lg:space-y-6">
              {/* Oraicle Agent Badge — premium, with logo */}
              <div className={`inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full border ${
                isDark
                  ? 'bg-white/5 border-white/10 hover:border-white/20'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              } transition-colors`}>
                <img 
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310419663030543924/aKypLJ8kKMin8BXFMHjWjn/oraicle-favicon_6535f2f6.png" 
                  alt="Oraicle" 
                  className="w-7 h-7 rounded-full object-cover"
                />
                <span className={`text-sm font-medium ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  Oraicle Agent <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>·</span> Promotional Ad Design
                </span>
              </div>

              {/* Headline */}
              <div>
                <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Product ads,{' '}
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
                    designed by AI
                  </span>
                </h1>
                <p className={`mt-3 text-base lg:text-lg leading-relaxed max-w-lg ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Generate retail and wholesale promotional ads from your product data. Upload, customize, export — no design skills needed.
                </p>
              </div>

              {/* CTA */}
              <div className="flex flex-wrap items-center gap-3">
                {isAuthenticated ? (
                  <Link href="/agents/retail-promo">
                    <Button className={`gap-2 h-11 px-6 text-sm font-semibold rounded-xl ${
                      isDark
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/25'
                    }`}>
                      Launch Designer <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                ) : (
                  <a href={getLoginUrl()}>
                    <Button className={`gap-2 h-11 px-6 text-sm font-semibold rounded-xl ${
                      isDark
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/25'
                    }`}>
                      Get Started Free <ArrowRight className="w-4 h-4" />
                    </Button>
                  </a>
                )}
                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Open-source LLMs · Up to 200x cheaper than big AI APIs
                </span>
              </div>

              {/* Feature Grid — compact 2x2 */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {features.map((f) => (
                  <div key={f.label} className={`flex items-start gap-2.5 p-3 rounded-xl border transition-colors ${
                    isDark
                      ? 'bg-white/[0.03] border-white/[0.06] hover:border-white/10'
                      : 'bg-slate-50/80 border-slate-100 hover:border-slate-200'
                  }`}>
                    <f.icon className={`w-4 h-4 mt-0.5 shrink-0 ${
                      isDark ? 'text-cyan-400' : 'text-blue-500'
                    }`} />
                    <div>
                      <div className={`text-sm font-medium leading-tight ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}>{f.label}</div>
                      <div className={`text-xs mt-0.5 ${
                        isDark ? 'text-slate-500' : 'text-slate-400'
                      }`}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column — Product Preview */}
            <div className="hidden lg:block">
              <div className="relative">
                {/* Glow */}
                <div className={`absolute -inset-4 rounded-3xl blur-2xl ${
                  isDark
                    ? 'bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-transparent'
                    : 'bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-transparent'
                }`} />
                {/* Card */}
                <div className={`relative rounded-2xl border overflow-hidden ${
                  isDark
                    ? 'bg-slate-900/80 border-white/10'
                    : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
                }`}>
                  {/* Mock toolbar */}
                  <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${
                    isDark ? 'border-white/5 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'
                  }`}>
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                    </div>
                    <div className={`flex-1 text-center text-xs ${
                      isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}>Ad Designer</div>
                  </div>
                  {/* Mock content */}
                  <div className="p-5 space-y-4">
                    {/* Mock ad preview */}
                    <div className={`rounded-xl p-4 ${
                      isDark ? 'bg-white/[0.03]' : 'bg-slate-50'
                    }`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-lg ${
                          isDark ? 'bg-cyan-500/20' : 'bg-blue-100'
                        }`} />
                        <div className="flex-1 space-y-1.5">
                          <div className={`h-2.5 rounded-full w-2/3 ${
                            isDark ? 'bg-white/10' : 'bg-slate-200'
                          }`} />
                          <div className={`h-2 rounded-full w-1/3 ${
                            isDark ? 'bg-white/5' : 'bg-slate-100'
                          }`} />
                        </div>
                      </div>
                      <div className={`h-28 rounded-lg mb-3 ${
                        isDark
                          ? 'bg-gradient-to-br from-cyan-500/10 to-blue-500/10'
                          : 'bg-gradient-to-br from-blue-50 to-cyan-50'
                      }`} />
                      <div className="grid grid-cols-3 gap-2">
                        {[1,2,3].map(i => (
                          <div key={i} className={`h-16 rounded-lg ${
                            isDark ? 'bg-white/[0.04]' : 'bg-slate-100'
                          }`} />
                        ))}
                      </div>
                    </div>
                    {/* Mock action bar */}
                    <div className="flex gap-2">
                      <div className={`h-8 flex-1 rounded-lg ${
                        isDark ? 'bg-cyan-500/20' : 'bg-blue-100'
                      }`} />
                      <div className={`h-8 w-20 rounded-lg ${
                        isDark ? 'bg-white/5' : 'bg-slate-100'
                      }`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Bar — Stats */}
      <div className={`relative z-10 border-t shrink-0 ${
        isDark ? 'border-white/5' : 'border-slate-100'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-center gap-8 sm:gap-12">
          {[
            { value: "28+", label: "Open-Source Models" },
            { value: "200x", label: "Cheaper than Big AI" },
            { value: "0", label: "Manual Work" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-2">
              <span className={`text-sm sm:text-base font-bold ${
                isDark ? 'text-cyan-400' : 'text-blue-600'
              }`}>{stat.value}</span>
              <span className={`text-xs ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
