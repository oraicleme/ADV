import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Moon, Sun, Sparkles, Layers, Share2, Database, Zap, Shield } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { useState, useEffect } from "react";

/**
 * Home page — single-screen hero, properly scaled for desktop and mobile
 */
export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
  }, []);

  return (
    <div className={`h-screen flex flex-col overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'
    }`}>
      {/* Ambient glow — larger on desktop */}
      <div className={`absolute inset-0 pointer-events-none ${
        isDark
          ? 'bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(14,165,233,0.12),transparent)]'
          : 'bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(14,165,233,0.06),transparent)]'
      }`} />

      {/* ─── NAV ─── scaled up for desktop */}
      <nav className={`relative z-10 shrink-0 ${
        isDark ? 'border-b border-white/5' : 'border-b border-slate-100'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-14 sm:h-16 lg:h-[72px] flex justify-between items-center">
          <img 
            src={isDark 
              ? "https://d2xsxph8kpxj0f.cloudfront.net/310419663030543924/aKypLJ8kKMin8BXFMHjWjn/oraicle-dark-logo_b9643976.png"
              : "https://d2xsxph8kpxj0f.cloudfront.net/310419663030543924/aKypLJ8kKMin8BXFMHjWjn/Oraicle3_5e0a51a3.png"
            } 
            alt="Oraicle" 
            className="h-7 sm:h-8 lg:h-10 xl:h-11 w-auto" 
          />
          <div className="flex items-center gap-2 lg:gap-3">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 lg:p-2.5 rounded-lg transition-colors ${
                isDark
                  ? 'hover:bg-white/10 text-slate-400 hover:text-white'
                  : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4 lg:h-5 lg:w-5" /> : <Moon className="h-4 w-4 lg:h-5 lg:w-5" />}
            </button>
            {loading ? (
              <div className="h-8 w-16 bg-slate-700 rounded animate-pulse" />
            ) : (
              <a href={getLoginUrl()}>
                <Button size="sm" className={`text-xs lg:text-sm h-8 lg:h-9 px-4 lg:px-5 font-medium rounded-lg ${
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

      {/* ─── HERO ─── fills remaining space, content distributed vertically */}
      <main className="relative z-10 flex-1 flex flex-col justify-between px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-12 xl:py-16">
        
        {/* Top spacer — pushes content toward center */}
        <div className="flex-1" />

        {/* Center content block */}
        <div className="max-w-4xl w-full mx-auto text-center">
          
          {/* Agent badge */}
          <div className="flex justify-center mb-5 lg:mb-7">
            <div className={`inline-flex items-center gap-2 sm:gap-3 pl-2 pr-4 sm:pl-2.5 sm:pr-5 py-2 sm:py-2.5 rounded-full border backdrop-blur-sm ${
              isDark
                ? 'bg-white/[0.04] border-white/[0.08]'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <img 
                src="https://d2xsxph8kpxj0f.cloudfront.net/310419663030543924/aKypLJ8kKMin8BXFMHjWjn/oraicle-favicon_6535f2f6.png" 
                alt="Oraicle" 
                className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full"
              />
              <span className={`text-xs sm:text-sm lg:text-base font-medium tracking-wide ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}>
                Oraicle Agent <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>·</span> Promotional Ad Design
              </span>
            </div>
          </div>

          {/* Headline — scales significantly on desktop */}
          <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-tight leading-[1.05] mb-4 lg:mb-6 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            Product ads,{' '}
            <br className="sm:hidden" />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
              designed by AI
            </span>
          </h1>

          {/* Subtext — larger on desktop */}
          <p className={`text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed max-w-2xl mx-auto mb-6 lg:mb-8 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Generate retail and wholesale promotional ads from your product data. 
            Upload, customize, export — no design skills needed.
          </p>

          {/* CTA — larger on desktop */}
          <div className="flex flex-col items-center gap-3 lg:gap-4">
            {isAuthenticated ? (
              <Link href="/agents/retail-promo">
                <Button className={`gap-2 h-11 sm:h-12 lg:h-14 px-7 sm:px-8 lg:px-10 text-sm sm:text-base lg:text-lg font-semibold rounded-xl lg:rounded-2xl ${
                  isDark
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/25'
                }`}>
                  Launch Designer <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5" />
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button className={`gap-2 h-11 sm:h-12 lg:h-14 px-7 sm:px-8 lg:px-10 text-sm sm:text-base lg:text-lg font-semibold rounded-xl lg:rounded-2xl ${
                  isDark
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/25'
                }`}>
                  Get Started Free <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5" />
                </Button>
              </a>
            )}
            <span className={`text-[11px] sm:text-xs lg:text-sm ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              Open-source LLMs · Up to 200x cheaper than big AI APIs
            </span>
          </div>
        </div>

        {/* Bottom spacer — pushes content toward center */}
        <div className="flex-1" />

        {/* Feature cards row — sits between content and footer */}
        <div className="max-w-5xl w-full mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[
              { icon: Sparkles, title: "AI Copy Generation", desc: "Multi-agent AI writes your ad copy" },
              { icon: Layers, title: "Multiple Layouts", desc: "Hero, grid, category & promo templates" },
              { icon: Share2, title: "All Channels", desc: "Instagram, Facebook, Email, WhatsApp" },
              { icon: Database, title: "Easy Import", desc: "Excel, CSV, API or manual upload" },
            ].map((f) => (
              <div key={f.title} className={`rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-5 border transition-colors ${
                isDark
                  ? 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                  : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
              }`}>
                <f.icon className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mb-2 lg:mb-3 ${
                  isDark ? 'text-cyan-400/70' : 'text-blue-500/70'
                }`} />
                <div className={`text-xs sm:text-sm lg:text-base font-semibold mb-0.5 lg:mb-1 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>{f.title}</div>
                <div className={`text-[10px] sm:text-xs lg:text-sm leading-snug ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ─── FOOTER STATS ─── scaled up for desktop */}
      <div className={`relative z-10 shrink-0 ${
        isDark ? 'border-t border-white/5' : 'border-t border-slate-100'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-12 sm:h-14 lg:h-16 flex items-center justify-center gap-6 sm:gap-10 lg:gap-16">
          {[
            { icon: Zap, value: "28+", label: "AI Models" },
            { icon: Shield, value: "200x", label: "Cheaper than Big AI" },
            { icon: Sparkles, value: "0%", label: "Manual Work" },
          ].map((s) => (
            <div key={s.label} className={`flex items-center gap-2 lg:gap-2.5 ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <s.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ${
                isDark ? 'text-cyan-400/40' : 'text-blue-500/40'
              }`} />
              <span className={`text-xs sm:text-sm lg:text-base font-bold ${
                isDark ? 'text-cyan-400/70' : 'text-blue-500/70'
              }`}>{s.value}</span>
              <span className="text-[10px] sm:text-xs lg:text-sm">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
