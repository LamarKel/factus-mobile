import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Productos from "./pages/Productos";
import Facturar from "./pages/Facturar";
import Facturas from "./pages/Facturas";
import Abonos from "./pages/Abonos";
import Catalogo from "./pages/Catalogo";
import Perfil from "./pages/Perfil";
import Compras from "./pages/Compras";
import Descuentos from "./pages/Descuentos";
import OptimizarImagenes from "./pages/OptimizarImagenes";
import Reportes from "./pages/Reportes";
import Impresora from "./pages/Impresora";
import Combos from "./pages/Combos";

import AppShell from "./layout/AppShell";
import AppSkeleton from "./components/AppSkeleton";
import { supabase } from "./lib/supabase";

function SinConexion({ onRetry }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-xs">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
          📡
        </div>
        <p className="font-semibold text-gray-900">Sin conexión a internet</p>
        <p className="text-sm text-gray-500 mt-1">
          Conéctate a internet e intenta de nuevo.
        </p>
        <button onClick={onRetry}
          className="mt-4 bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm font-semibold">
          Reintentar
        </button>
      </div>
    </div>
  );
}

function PrivateRoute({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sinConexion, setSinConexion] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      setSinConexion(false);

      supabase.auth.getSession()
        .then(({ data }) => {
          setSession(data.session);
          setLoading(false);
        })
        .catch(() => {
          setSinConexion(true);
          setLoading(false);
        });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, [intento]);

  if (loading) return <AppSkeleton />;
  if (sinConexion) return <SinConexion onRetry={() => setIntento((n) => n + 1)} />;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppShell title="Dashboard">
                <Dashboard />
              </AppShell>
            </PrivateRoute>
          }
        />

        <Route
          path="/clientes"
          element={
            <PrivateRoute>
              <AppShell title="Clientes">
                <Clientes />
              </AppShell>
            </PrivateRoute>
          }
        />

        <Route
          path="/productos"
          element={
            <PrivateRoute>
              <AppShell title="Productos">
                <Productos />
              </AppShell>
            </PrivateRoute>
          }
        />

        <Route
          path="/facturar"
          element={
            <PrivateRoute>
              <AppShell title="Nueva factura">
                <Facturar />
              </AppShell>
            </PrivateRoute>
          }
        />

        <Route
          path="/facturas"
          element={
            <PrivateRoute>
              <AppShell title="Facturas">
                <Facturas />
              </AppShell>
            </PrivateRoute>
          }
        />

        <Route
          path="/abonos"
          element={
            <PrivateRoute>
              <AppShell title="Abonos">
                <Abonos />
              </AppShell>
            </PrivateRoute>
          }
        />
        <Route path="/catalogo/:userId" element={<Catalogo />} />
        <Route
          path="/perfil"
          element={
            <PrivateRoute>
              <AppShell title="Perfil">
                <Perfil />
              </AppShell>
            </PrivateRoute>
          }
        />
        <Route
          path="/compras"
          element={
            <PrivateRoute>
              <AppShell title="Compras">
                <Compras />
              </AppShell>
            </PrivateRoute>
          }
        />
        <Route path="/combos" element={
          <PrivateRoute>
            <AppShell title="Combos">
              <Combos />
            </AppShell>
          </PrivateRoute>
        } />

        <Route path="/descuentos" element={
          <PrivateRoute>
            <AppShell title="Descuentos">
              <Descuentos />
            </AppShell>
          </PrivateRoute>
        } />
        <Route path="/reportes" element={
          <PrivateRoute>
            <AppShell title="Reportes">
              <Reportes />
            </AppShell>
          </PrivateRoute>
        } />


        <Route path="/impresora" element={
          <PrivateRoute>
            <AppShell title="Impresora">
              <Impresora />
            </AppShell>
          </PrivateRoute>
        } />

        <Route path="/optimizar" element={
          <PrivateRoute>
            <AppShell title="Optimizar Imágenes">
              <OptimizarImagenes />
            </AppShell>
          </PrivateRoute>
        } />

      </Routes>
    </BrowserRouter>
  );
}
