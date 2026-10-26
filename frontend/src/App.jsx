import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Bookmark, Compass, Home, LogOut, MessageCircle, Moon, Search, Settings, Sun, Users, X } from 'lucide-react';
import { io } from 'socket.io-client';
import AuthPage from './pages/AuthPage.jsx';
import SocialPage, { PostDetail } from './pages/SocialPage.jsx';
import MessagesPage from './pages/MessagesPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import { useAuth } from './features/auth/AuthContext.jsx';
import { api, getApiError } from './services/api.js';

const navItems = [
  ['/', 'Home', Home], ['/explore', 'Explore', Compass], ['/messages', 'Messages', MessageCircle],
  ['/notifications', 'Notifications', Bell], ['/saved', 'Saved', Bookmark], ['/profile', 'Profile', Users], ['/settings', 'Settings', Settings],
];

function Brand() {
  return <NavLink className="brand" to="/" aria-label="Chatz home"><span className="brand-mark"><MessageCircle size={18} fill="currentColor" /></span><span>chatz<span className="brand-period">.</span></span></NavLink>;
}

function Sidebar() {
  const { user, logout } = useAuth();
  const [error, setError] = useState('');
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    api.get('/api/notifications').then(({ data }) => setUnread(data.unreadCount)).catch(() => {});
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { withCredentials: true });
    socket.on('notification:new', () => setUnread((count) => count + 1));
    socket.on('notifications:count', ({ unreadCount }) => setUnread(unreadCount));
    return () => socket.disconnect();
  }, []);
  async function signOut() { try { await logout(); } catch (requestError) { setError(getApiError(requestError)); } }
  return <aside className="sidebar"><Brand /><div className="workspace-label">YOUR SPACE</div><nav className="main-nav" aria-label="Main navigation">
    {navItems.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{to === '/notifications' && unread > 0 && <i className="nav-count">{unread > 99 ? '99+' : unread}</i>}</NavLink>)}
  </nav><div className="sidebar-bottom"><div className="sidebar-note"><span className="note-dot" />Your corner of the internet, thoughtfully connected.</div>{error && <p className="inline-error">{error}</p>}<div className="profile-chip"><div className="avatar avatar-you">{user.displayName.slice(0, 1).toUpperCase()}</div><div className="profile-chip-copy"><strong>{user.displayName}</strong><span>@{user.username}</span></div><button className="signout-button" onClick={signOut} aria-label="Sign out"><LogOut size={15} /></button></div></div></aside>;
}

function ThemeButton({ theme, onToggle }) {
  const Icon = theme === 'light' ? Moon : Sun;
  return <button className="icon-button" onClick={onToggle} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}><Icon size={18} /></button>;
}

function Topbar({ title }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], posts: [] });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setResults({ users: [], posts: [] }); setSearchError(''); setSearchLoading(false); return undefined; }
    let alive = true;
    const timer = setTimeout(async () => {
      setSearchLoading(true); setSearchError('');
      try { const { data } = await api.get(`/api/search?q=${encodeURIComponent(term)}`); if (alive) setResults(data); }
      catch (requestError) { if (alive) setSearchError(getApiError(requestError)); }
      finally { if (alive) setSearchLoading(false); }
    }, 220);
    return () => { alive = false; clearTimeout(timer); };
  }, [query]);
  function goTo(path) { setSearchOpen(false); setQuery(''); navigate(path); }
  return <header className="topbar"><div className="mobile-brand"><Brand /></div><div className="breadcrumbs">Chatz <span>/</span> <strong>{title}</strong></div><div className="topbar-actions"><form className={`search-control${searchOpen ? ' open' : ''}`} role="search" onClick={() => { if (!searchOpen) setSearchOpen(true); }} onSubmit={(event) => { event.preventDefault(); setSearchOpen(true); }}><button type="button" className="search-expand" onClick={() => setSearchOpen(true)} aria-label="Open search"><Search size={16} /></button><input value={query} onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false); }} onFocus={() => setSearchOpen(true)} onChange={(event) => { setQuery(event.target.value); setResults({ users: [], posts: [] }); setSearchOpen(true); }} placeholder="Search people and posts" aria-label="Search people and posts" /><kbd>⌘ K</kbd>{searchOpen && <button type="button" className="search-close" onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={15} /></button>}{searchOpen && (query.trim().length > 0) && <div className="search-results" role="region" aria-label="Search results">{searchLoading ? <div className="search-state">Searching Chatz…</div> : searchError ? <div className="search-state search-error">{searchError}</div> : query.trim().length < 2 ? <div className="search-state">Type at least 2 characters.</div> : !results.users.length && !results.posts.length ? <div className="search-state">No people or posts found.</div> : <><div className="search-group-label">PEOPLE</div>{results.users.length ? results.users.map((person) => <button type="button" className="search-result" key={person._id} onClick={() => goTo(`/u/${person.username}`)}><span className="avatar search-avatar">{person.displayName.slice(0, 1).toUpperCase()}</span><span><strong>{person.displayName}</strong><small>@{person.username}{person.isPrivate ? ' · Private' : ''}</small></span></button>) : <div className="search-state compact">No matching people.</div>}<div className="search-group-label">POSTS</div>{results.posts.length ? results.posts.map((post) => <button type="button" className="search-result search-post-result" key={post._id} onClick={() => goTo(`/p/${post._id}`)}><span><strong>{post.author.displayName}</strong><small>{post.text}</small></span></button>) : <div className="search-state compact">No matching posts.</div>}</>}</div>}</form><ThemeButton theme={document.documentElement.dataset.theme || 'light'} onToggle={() => window.dispatchEvent(new Event('toggle-theme'))} /><NavLink to="/profile" className="avatar avatar-top" title={user.displayName}>{user.displayName.slice(0, 1).toUpperCase()}</NavLink></div></header>;
}

function HomeRightRail({ className = '' }) {
  const [suggestions, setSuggestions] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    async function refreshConversations() {
      try {
        const { data } = await api.get('/api/messages');
        if (alive) setConversations(data.conversations);
      } catch (requestError) { if (alive) setError(getApiError(requestError)); }
    }
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { withCredentials: true });
    socket.on('conversation:update', refreshConversations);
    Promise.allSettled([api.get('/api/users/suggestions'), api.get('/api/messages')])
      .then(([suggestionResult, conversationResult]) => {
        if (!alive) return;
        if (suggestionResult.status === 'fulfilled') setSuggestions(suggestionResult.value.data.users);
        else setError(getApiError(suggestionResult.reason));
        if (conversationResult.status === 'fulfilled') setConversations(conversationResult.value.data.conversations);
        else setError(getApiError(conversationResult.reason));
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; socket.disconnect(); };
  }, []);
  async function toggleFollow(person) {
    setError('');
    try {
      const { data } = await api.request({ method: person.isFollowing ? 'delete' : 'post', url: `/api/users/${person.username}/follow` });
      setSuggestions((current) => current.map((item) => item._id === person._id ? { ...item, isFollowing: Boolean(data.following) } : item));
    } catch (requestError) { setError(getApiError(requestError)); }
  }
  return <aside className={['right-rail', 'home-right-rail', className].filter(Boolean).join(' ')}>
    <section className="rail-card home-widget"><div className="rail-card-header"><div><span className="section-kicker">MEET THE COMMUNITY</span><h3>People to follow</h3></div><Users size={18} strokeWidth={1.7} /></div>{loading ? <div className="home-widget-state">Finding people…</div> : suggestions.length ? <div className="suggestion-list">{suggestions.map((person) => <div className="suggestion-row" key={person._id}><NavLink className="avatar avatar-you" to={`/u/${person.username}`}>{person.displayName.slice(0, 1).toUpperCase()}</NavLink><NavLink className="suggestion-identity" to={`/u/${person.username}`}><strong>{person.displayName}</strong><span>@{person.username}{person.headline ? ` · ${person.headline}` : ''}</span></NavLink><button className={`suggestion-follow${person.isFollowing ? ' following' : ''}`} onClick={() => toggleFollow(person)} aria-label={`${person.isFollowing ? 'Unfollow' : 'Follow'} ${person.displayName}`}>{person.isFollowing ? 'Following' : 'Follow'}</button></div>)}</div> : <div className="home-widget-state">No people to suggest yet. Check back as the community grows.</div>}{error && <p className="inline-error" role="alert">{error}</p>}<NavLink className="rail-link" to="/explore">Explore people <span>→</span></NavLink></section>
    <section className="rail-card home-widget"><div className="rail-card-header"><div><span className="section-kicker">PICK UP WHERE YOU LEFT OFF</span><h3>Recent conversations</h3></div><MessageCircle size={18} strokeWidth={1.7} /></div>{loading ? <div className="home-widget-state">Loading conversations…</div> : conversations.length ? <div className="recent-conversations">{conversations.slice(0, 5).map((conversation) => <button className="recent-conversation" key={conversation._id} onClick={() => setSelectedConversationId(conversation._id)}><span className="avatar conversation-avatar">{conversation.participant.displayName.slice(0, 1).toUpperCase()}</span><span className="recent-conversation-copy"><strong>{conversation.participant.displayName}</strong><span>{conversation.lastMessage || 'Start a conversation'}</span></span>{conversation.unreadCount > 0 && <i className="recent-unread" aria-label={`${conversation.unreadCount} unread messages`}>{conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}</i>}</button>)}</div> : <div className="home-widget-state">No conversations yet. Find someone to say hello to.</div>}</section>
    {selectedConversationId && <section className="rail-card quick-chat-card"><div className="quick-chat-title"><h3>Quick chat</h3><button type="button" onClick={() => setSelectedConversationId(null)} aria-label="Close quick chat"><X size={15} /></button></div><MessagesPage key={selectedConversationId} initialConversationId={selectedConversationId} quickChat onConversationsChange={setConversations} /></section>}
  </aside>;
}

function PageHeading({ eyebrow, title, subtitle, icon: Icon }) {
  return <section className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div><div className="heading-illustration"><div className="illustration-ring ring-one" /><div className="illustration-ring ring-two" /><Icon size={26} strokeWidth={1.4} /></div></section>;
}

function ExplorePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [following, setFollowing] = useState({});
  const [contact, setContact] = useState(null);
  const [firstMessage, setFirstMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('other');
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setUsers([]); return undefined; }
    let alive = true;
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      try { const { data } = await api.get(`/api/users/search?q=${encodeURIComponent(term)}`); if (alive) { setUsers(data.users); setFollowing(Object.fromEntries(data.users.map((person) => [person.username, person.isFollowing]))); } }
      catch (requestError) { if (alive) setError(getApiError(requestError)); }
      finally { if (alive) setLoading(false); }
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [query]);
  async function toggleFollow(username) {
    const isFollowing = following[username];
    try {
      await api.request({ method: isFollowing ? 'delete' : 'post', url: `/api/users/${username}/follow` });
      setFollowing((state) => ({ ...state, [username]: !isFollowing }));
    } catch (requestError) { setError(getApiError(requestError)); }
  }
  async function sendFirstMessage(event) {
    event.preventDefault(); if (!contact || !firstMessage.trim()) return;
    setError(''); setNotice('');
    try { const { data } = await api.post(`/api/messages/${contact.username}`, { text: firstMessage.trim() }); setContact(null); setFirstMessage(''); setNotice(data.status === 'pending' ? 'Message request sent. You’ll see a reply in Messages.' : 'Message sent. Your conversation is ready.'); if (data.status === 'accepted') navigate('/messages'); }
    catch (requestError) { setError(getApiError(requestError)); }
  }
  async function blockUser(person) {
    if (!window.confirm(`Block @${person.username}? They won’t be able to contact you or view your profile.`)) return;
    try { await api.post(`/api/users/${person.username}/block`); setUsers((current) => current.filter((item) => item._id !== person._id)); setNotice(`@${person.username} was blocked. You can unblock them in Settings.`); }
    catch (requestError) { setError(getApiError(requestError)); }
  }
  async function reportUser(event) {
    event.preventDefault(); if (!reportTarget) return;
    try { await api.post(`/api/reports/user/${reportTarget.username}`, { reason: reportReason }); setNotice('Report submitted for review.'); setReportTarget(null); }
    catch (requestError) { setError(getApiError(requestError)); }
  }
  return <div className="explore-page">
    <div className="explore-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or username" aria-label="Search people" /></div>
    {error && <p className="inline-error" role="alert">{error}</p>}{notice && <p className="success-message" role="status">{notice}</p>}
    {loading && <div className="feed-loading">Looking around…</div>}
    {!loading && query.trim().length >= 2 && !users.length && !error && <div className="social-empty"><h3>No matches just yet.</h3><p>Try a different name or username.</p></div>}
    <div className="people-list">{users.map((person) => <article className="person-card" key={person._id}><div className="avatar avatar-you">{person.displayName.slice(0, 1).toUpperCase()}</div><div className="person-copy"><NavLink className="person-profile-link" to={`/u/${person.username}`}>{person.displayName}</NavLink><span>@{person.username}{person.headline ? ` · ${person.headline}` : ''}</span></div><div className="person-actions"><button className="outline-button" onClick={() => toggleFollow(person.username)}>{following[person.username] ? 'Following' : 'Follow'}</button><button className="outline-button" onClick={() => { setContact(person); setFirstMessage(''); }}>Message</button><button className="quiet-action" onClick={() => setReportTarget(person)}>Report</button><button className="quiet-action" onClick={() => blockUser(person)}>Block</button></div></article>)}</div>
    {contact && <form className="first-message-form" onSubmit={sendFirstMessage}><strong>Say hello to {contact.displayName}</strong><textarea value={firstMessage} onChange={(event) => setFirstMessage(event.target.value)} maxLength="4000" placeholder="Write a thoughtful first message…" required /><div><button type="button" className="text-button" onClick={() => setContact(null)}>Cancel</button><button className="primary-button" disabled={!firstMessage.trim()}>Send message <span>→</span></button></div></form>}
    {reportTarget && <form className="report-form user-report-form" onSubmit={reportUser}><strong>Report {reportTarget.displayName}</strong><label>Reason<select value={reportReason} onChange={(event) => setReportReason(event.target.value)}><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="inappropriate">Inappropriate behavior</option><option value="impersonation">Impersonation</option><option value="other">Other</option></select></label><div><button type="button" className="text-button" onClick={() => setReportTarget(null)}>Cancel</button><button className="outline-button">Submit report</button></div></form>}
  </div>;
}

function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const [form, setForm] = useState({ displayName: user.displayName, bio: user.bio || '', headline: user.headline || '', profileLink: user.profileLink || '', isPrivate: Boolean(user.isPrivate), messagePreference: user.messagePreference || 'followers' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [followRequests, setFollowRequests] = useState([]);
  useEffect(() => {
    api.get('/api/users/follow-requests').then(({ data }) => setFollowRequests(data.requests))
      .catch((requestError) => setError(getApiError(requestError)));
  }, []);
  function update(event) { const { name, value, checked, type } = event.target; setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value })); }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { await api.patch('/api/users/me', form); await refreshUser(); setNotice('Your profile has been updated.'); }
    catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  }
  async function decideRequest(requestId, decision) {
    setError('');
    try {
      await api.patch(`/api/users/follow-requests/${requestId}`, { decision });
      setFollowRequests((current) => current.filter((request) => request._id !== requestId));
    } catch (requestError) { setError(getApiError(requestError)); }
  }
  return <div className="account-page"><form className="profile-form" onSubmit={save}><div className="profile-summary"><div className="avatar profile-large">{user.displayName.slice(0, 1).toUpperCase()}</div><div><strong>{user.displayName}</strong><span>@{user.username}</span></div></div><label>Display name<input name="displayName" value={form.displayName} onChange={update} maxLength="60" required /></label><label>Headline<input name="headline" value={form.headline} onChange={update} maxLength="100" placeholder="A short line about what you do" /></label><label>Bio<textarea name="bio" value={form.bio} onChange={update} maxLength="280" rows="4" placeholder="A little about you" /></label><label>External link<input name="profileLink" type="url" value={form.profileLink} onChange={update} placeholder="https://example.com" /></label><label>Who can message you<select name="messagePreference" value={form.messagePreference} onChange={update}><option value="everyone">Everyone can send a request</option><option value="followers">Followers can message</option><option value="nobody">No new messages</option></select></label><label className="privacy-toggle"><input name="isPrivate" type="checkbox" checked={form.isPrivate} onChange={update} /><span>Private profile <small>Only your followers can view your posts and profile details.</small></span></label>{error && <p className="inline-error" role="alert">{error}</p>}{notice && <p className="success-message" role="status">{notice}</p>}<button className="auth-submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}<span>→</span></button></form>{followRequests.length > 0 && <section className="settings-card follow-requests"><span className="section-kicker">PRIVATE PROFILE</span><h2>Follow requests</h2>{followRequests.map((request) => <div className="follow-request-row" key={request._id}><div className="avatar avatar-you">{request.follower.displayName.slice(0, 1).toUpperCase()}</div><div><strong>{request.follower.displayName}</strong><span>@{request.follower.username}</span></div><button className="outline-button" onClick={() => decideRequest(request._id, 'reject')}>Reject</button><button className="primary-button" onClick={() => decideRequest(request._id, 'approve')}>Approve</button></div>)}</section>}<button className="outline-button account-signout" onClick={() => logout()}>Sign out</button></div>;
}

function SettingsPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/api/users/blocked').then(({ data }) => setUsers(data.users)).catch((requestError) => setError(getApiError(requestError))); }, []);
  async function unblock(username) {
    try { await api.delete(`/api/users/${username}/block`); setUsers((current) => current.filter((person) => person.username !== username)); }
    catch (requestError) { setError(getApiError(requestError)); }
  }
  return <div className="settings-page"><section className="settings-card"><span className="section-kicker">ACCOUNT SAFETY</span><h2>Blocked accounts</h2><p>Blocked people can’t contact you or see your profile and posts.</p>{error && <p className="inline-error" role="alert">{error}</p>}{users.length ? users.map((person) => <div className="blocked-person" key={person._id}><div className="avatar avatar-you">{person.displayName.slice(0, 1).toUpperCase()}</div><div><strong>{person.displayName}</strong><span>@{person.username}</span></div><button className="outline-button" onClick={() => unblock(person.username)}>Unblock</button></div>) : <div className="settings-empty">No blocked accounts.</div>}</section></div>;
}

function PublicProfilePage({ username }) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [composing, setComposing] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => { api.get(`/api/users/${username}`).then(({ data }) => setProfile(data.user)).catch((requestError) => setError(getApiError(requestError))); }, [username]);
  async function toggleFollow() {
    setBusy(true); setError('');
    try {
      const method = profile.isFollowing || profile.hasPendingFollowRequest ? 'delete' : 'post';
      const { data } = await api.request({ method, url: `/api/users/${username}/follow` });
      setProfile((current) => ({ ...current, ...data, isFollowing: data.following,
        hasPendingFollowRequest: Boolean(data.requestPending), canViewDetails: !current.isPrivate || Boolean(data.following) }));
    }
    catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  }
  async function sendMessage(event) {
    event.preventDefault(); if (!message.trim()) return;
    try { const { data } = await api.post(`/api/messages/${username}`, { text: message.trim() }); setMessage(''); setComposing(false); setNotice(data.status === 'pending' ? 'Message request sent.' : 'Message sent.'); if (data.status === 'accepted') navigate('/messages'); }
    catch (requestError) { setError(getApiError(requestError)); }
  }
  if (error && !profile) return <div className="social-empty"><h3>Profile unavailable.</h3><p>{error}</p></div>;
  if (!profile) return <div className="feed-loading">Opening profile…</div>;
  const isSelf = profile._id === currentUser._id;
  return <div className="public-profile"><section className="public-profile-card"><div className="avatar profile-large">{profile.displayName.slice(0, 1).toUpperCase()}</div><div className="public-profile-copy"><h2>{profile.displayName}</h2><span>@{profile.username}</span>{profile.canViewDetails && profile.headline && <p className="profile-headline">{profile.headline}</p>}{profile.canViewDetails && profile.bio && <p>{profile.bio}</p>}{profile.canViewDetails && profile.profileLink && <a href={profile.profileLink} target="_blank" rel="noreferrer">{profile.profileLink}</a>}{profile.canViewDetails && <div className="profile-counts"><span><strong>{profile.followerCount}</strong> followers</span><span><strong>{profile.followingCount}</strong> following</span></div>}{profile.isPrivate && !profile.canViewDetails && <p>This profile is private. Follow to see profile details and posts.</p>}</div>{!isSelf && <div className="public-profile-actions"><button className="outline-button" onClick={toggleFollow} disabled={busy}>{profile.isFollowing ? 'Following' : profile.hasPendingFollowRequest ? 'Requested' : 'Follow'}</button><button className="primary-button" onClick={() => setComposing((value) => !value)}>Message</button></div>}</section>{error && <p className="inline-error" role="alert">{error}</p>}{notice && <p className="success-message" role="status">{notice}</p>}{!isSelf && composing && <form className="first-message-form" onSubmit={sendMessage}><strong>Say hello to @{username}</strong><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength="4000" placeholder="Write a thoughtful message…" required /><div><button type="button" className="text-button" onClick={() => setComposing(false)}>Cancel</button><button className="primary-button" disabled={!message.trim()}>Send message <span>→</span></button></div></form>}{profile.canViewDetails && <SocialPage mode="profile" username={username} />}</div>;
}

function ComingSoon({ title, text, icon: Icon }) {
  return <div className="social-empty"><div className="empty-icon"><Icon size={18} /></div><h3>{title}</h3><p>{text}</p></div>;
}

function MainContent() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/p/')) return <main className="main-content"><Topbar title="Post" /><PageHeading eyebrow="FROM THE COMMUNITY" title="Post" subtitle="A conversation from Chatz." icon={MessageCircle} /><div className="single-column-content"><PostDetail postId={pathname.split('/')[2]} /></div></main>;
  if (pathname.startsWith('/u/')) return <main className="main-content"><Topbar title="Profile" /><PageHeading eyebrow="YOUR PEOPLE" title="A Chatz profile" subtitle="Get to know someone from the community." icon={Users} /><div className="content-grid"><section className="feed-column"><PublicProfilePage username={pathname.split('/')[2]} /></section><aside className="right-rail"><div className="rail-card discover-card"><div className="rail-card-header"><div><span className="section-kicker">FIND YOUR PEOPLE</span><h3>Explore</h3></div><Compass size={19} /></div><NavLink className="rail-link" to="/explore">Back to Explore <span>→</span></NavLink></div></aside></div></main>;
  const pages = {
    '/': ['Home', 'A thoughtful space to share ideas and stay close.', Home],
    '/explore': ['Explore Chatz', 'Find people and conversations that matter to you.', Compass],
    '/messages': ['Messages', 'Your conversations will be right here.', MessageCircle],
    '/notifications': ['Notifications', 'Stay close to the moments that matter.', Bell],
    '/saved': ['Saved posts', 'Keep useful conversations close at hand.', Bookmark],
    '/profile': ['Your profile', 'A little context helps good conversations begin.', Users],
    '/settings': ['Settings', 'Make Chatz feel like your space.', Settings],
  };
  const [title, subtitle, Icon] = pages[pathname] || pages['/'];
  if (pathname === '/messages') return <main className="main-content"><Topbar title={title} /><PageHeading eyebrow="GOOD CONVERSATIONS" title={title} subtitle={subtitle} icon={Icon} /><MessagesPage /></main>;
  return <main className="main-content"><Topbar title={title} /><PageHeading eyebrow="A LITTLE SPACE TO CONNECT" title={title === 'Home' ? 'Your community, in conversation' : title} subtitle={subtitle} icon={Icon} /><div className={`content-grid${pathname === '/' ? ' home-content-grid' : pathname === '/explore' ? ' explore-content-grid' : ''}`}><section className="feed-column">{pathname === '/' ? <SocialPage mode="following" /> : pathname === '/explore' ? <><ExplorePage /><div className="explore-feed"><SocialPage mode="explore" /></div></> : pathname === '/saved' ? <SocialPage mode="saved" /> : pathname === '/profile' ? <ProfilePage /> : pathname === '/notifications' ? <NotificationsPage /> : <SettingsPage />}</section>{pathname === '/' ? <HomeRightRail /> : pathname === '/explore' ? <HomeRightRail className="explore-right-rail" /> : <aside className="right-rail"><div className="rail-card discover-card"><div className="rail-card-header"><div><span className="section-kicker">FIND YOUR PEOPLE</span><h3>Explore</h3></div><Compass size={19} strokeWidth={1.7} /></div><div className="explore-placeholder"><div className="mini-orbit"><span /><span /><span /></div><p>There’s a whole community<br />to meet, one hello at a time.</p></div><NavLink className="rail-link" to="/explore">Browse community <span>→</span></NavLink></div><div className="rail-card online-card"><div className="rail-card-header"><div><span className="section-kicker">STAY IN THE LOOP</span><h3>Conversations</h3></div><MessageCircle size={18} strokeWidth={1.7} /></div><div className="conversation-empty"><div className="conversation-art"><div className="bubble bubble-one">hi!</div><div className="bubble bubble-two">✳</div></div><p>Your messages are waiting<br />for the right hello.</p><NavLink className="outline-button" to="/messages">Open messages</NavLink></div></div><div className="rail-footer"><span>Made for good conversations.</span><span>Chatz © 2026</span></div></aside>}</div></main>;
}

function ProtectedShell() {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-loading">Opening your space…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <div className="app-shell"><Sidebar /><Routes><Route path="*" element={<MainContent />} /></Routes><nav className="mobile-nav" aria-label="Mobile navigation">{navItems.slice(0, 5).map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}><Icon size={19} /><span>{label}</span></NavLink>)}</nav></div>;
}

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('chatz-theme') || 'light');
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('chatz-theme', theme); }, [theme]);
  useEffect(() => { const toggle = () => setTheme((current) => current === 'light' ? 'dark' : 'light'); window.addEventListener('toggle-theme', toggle); return () => window.removeEventListener('toggle-theme', toggle); }, []);
  return <Routes><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/register" element={<AuthPage mode="register" />} /><Route path="*" element={<ProtectedShell />} /></Routes>;
}
