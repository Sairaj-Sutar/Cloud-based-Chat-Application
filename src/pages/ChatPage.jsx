import clsx from 'clsx';
import EmojiPicker from 'emoji-picker-react';
import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  orderBy,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  LogOut,
  MessageSquareText,
  Moon,
  Search,
  SendHorizonal,
  Smile,
  Sparkles,
  SunMedium,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../lib/firebase';

const getChatId = (a, b) => [a, b].sort().join('_');
const initials = (name = 'User') => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';
const formatTime = (stamp) => (stamp?.toDate ? new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(stamp.toDate()) : 'Now');
const formatSeen = (person) => {
  if (!person) return 'Unavailable';
  if (person.status === 'online') return 'Online now';
  if (!person.lastSeen?.toDate) return 'Offline';
  return `Last seen ${new Intl.DateTimeFormat([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(person.lastSeen.toDate())}`;
};
const isTyping = (person, currentUserId) => person?.typingTo === currentUserId && person?.typingUpdatedAt?.toDate && Date.now() - person.typingUpdatedAt.toDate().getTime() < 8000;

function Avatar({ user, online = false, size = 'md' }) {
  const classes = { sm: 'h-11 w-11 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-14 w-14 text-base' };
  return (
    <div className="relative shrink-0">
      {user?.photoURL ? (
        <img src={user.photoURL} alt={user.name} className={clsx('rounded-2xl object-cover ring-1 ring-white/10 shadow-soft', classes[size])} />
      ) : (
        <div className={clsx('flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-500 font-semibold text-white ring-1 ring-white/10 shadow-soft', classes[size])}>
          {initials(user?.name || user?.email)}
        </div>
      )}
      {online ? <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-950" /> : null}
    </div>
  );
}

export default function ChatPage() {
  const { user, profile, signOutUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeUserId, setActiveUserId] = useState('');
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingTimer, setTypingTimer] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!db || !user) return undefined;
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const next = snap.docs.map((item) => item.data()).filter((item) => item.uid !== user.uid).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setUsers(next);
    });
    const unsubChats = onSnapshot(query(collection(db, 'chats'), where('participants', 'array-contains', user.uid)), (snap) => {
      const next = snap.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setChats(next);
      if (!activeUserId && next[0]) {
        const other = next[0].participants.find((id) => id !== user.uid);
        if (other) setActiveUserId(other);
      }
    });
    return () => {
      unsubUsers();
      unsubChats();
    };
  }, [user, activeUserId]);

  useEffect(() => {
    if (!activeUserId && users[0]) setActiveUserId(users[0].uid);
  }, [users, activeUserId]);

  const activeUser = useMemo(() => users.find((item) => item.uid === activeUserId) || null, [users, activeUserId]);
  const activeChatId = activeUser ? getChatId(user.uid, activeUser.uid) : '';

  useEffect(() => {
    if (!db || !activeChatId) {
      setMessages([]);
      return undefined;
    }
    return onSnapshot(query(collection(db, 'chats', activeChatId, 'messages'), orderBy('timestamp', 'asc')), async (snap) => {
      const next = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
      setMessages(next);
      const unread = next.filter((item) => item.senderId !== user.uid && !item.readBy?.includes(user.uid));
      if (unread.length) {
        const batch = writeBatch(db);
        unread.forEach((item) => batch.update(doc(db, 'chats', activeChatId, 'messages', item.id), { readBy: arrayUnion(user.uid) }));
        await batch.commit().catch(() => {});
      }
    });
  }, [activeChatId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeUserId]);

  const setTypingState = async (enabled) => {
    if (!db || !user) return;
    await setDoc(doc(db, 'users', user.uid), { typingTo: enabled ? activeUserId : null, typingUpdatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
  };

  const handleDraftChange = async (value) => {
    setDraft(value);
    if (!activeUserId) return;
    await setTypingState(Boolean(value.trim()));
    if (typingTimer) window.clearTimeout(typingTimer);
    const timer = window.setTimeout(() => setTypingState(false), 1500);
    setTypingTimer(timer);
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !activeUser || sending) return;
    setSending(true);
    try {
      const batch = writeBatch(db);
      const chatRef = doc(db, 'chats', activeChatId);
      const messageRef = doc(collection(db, 'chats', activeChatId, 'messages'));
      batch.set(chatRef, {
        participants: [user.uid, activeUser.uid],
        lastMessage: { text, senderId: user.uid, timestamp: serverTimestamp() },
        updatedAt: serverTimestamp(),
      }, { merge: true });
      batch.set(messageRef, { text, senderId: user.uid, timestamp: serverTimestamp(), readBy: [user.uid] });
      await batch.commit();
      setDraft('');
      setShowEmoji(false);
      await setTypingState(false);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => () => {
    if (typingTimer) window.clearTimeout(typingTimer);
  }, [typingTimer]);

  const recentItems = useMemo(() => chats.map((chat) => {
    const otherId = chat.participants.find((id) => id !== user.uid);
    const person = users.find((item) => item.uid === otherId);
    return person ? { ...chat, person } : null;
  }).filter(Boolean), [chats, users, user.uid]);

  const filteredUsers = useMemo(() => users.filter((item) => {
    const queryText = search.toLowerCase();
    return !queryText || item.name?.toLowerCase().includes(queryText) || item.email?.toLowerCase().includes(queryText);
  }), [users, search]);

  const activeTyping = activeUser ? isTyping(activeUser, user.uid) : false;

  return (
    <div className="min-h-screen p-3 sm:p-4 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className={clsx('glass-panel overflow-hidden', activeUserId ? 'hidden lg:block' : 'block')}>
          <div className="border-b border-slate-200/70 p-5 dark:border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-glow dark:bg-brand-500">
                  <MessageSquareText className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500">CloudChat Pro</div>
                  <div className="text-lg font-semibold tracking-tight">Realtime Workspace</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={toggleTheme} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/80 shadow-soft dark:border-white/10 dark:bg-white/5">
                  {theme === 'dark' ? <SunMedium className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                <button onClick={signOutUser} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/80 shadow-soft dark:border-white/10 dark:bg-white/5">
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white/70 p-3 shadow-soft dark:border-white/10 dark:bg-white/5">
              <Avatar user={profile || user} online />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{profile?.name || user.email}</div>
                <div className="truncate text-sm text-slate-500 dark:text-slate-400">{profile?.email || user.email}</div>
              </div>
              <div className="rounded-2xl bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">Online</div>
            </div>

            <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people..." className="w-full bg-transparent text-sm outline-none" />
            </label>
          </div>

          <div className="max-h-[calc(100vh-250px)] space-y-6 overflow-y-auto p-5 scrollbar-thin">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                <Sparkles className="h-3.5 w-3.5" />
                Recent chats
              </div>
              <div className="space-y-2">
                {recentItems.length ? recentItems.map((item) => (
                  <button key={item.id} onClick={() => setActiveUserId(item.person.uid)} className={clsx('w-full rounded-3xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-soft', activeUserId === item.person.uid ? 'border-brand-300 bg-brand-50/80 dark:border-brand-400/40 dark:bg-brand-500/10' : 'border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-white/5')}>
                    <div className="flex items-center gap-3">
                      <Avatar user={item.person} online={item.person.status === 'online'} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate font-semibold">{item.person.name}</div>
                          <div className="text-xs text-slate-400">{formatTime(item.lastMessage?.timestamp)}</div>
                        </div>
                        <div className="truncate text-sm text-slate-500 dark:text-slate-400">{item.lastMessage?.text || 'Start chatting'}</div>
                      </div>
                    </div>
                  </button>
                )) : <div className="rounded-3xl border border-dashed border-slate-200/80 p-5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">No chats yet. Start by selecting a user below.</div>}
              </div>
            </div>

            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">All users</div>
              <div className="space-y-2">
                {filteredUsers.map((person) => (
                  <button key={person.uid} onClick={() => setActiveUserId(person.uid)} className={clsx('w-full rounded-3xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-soft', activeUserId === person.uid ? 'border-brand-300 bg-brand-50/80 dark:border-brand-400/40 dark:bg-brand-500/10' : 'border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-white/5')}>
                    <div className="flex items-center gap-3">
                      <Avatar user={person} online={person.status === 'online'} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{person.name}</div>
                        <div className="truncate text-sm text-slate-500 dark:text-slate-400">{formatSeen(person)}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className={clsx('glass-panel flex min-h-[calc(100vh-1.5rem)] flex-col overflow-hidden', !activeUserId ? 'hidden lg:flex' : 'flex')}>
          {activeUser ? (
            <>
              <div className="border-b border-slate-200/70 p-4 sm:p-5 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveUserId('')} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/80 shadow-soft lg:hidden dark:border-white/10 dark:bg-white/5">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <Avatar user={activeUser} online={activeUser.status === 'online'} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-xl font-semibold tracking-tight">{activeUser.name}</h2>
                      {activeTyping ? <span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-500">typing...</span> : null}
                    </div>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">{activeTyping ? 'Typing a message...' : formatSeen(activeUser)}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.35),transparent)] p-4 scrollbar-thin sm:p-6 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.25),transparent)]">
                <div className="mx-auto flex max-w-4xl flex-col gap-3">
                  {messages.length ? messages.map((message) => {
                    const mine = message.senderId === user.uid;
                    const read = !!activeUser && message.readBy?.includes(activeUser.uid);
                    return (
                      <div key={message.id} className={clsx('message-enter flex', mine ? 'justify-end' : 'justify-start')}>
                        <div className={clsx('max-w-[82%] rounded-[28px] px-4 py-3 shadow-soft sm:max-w-[70%]', mine ? 'rounded-br-md bg-slate-900 text-white dark:bg-brand-500' : 'rounded-bl-md border border-slate-200/70 bg-white/90 text-slate-900 dark:border-white/10 dark:bg-slate-900/80 dark:text-white')}>
                          <div className="whitespace-pre-wrap break-words text-[15px] leading-7">{message.text}</div>
                          <div className={clsx('mt-2 flex items-center justify-end gap-1 text-[11px]', mine ? 'text-white/75' : 'text-slate-400')}>
                            <span>{formatTime(message.timestamp)}</span>
                            {mine ? (read ? <CheckCheck className="h-3.5 w-3.5 text-cyan-300" /> : activeUser.status === 'online' ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />) : null}
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="mx-auto mt-16 max-w-md rounded-[32px] border border-dashed border-slate-200/80 bg-white/60 p-8 text-center shadow-soft dark:border-white/10 dark:bg-white/5">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-500/10 text-brand-500">
                        <MessageSquareText className="h-8 w-8" />
                      </div>
                      <h3 className="mt-4 text-xl font-semibold">Start the conversation</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">Send your first message to create a real-time Firestore chat room with online status, read receipts, and live updates.</p>
                    </div>
                  )}
                  {activeTyping ? <div className="w-fit rounded-full bg-white/80 px-4 py-2 text-xs font-medium text-slate-500 shadow-soft dark:bg-white/5 dark:text-slate-300">{activeUser.name} is typing…</div> : null}
                  <div ref={bottomRef} />
                </div>
              </div>

              <div className="border-t border-slate-200/70 p-4 dark:border-white/10 sm:p-5">
                <div className="relative mx-auto max-w-4xl">
                  {showEmoji ? (
                    <div className="absolute bottom-[calc(100%+12px)] right-0 z-20 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-soft dark:border-white/10 dark:bg-slate-900">
                      <EmojiPicker theme={theme === 'dark' ? 'dark' : 'light'} onEmojiClick={(emoji) => handleDraftChange(`${draft}${emoji.emoji}`)} />
                    </div>
                  ) : null}
                  <div className="flex items-end gap-3 rounded-[28px] border border-slate-200/80 bg-white/85 p-3 shadow-soft dark:border-white/10 dark:bg-white/5">
                    <button onClick={() => setShowEmoji((current) => !current)} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:text-slate-900 dark:bg-white/5 dark:text-slate-300">
                      <Smile className="h-5 w-5" />
                    </button>
                    <textarea value={draft} onChange={(e) => handleDraftChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} rows={1} placeholder={`Message ${activeUser.name}...`} className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-1 py-2 outline-none" />
                    <button onClick={sendMessage} disabled={!draft.trim() || sending} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-soft transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500">
                      <SendHorizonal className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-10">
              <div className="max-w-md rounded-[32px] border border-dashed border-slate-200/80 bg-white/70 p-10 text-center shadow-soft dark:border-white/10 dark:bg-white/5">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-500/10 text-brand-500">
                  <MessageSquareText className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-2xl font-semibold">Choose a conversation</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">Select a user from the left sidebar to start one-to-one messaging with instant Firestore updates.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
