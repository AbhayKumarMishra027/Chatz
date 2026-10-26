import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { ArrowLeft, Check, MessageCircle, MoreHorizontal, Send } from 'lucide-react';
import { api, getApiError } from '../services/api.js';
import { useAuth } from '../features/auth/AuthContext.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function MessagesPage({ initialConversationId = null, quickChat = false, onConversationsChange = () => {} }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mobileChat, setMobileChat] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  const loadInbox = useCallback(async () => {
    try {
      const [conversationResult, requestResult] = await Promise.all([api.get('/api/messages'), api.get('/api/messages/requests')]);
      setConversations(conversationResult.data.conversations);
      onConversationsChange(conversationResult.data.conversations);
      setRequests(requestResult.data.requests);
      setError('');
    } catch (requestError) { setError(getApiError(requestError)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadInbox();
    const socket = io(API_URL, { withCredentials: true, autoConnect: true });
    socketRef.current = socket;
    socket.on('message:new', (message) => setMessages((current) => current.some((item) => item._id === message._id) ? current : [...current, message]));
    socket.on('read:update', ({ conversationId, userId: readerId }) => { if (active?._id === conversationId) setMessages((current) => current.map((item) => item.sender?._id === readerId ? item : ({ ...item, readBy: item.readBy.includes(readerId) ? item.readBy : [...item.readBy, readerId] }))); });
    socket.on('message:changed', ({ messageId, action }) => setMessages((current) => current.map((item) => item._id !== messageId ? item : ({ ...item, text: action === 'deleted-for-everyone' ? 'This message was deleted.' : item.text, deletedForMe: action === 'deleted-for-me' || item.deletedForMe }))));
    socket.on('typing:update', ({ conversationId, userId, typing: activeTyping }) => { if (active?._id === conversationId && userId !== user._id) setTyping(activeTyping); });
    socket.on('conversation:update', () => loadInbox());
    socket.on('message-request:new', () => loadInbox());
    socket.on('message-request:updated', () => loadInbox());
    socket.on('presence:update', ({ userId, online }) => setConversations((current) => current.map((item) => item.participant._id === userId ? { ...item, participant: { ...item.participant, online } } : item)));
    return () => { socket.disconnect(); clearTimeout(typingTimer.current); };
  }, [loadInbox, user._id, active?._id]);

  useEffect(() => {
    if (!initialConversationId) return;
    const conversation = conversations.find((item) => item._id === initialConversationId);
    if (conversation && active?._id !== conversation._id) {
      setActive(conversation);
      setMobileChat(true);
    }
  }, [initialConversationId, conversations, active?._id]);

  useEffect(() => {
    if (!active) { setMessages([]); return; }
    let alive = true;
    async function openConversation() {
      setError(''); setMessages([]); setLoading(true);
      try {
        const { data } = await api.get(`/api/messages/${active._id}/messages`);
        if (!alive) return;
        setMessages(data.messages);
        setNextCursor(data.nextCursor);
        await api.post(`/api/messages/${active._id}/read`);
        socketRef.current?.emit('conversation:join', { conversationId: active._id }, (result) => { if (result?.error) setError(result.error); });
        loadInbox();
      } catch (requestError) { if (alive) setError(getApiError(requestError)); }
      finally { if (alive) setLoading(false); }
    }
    openConversation();
    return () => { alive = false; socketRef.current?.emit('typing:stop', { conversationId: active._id }); };
  }, [active?._id, loadInbox]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);

  async function openChat(conversation) {
    setActive(conversation);
    setMobileChat(true);
    setConversations((current) => current.map((item) => item._id === conversation._id ? { ...item, unreadCount: 0 } : item));
  }

  async function loadOlder() {
    if (!active || !nextCursor) return;
    setBusy(true);
    try {
      const { data } = await api.get(`/api/messages/${active._id}/messages?before=${nextCursor}`);
      setMessages((current) => [...data.messages, ...current]);
      setNextCursor(data.nextCursor);
    } catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  }

  async function respondToRequest(conversationId, decision) {
    setBusy(true); setError('');
    try {
      await api.patch(`/api/messages/requests/${conversationId}`, { decision });
      await loadInbox();
      if (decision === 'accept') {
        const item = requests.find((request) => request.conversation._id === conversationId);
        if (item) await openChat({ _id: conversationId, participant: item.sender, lastMessage: item.preview?.text || '' });
      }
    } catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  }

  async function sendMessage(event) {
    event.preventDefault(); if (!draft.trim() || !active) return;
    const text = draft.trim(); setDraft(''); setError('');
    try {
      const { data } = await api.post(`/api/messages/${active._id}/messages`, { text });
      setMessages((current) => current.some((item) => item._id === data.message._id) ? current : [...current, data.message]);
      await loadInbox();
    } catch (requestError) { setDraft(text); setError(getApiError(requestError)); }
  }

  function draftChanged(value) {
    setDraft(value);
    if (!active || !socketRef.current?.connected) return;
    socketRef.current.emit('typing:start', { conversationId: active._id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socketRef.current?.emit('typing:stop', { conversationId: active._id }), 900);
  }

  async function deleteMessage(message, everyone = false) {
    try {
      await api.delete(`/api/messages/message/${message._id}${everyone ? '/everyone' : ''}`);
      setMessages((current) => current.map((item) => item._id !== message._id ? item : ({ ...item, text: everyone ? 'This message was deleted.' : 'You deleted this message.', deletedForMe: !everyone, deletedForEveryone: everyone })));
    } catch (requestError) { setError(getApiError(requestError)); }
  }

  return <section className={`messages-layout${mobileChat || quickChat ? ' mobile-chat-open' : ''}${quickChat ? ' quick-chat-layout' : ''}`}><aside className="inbox-panel"><div className="inbox-heading"><div><span className="section-kicker">YOUR SPACE</span><h2>Messages</h2></div><button className="refresh-button" onClick={loadInbox}>Refresh</button></div>{requests.length > 0 && <section className="requests-section"><div className="inbox-subheading">MESSAGE REQUESTS <span>{requests.length}</span></div>{requests.map(({ conversation, sender, preview }) => <article className="request-row" key={conversation._id}><div className="avatar request-avatar">{sender.displayName.slice(0, 1).toUpperCase()}</div><div className="request-copy"><strong>{sender.displayName}</strong><p>{preview?.text || 'Sent you a message request.'}</p><div className="request-actions"><button onClick={() => respondToRequest(conversation._id, 'accept')} disabled={busy}><Check size={12} /> Accept</button><button onClick={() => respondToRequest(conversation._id, 'reject')} disabled={busy}>Decline</button></div></div></article>)}</section>}<div className="inbox-subheading">CONVERSATIONS</div>{loading && !conversations.length ? <div className="inbox-empty">Loading conversations…</div> : conversations.length ? conversations.map((conversation) => <button className={`conversation-row${active?._id === conversation._id ? ' selected' : ''}`} key={conversation._id} onClick={() => openChat(conversation)}><div className="avatar conversation-avatar">{conversation.participant.displayName.slice(0, 1).toUpperCase()}<span className={conversation.participant.online ? 'online-dot online' : 'online-dot'} /></div><span className="conversation-copy"><strong>{conversation.participant.displayName}</strong><span>{conversation.lastMessage || 'Say hello and start a conversation'}</span></span><span className="conversation-meta">{conversation.unreadCount > 0 && <i>{conversation.unreadCount}</i>}</span></button>) : <div className="inbox-empty"><div className="empty-icon"><MessageCircle size={17} /></div><p>No conversations yet.<br />Find someone in Explore.</p></div>}</aside><div className="chat-panel">{active ? <><header className="chat-header"><button className="back-inbox" onClick={() => setMobileChat(false)} aria-label="Back to conversations"><ArrowLeft size={18} /></button><div className="avatar conversation-avatar">{active.participant.displayName.slice(0, 1).toUpperCase()}</div><div className="chat-person"><strong>{active.participant.displayName}</strong><span>{active.participant.online ? 'Online now' : `@${active.participant.username}`}</span></div><button className="icon-button" aria-label="Conversation options"><MoreHorizontal size={18} /></button></header><div className="message-history">{loading ? <div className="feed-loading">Opening conversation…</div> : messages.length ? messages.map((message) => { const own = message.sender?._id === user._id; return <div className={`message-line${own ? ' own' : ''}`} key={message._id}><div className="message-bubble"><p>{message.text}</p><div className="message-meta"><time>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>{own && <button onClick={() => deleteMessage(message)} aria-label="Delete message for me">Delete for me</button>}{own && !message.deletedForEveryone && <button onClick={() => deleteMessage(message, true)} aria-label="Delete message for everyone">Delete for everyone</button>}</div></div></div>; }) : <div className="chat-empty"><div className="empty-icon"><MessageCircle size={18} /></div><p>A good conversation starts with a hello.</p></div>}{typing && <div className="typing-status">Typing…</div>}<div ref={bottomRef} /></div>{error && <p className="inline-error chat-error" role="alert">{error}</p>}<form className="message-composer" onSubmit={sendMessage}><input value={draft} onChange={(event) => draftChanged(event.target.value)} maxLength="4000" placeholder="Write a message…" aria-label="Write a message" /><button disabled={!draft.trim()} aria-label="Send message"><Send size={17} /></button></form></> : <div className="chat-welcome"><div className="chat-welcome-orbit"><MessageCircle size={27} /></div><h3>Your conversations, in good company.</h3><p>Choose a conversation or find someone new to say hello to.</p></div>}</div></section>;
}
