import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Productos from "./pages/Productos";
import Facturar from "./pages/Facturar";
import Facturas from "./pages/Facturas";
import Abonos from "./pages/Abonos";

import AppShell from "./layout/AppShell";
import { supabase } from "./lib/supabase";

function PrivateRoute({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return <div className="p-6">Cargando...</div>;
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
      </Routes>
    </BrowserRouter>
  );
}
