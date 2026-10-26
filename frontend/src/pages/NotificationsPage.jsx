import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, Heart, MessageCircle, UserRound } from 'lucide-react';
import { api, getApiError } from '../services/api.js';

const descriptions = {
  follow: (item) => `${item.actor.displayName} started following you.`,
  like: (item) => `${item.actor.displayName} liked your post.`,
  comment: (item) => `${item.actor.displayName} commented: “${item.text}”`,
  message: (item) => `${item.actor.displayName} sent you a message.`,
  message_request: (item) => `${item.actor.displayName} sent you a message request.`,
};
const icons = { follow: UserRound, like: Heart, comment: MessageCircle, message: MessageCircle, message_request: Bell };

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const { data } = await api.get('/api/notifications'); setItems(data.notifications); setUnread(data.unreadCount); }
    catch (requestError) { setError(getApiError(requestError)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function markOne(id) {
    try { await api.post(`/api/notifications/${id}/read`); setItems((current) => current.map((item) => item._id === id ? { ...item, readAt: new Date() } : item)); setUnread((count) => Math.max(count - 1, 0)); }
    catch (requestError) { setError(getApiError(requestError)); }
  }
  async function markAll() {
    try { await api.post('/api/notifications/read-all'); setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date() }))); setUnread(0); }
    catch (requestError) { setError(getApiError(requestError)); }
  }
  return <section className="notifications-page"><div className="notification-toolbar"><span>{unread ? `${unread} unread` : 'You’re all caught up'}</span>{unread > 0 && <button onClick={markAll}><CheckCheck size={14} /> Mark all read</button>}</div>{error && <p className="inline-error" role="alert">{error}</p>}{loading ? <div className="feed-loading">Checking in…</div> : items.length ? items.map((item) => { const Icon = icons[item.type] || Bell; return <article className={`notification-row${item.readAt ? '' : ' unread'}`} key={item._id} onClick={() => !item.readAt && markOne(item._id)}><div className="notification-icon"><Icon size={16} /></div><p>{descriptions[item.type]?.(item) || 'You have a new update.'}<time>{new Date(item.createdAt).toLocaleString()}</time></p>{!item.readAt && <span className="notification-dot" />}</article>; }) : <div className="social-empty"><div className="empty-icon"><Bell size={18} /></div><h3>Nothing new, for now.</h3><p>Your follows, replies, and messages will show up here.</p></div>}</section>;
}
