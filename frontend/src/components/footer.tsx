import { MapPin, Heart, Shield, Code2, Server } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600 text-xs">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <MapPin className="h-4 w-4" />
              </div>
              <span className="text-base font-bold text-slate-900">
                Bengaluru Startup Jobs Map
              </span>
            </div>
            <p className="text-slate-500 max-w-md leading-relaxed">
              An open-ecosystem platform exploring career paths across Bengaluru’s premier
              technology hubs—from Koramangala and HSR Layout to Indiranagar, Whitefield,
              and the Outer Ring Road corridor.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Shield className="h-3.5 w-3.5 text-emerald-600" />
              <span>Independent project — Inspired by the Bengaluru tech community</span>
            </div>
          </div>

          {/* Quick Hub Links */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 text-sm">Key Tech Hubs</h4>
            <ul className="space-y-1.5 text-slate-500">
              <li>Koramangala VC Hub</li>
              <li>HSR Layout Scaleup Strip</li>
              <li>Indiranagar Product Studios</li>
              <li>Bellandur / Outer Ring Road</li>
              <li>Whitefield Tech Parks</li>
            </ul>
          </div>

          {/* Tech Stack Specs */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 text-sm">System Stack</h4>
            <div className="space-y-1.5 text-slate-500">
              <div className="flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Next.js 16 + React + Tailwind</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                <span>Leaflet &amp; React-Leaflet</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-teal-600" />
                <span>FastAPI + SQLAlchemy + Alembic</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright & attribution */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400">
          <p>© 2026 Bengaluru Startup Jobs Map. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" /> for the Namma Bengaluru tech ecosystem.
          </p>
        </div>
      </div>
    </footer>
  );
}
