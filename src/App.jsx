import { MessageCircleMore } from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';

function AppLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="glass-panel flex w-full max-w-md flex-col items-center gap-5 p-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-500/20 text-brand-300 shadow-glow">
          <MessageCircleMore className="h-8 w-8 animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Initializing CloudChat Pro</h1>
          <p className="mt-2 text-sm text-slate-300">
            Connecting authentication, real-time sync, and your premium workspace.
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-brand-400 to-indigo-400" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <AppLoader />;

  return (
    <Routes>
      <Route path="/" element={user ? <ChatPage /> : <AuthPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
