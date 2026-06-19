import { NavLink } from "react-router-dom";

export default function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#9D00FF] flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">
            finlenz
          </span>
        </NavLink>

        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `text-sm px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? "text-white bg-slate-800"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`
            }
          >
            Hisseler
          </NavLink>
          <NavLink
            to="/compare"
            className={({ isActive }) =>
              `text-sm px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? "text-white bg-slate-800"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`
            }
          >
            Karşılaştır
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
