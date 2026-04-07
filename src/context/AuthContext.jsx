import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db, googleProvider, isFirebaseConfigured } from '../lib/firebase';

const AuthContext = createContext(null);

async function syncUser(firebaseUser, fallbackName = '') {
  if (!db || !firebaseUser) return;
  const name = firebaseUser.displayName || fallbackName || firebaseUser.email?.split('@')[0] || 'User';
  await setDoc(
    doc(db, 'users', firebaseUser.uid),
    {
      uid: firebaseUser.uid,
      name,
      email: firebaseUser.email || '',
      photoURL: firebaseUser.photoURL || null,
      status: 'online',
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
      typingTo: null,
    },
    { merge: true },
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const updatePresence = useCallback(async (status) => {
    if (!db || !auth?.currentUser) return;
    await setDoc(
      doc(db, 'users', auth.currentUser.uid),
      { status, lastSeen: serverTimestamp(), updatedAt: serverTimestamp() },
      { merge: true },
    ).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return undefined;
    }

    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await syncUser(currentUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (!user || !db) return undefined;
    return onSnapshot(doc(db, 'users', user.uid), (snap) => setProfile(snap.data() || null));
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    const handleVisibility = () => updatePresence(document.visibilityState === 'visible' ? 'online' : 'offline');
    const handleUnload = () => updatePresence('offline');
    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user, updatePresence]);

  const signInWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUser(result.user);
  }, []);

  const signInWithEmail = useCallback(async ({ mode, email, password, name }) => {
    if (mode === 'signup') {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(result.user, { displayName: name });
      await syncUser({ ...result.user, displayName: name || result.user.displayName }, name);
      return;
    }
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signOutUser = useCallback(async () => {
    await updatePresence('offline');
    await signOut(auth);
  }, [updatePresence]);

  const value = useMemo(
    () => ({ user, profile, loading, isFirebaseConfigured, signInWithGoogle, signInWithEmail, signOutUser }),
    [user, profile, loading, signInWithGoogle, signInWithEmail, signOutUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
