import { useState } from 'react';
import { Cloud, Lock, Mail, MessageSquareText, Sparkles, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { signInWithGoogle, signInWithEmail, isFirebaseConfigured } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onChange = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await signInWithEmail({ mode, ...form });
    } catch (submitError) {
      setError(submitError.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.25),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.18),transparent_26%)]" />
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-panel hidden p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-white dark:bg-white/10">
              <MessageSquareText className="h-4 w-4 text-brand-300" />
              CloudChat Pro
            </div>
            <h1 className="mt-8 max-w-xl text-5xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Premium real-time messaging built on Firebase cloud services.
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              A modern SaaS-style chat experience with authentication, live Firestore sync, polished UI, dark mode, emoji support, read states, and responsive layouts.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['SaaS UX', 'Accessible from any browser with a clean, premium interface.'],
              ['PaaS Speed', 'Firebase Authentication, Firestore, and Hosting remove backend complexity.'],
              ['DBaaS Sync', 'Messages and presence stream instantly through real-time listeners.'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-soft dark:border-white/10 dark:bg-white/5">
                <div className="text-sm font-semibold text-brand-500">{title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel p-6 sm:p-8 lg:p-10">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
                <Sparkles className="h-3.5 w-3.5" />
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">{mode === 'login' ? 'Sign in to continue' : 'Launch your workspace'}</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {mode === 'login'
                  ? 'Secure access with Firebase Authentication and persistent cloud sessions.'
                  : 'Set up your account and start real-time messaging in minutes.'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900 p-3 text-white shadow-glow dark:bg-white/10">
              <Cloud className="h-6 w-6" />
            </div>
          </div>

          {!isFirebaseConfigured ? (
            <div className="rounded-3xl border border-amber-300/60 bg-amber-50 p-5 text-sm leading-7 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
              <div className="font-semibold">Firebase setup required</div>
              <p className="mt-2">
                Add your Firebase web app keys to <code>.env</code> using the provided <code>.env.example</code>, then run the app again. The project already includes Firebase Hosting, Firestore rules, and a production-ready frontend.
              </p>
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-2 rounded-2xl bg-slate-100/80 p-1 dark:bg-white/5">
            {['login', 'signup'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  mode === item
                    ? 'bg-white text-slate-900 shadow-soft dark:bg-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {item === 'login' ? 'Login' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === 'signup' ? (
              <label className="block rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  <UserRound className="h-3.5 w-3.5" />
                  Full name
                </div>
                <input name="name" value={form.name} onChange={onChange} placeholder="Alex Johnson" className="w-full bg-transparent outline-none" required={mode === 'signup'} />
              </label>
            ) : null}
            <label className="block rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                <Mail className="h-3.5 w-3.5" />
                Email
              </div>
              <input name="email" type="email" value={form.email} onChange={onChange} placeholder="you@example.com" className="w-full bg-transparent outline-none" required />
            </label>
            <label className="block rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                <Lock className="h-3.5 w-3.5" />
                Password
              </div>
              <input name="password" type="password" value={form.password} onChange={onChange} placeholder="••••••••" className="w-full bg-transparent outline-none" required minLength={6} />
            </label>

            {error ? <div className="rounded-2xl border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">{error}</div> : null}

            <button disabled={submitting || !isFirebaseConfigured} className="w-full rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-500">
              {submitting ? 'Please wait...' : mode === 'login' ? 'Sign in securely' : 'Create account'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-slate-400">
            <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            Or continue with
            <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

          <button onClick={signInWithGoogle} disabled={!isFirebaseConfigured} className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3.5 text-sm font-semibold shadow-soft transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5">
            Continue with Google
          </button>
        </section>
      </div>
    </div>
  );
}
