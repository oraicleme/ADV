import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Moon, Sun, Sparkles, Layers, Share2, Database } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { useState, useEffect } from "react";

/**
 * Home page — single-screen, centered hero, works at every viewport
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
      {/* Ambient glow */}
      <div className={`absolute inset-0 pointer-events-none ${
        isDark
          ? 'bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(14,165,233,0.15),transparent)]'
          : 'bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(14,165,233,0.07),transparent)]'
      }`} />

      {/* Nav — slim 48px */}
      <nav className={`relative z-10 shrink-0 ${
        isDark ? 'border-b border-white/5' : 'border-b border-slate-100'
      }`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-12 flex justify-between items-center">
          <img 
            src={isDark 
              ? "https://d2xsxph8kpxj0f.cloudfront.net/310419663030543924/aKypLJ8kKMin8BXFMHjWjn/oraicle-dark-logo_b9643976.png"
              : "https://d2xsxph8kpxj0f.cloudfront.net/310419663030543924/aKypLJ8kKMin8BXFMHjWjn/Oraicle3_5e0a51a3.png"
            } 
            alt="Oraicle" 
            className="h-6 sm:h-7 w-auto" 
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark
                  ? 'hover:bg-white/10 text-slate-400 hover:text-white'
                  : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            {loading ? (
              <div className="h-7 w-14 bg-slate-700 rounded animate-pulse" />
            ) : (
              <a href={getLoginUrl()}>
                <Button size="sm" className={`text-xs h-7 px-3 font-medium ${
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

      {/* Hero — vertically centered, single column */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center px-4 sm:px-6">
        <div className="max-w-2xl w-full text-center space-y-5">
          
          {/* Agent badge */}
          <div className="flex justify-center">
            <div className={`inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full border backdrop-blur-sm ${
              isDark
                ? 'bg-white/[0.04] border-white/[0.08]'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <img 
                src="https://d2xsxph8kpxj0f.cloudfront.net/310419663030543924/aKypLJ8kKMin8BXFMHjWjn/oraicle-favicon_6535f2f6.png" 
                alt="Oraicle" 
                className="w-6 h-6 rounded-full"
              />
              <span className={`text-xs sm:text-sm font-medium tracking-wide ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Oraicle Agent <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>·</span> Promotional Ad Design
              </span>
            </div>
          </div>

          {/* Headline */}
          <h1 className={`text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05] ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            Product ads,{' '}
            <br className="sm:hidden" />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
              designed by AI
            </span>
          </h1>

          {/* Subtext */}
          <p className={`text-sm sm:text-base md:text-lg leading-relaxed max-w-xl mx-auto ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Generate retail and wholesale promotional ads from your product data. 
            Upload, customize, export — no design skills needed.
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-2.5 pt-1">
            {isAuthenticated ? (
              <Link href="/agents/retail-promo">
                <Button className={`gap-2 h-11 px-7 text-sm font-semibold rounded-xl ${
                  isDark
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/25'
                }`}>
                  Launch Designer <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button className={`gap-2 h-11 px-7 text-sm font-semibold rounded-xl ${
                  isDark
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/25'
                }`}>
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
            )}
            <span className={`text-[11px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              Open-source LLMs · Up to 200x cheaper than big AI APIs
            </span>
          </div>

          {/* Feature chips row */}
          <div className={`flex flex-wrap justify-center items-center gap-x-5 gap-y-2 pt-3 ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {[
              { icon: Sparkles, text: "AI Copy Generation" },
              { icon: Layers, text: "Multiple Layouts" },
              { icon: Share2, text: "All Channels" },
              { icon: Database, text: "Easy Import" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-1.5">
                <f.icon className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400/50' : 'text-blue-400/50'}`} />
                <span className="text-xs font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom stats bar — anchored to bottom */}
      <div className={`relative z-10 shrink-0 ${
        isDark ? 'border-t border-white/5' : 'border-t border-slate-100'
      }`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-10 flex items-center justify-center gap-8">
          {[
            { value: "28+", label: "AI Models" },
            { value: "200x", label: "Cheaper" },
            { value: "0%", label: "Manual Work" },
          ].map((s) => (
            <div key={s.label} className={`flex items-center gap-1.5 ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <span className={`text-xs font-bold ${
                isDark ? 'text-cyan-400/60' : 'text-blue-500/60'
              }`}>{s.value}</span>
              <span className="text-[11px]">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
