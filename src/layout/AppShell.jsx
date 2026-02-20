import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  Menu,
  X,
  LayoutDashboard,
  FilePlus2,
  Files,
  Wallet,
  Users,
  Package,
  LogOut,
} from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/facturar", label: "Nueva factura", Icon: FilePlus2 },
  { to: "/facturas", label: "Facturas", Icon: Files },
  { to: "/abonos", label: "Abonos", Icon: Wallet },
  { to: "/clientes", label: "Clientes", Icon: Users },
  { to: "/productos", label: "Productos", Icon: Package },
];

export default function AppShell({ title, children }) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  // cerrar con ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    nav("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* TOP BAR */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="h-14 px-3 flex items-center justify-between">
          <button
            onClick={() => setOpen(true)}
            className="w-10 h-10 grid place-items-center rounded-xl border active:scale-95 transition"
            aria-label="Abrir menú"
          >
            <Menu size={18} />
          </button>

          <div className="text-sm font-semibold truncate px-2">{title || "Factus"}</div>

          <button
            onClick={logout}
            className="w-10 h-10 grid place-items-center rounded-xl border active:scale-95 transition"
            aria-label="Salir"
            title="Salir"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* OVERLAY */}
      <div
        className={
          "fixed inset-0 z-50 bg-black/40 transition-opacity " +
          (open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
        }
        onClick={() => setOpen(false)}
      />

      {/* DRAWER */}
      <aside
        className={
          "fixed top-0 left-0 z-50 h-full w-[82%] max-w-[340px] bg-white border-r " +
          "transition-transform duration-200 ease-out " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="h-14 px-3 flex items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-black text-white grid place-items-center font-bold">
              F
            </div>
            <div>
              <p className="font-bold leading-4">Factus</p>
              <p className="text-xs text-gray-600">Menú</p>
            </div>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="w-10 h-10 grid place-items-center rounded-xl border active:scale-95 transition"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {links.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                "flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm transition " +
                (isActive ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50")
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border text-sm"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* CONTENT */}
      <main className="p-4 pb-24">{children}</main>
    </div>
  );
}
