import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  LayoutDashboard,
  FilePlus2,
  Files,
  Wallet,
  Users,
  Package,
  LogOut,
  ShoppingBag,
  Percent,
  UserCircle,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/facturar", label: "Facturar", Icon: FilePlus2 },
  { to: "/facturas", label: "Facturas", Icon: Files },
  { to: "/abonos", label: "Abonos", Icon: Wallet },
  { to: "/clientes", label: "Clientes", Icon: Users },
  { to: "/productos", label: "Productos", Icon: Package },
  { to: "/compras", label: "Compras", Icon: ShoppingBag },
  { to: "/descuentos", label: "Descuentos", Icon: Percent },
  { to: "/perfil", label: "Perfil", Icon: UserCircle },
];

// En móvil solo mostramos 4 en el bottom nav, el resto en el drawer
const bottomLinks = links.slice(0, 4);

export default function AppShell({ children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    nav("/login");
  };

  // Título de la página actual
  const currentLink = links.find((l) =>
    l.to === "/" ? location.pathname === "/" : location.pathname.startsWith(l.to)
  );
  const pageTitle = currentLink?.label ?? "Factus";

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── SIDEBAR DESKTOP (lg+) ─────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-white border-r border-gray-100 fixed left-0 top-0 z-30">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-black text-white grid place-items-center font-bold text-sm flex-shrink-0">
            F
          </div>
          <span className="font-bold text-gray-900">Factus</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {links.slice(0, -1).map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all " +
                (isActive
                  ? "bg-gray-900 text-white font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-gray-100 space-y-0.5">
          <NavLink
            to="/perfil"
            className={({ isActive }) =>
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all " +
              (isActive
                ? "bg-gray-900 text-white font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")
            }
          >
            <UserCircle size={16} />
            Perfil
          </NavLink>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── CONTENT WRAPPER ──────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:ml-56 min-h-screen">

        {/* ── TOPBAR (mobile + desktop) ──────────────────── */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100">
          <div className="h-14 px-4 flex items-center justify-between">
            {/* Mobile: hamburger | Desktop: page title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden w-9 h-9 grid place-items-center rounded-xl border border-gray-200 active:scale-95 transition"
                aria-label="Abrir menú"
              >
                <Menu size={16} />
              </button>
              <span className="text-sm font-semibold text-gray-900">{pageTitle}</span>
            </div>

            {/* Mobile: logout button */}
            <button
              onClick={logout}
              className="lg:hidden w-9 h-9 grid place-items-center rounded-xl border border-gray-200 active:scale-95 transition"
              aria-label="Salir"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* ── MAIN CONTENT ───────────────────────────────── */}
        <main className="flex-1 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* ── BOTTOM NAV (solo móvil) ───────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100">
        <div className="grid grid-cols-5 h-16">
          {bottomLinks.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                "flex flex-col items-center justify-center gap-1 text-xs transition-all " +
                (isActive ? "text-gray-900 font-medium" : "text-gray-400")
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                  <span className="text-[10px]">{label}</span>
                </>
              )}
            </NavLink>
          ))}
          {/* Botón "Más" para abrir drawer con el resto */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-1 text-xs text-gray-400"
          >
            <Menu size={20} strokeWidth={1.5} />
            <span className="text-[10px]">Más</span>
          </button>
        </div>
      </nav>

      {/* ── DRAWER MÓVIL ─────────────────────────────────── */}
      <div
        className={
          "lg:hidden fixed inset-0 z-50 bg-black/40 transition-opacity " +
          (drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
        }
        onClick={() => setDrawerOpen(false)}
      />

      <aside
        className={
          "lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-gray-100 " +
          "transition-transform duration-200 ease-out will-change-transform " +
          (drawerOpen ? "translate-x-0" : "-translate-x-full")
        }

      >
        {/* Header drawer */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-black text-white grid place-items-center font-bold text-sm">
              F
            </div>
            <span className="font-bold text-gray-900">Factus</span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-9 h-9 grid place-items-center rounded-xl border border-gray-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav links drawer */}
        <nav className="p-3 space-y-0.5 overflow-y-auto flex-1">
          {links.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                "flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all " +
                (isActive
                  ? "bg-gray-900 text-white font-medium"
                  : "text-gray-600 hover:bg-gray-50")
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon size={16} />
                    {label}
                  </div>
                  {!isActive && <ChevronRight size={14} className="text-gray-300" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout drawer */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </div>
  );
}