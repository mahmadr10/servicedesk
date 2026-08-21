import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { CreateTicketPage } from "./pages/CreateTicketPage";
import { MyTicketsPage } from "./pages/MyTicketsPage";
import { TicketQueuePage } from "./pages/TicketQueuePage";
import { TicketDetailPage } from "./pages/TicketDetailPage";

// The "home" route ("/") shows a different page depending on role: a
// customer's own ticket list, or an agent's full queue. One URL, two
// components — decided by who's logged in.
function Home() {
  const { user } = useAuth();
  if (user?.role === "AGENT") return <TicketQueuePage />;
  return <MyTicketsPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets/new"
        element={
          <ProtectedRoute roles={["CUSTOMER"]}>
            <CreateTicketPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <ProtectedRoute>
            <TicketDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <main className="min-h-screen bg-slate-50 px-4 pb-16">
          <AppRoutes />
        </main>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
