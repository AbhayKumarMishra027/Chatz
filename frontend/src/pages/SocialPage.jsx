import { useEffect, useState } from 'react';
import { Bookmark, Flag, Heart, MessageCircle, Pencil, Send, Trash2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { api, getApiError } from '../services/api.js';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { useParams } from 'react-router-dom';

export function PostCard({ post, onChange }) {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('inappropriate');
  const [reportNotice, setReportNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function toggleLike() {
    setBusy(true); setError('');
    try { await api.request({ method: post.likedByMe ? 'delete' : 'put', url: `/api/posts/${post._id}/like` }); onChange(); }
    catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  }
  async function toggleSave() {
    setBusy(true); setError('');
    try { await api.request({ method: post.isSaved ? 'delete' : 'post', url: `/api/posts/${post._id}/save` }); onChange(); }
    catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  }
  async function addComment(event) {
    event.preventDefault(); if (!comment.trim()) return;
    setBusy(true); setError('');
    try { await api.post(`/api/posts/${post._id}/comments`, { text: comment.trim() }); setComment(''); onChange(); }
    catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  }
  async function saveEdit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api.patch(`/api/posts/${post._id}`, { text: editText.trim() }); setEditing(false); onChange(); }
    catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  }
  async function deletePost() {
    if (!window.confirm('Delete this post? This also removes its comments and saved copies.')) return;
    try { await api.delete(`/api/posts/${post._id}`); onChange(); }
    catch (requestError) { setError(getApiError(requestError)); }
  }
  async function reportPost(event) {
    event.preventDefault(); setError('');
    try { await api.post(`/api/reports/post/${post._id}`, { reason: reportReason }); setReporting(false); setReportNotice('Report submitted for review.'); }
    catch (requestError) { setError(getApiError(requestError)); }
  }
  const mine = post.author?._id === user._id;
  return <article className="post-card"><header className="post-header"><div className="avatar post-avatar">{post.author?.displayName?.slice(0, 1).toUpperCase() || '?'}</div><div className="post-author"><strong>{post.author?.displayName || 'Chatz member'}</strong><span>@{post.author?.username || 'member'} · {new Date(post.createdAt).toLocaleDateString()}</span></div>{mine ? <div className="post-tools"><button onClick={() => { setEditText(post.text); setEditing((value) => !value); }} aria-label="Edit post"><Pencil size={13} /></button><button onClick={deletePost} aria-label="Delete post"><Trash2 size={14} /></button></div> : <button className="post-report" onClick={() => setReporting((value) => !value)} aria-label="Report post"><Flag size={13} /></button>}</header>{editing ? <form className="edit-post-form" onSubmit={saveEdit}><textarea value={editText} onChange={(event) => setEditText(event.target.value)} maxLength="2000" required /><div><button type="button" className="text-button" onClick={() => setEditing(false)}>Cancel</button><button className="outline-button" disabled={busy || !editText.trim()}>Save edit</button></div></form> : <p className="post-text">{post.text}</p>}{reporting && <form className="report-form" onSubmit={reportPost}><label>Report reason<select value={reportReason} onChange={(event) => setReportReason(event.target.value)}><option value="inappropriate">Inappropriate content</option><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="other">Other</option></select></label><button className="outline-button">Submit report</button></form>}{reportNotice && <p className="success-message">{reportNotice}</p>}<div className="post-actions"><button className={`post-action${post.likedByMe ? ' selected' : ''}`} onClick={toggleLike} disabled={busy} aria-label={post.likedByMe ? 'Unlike post' : 'Like post'}><Heart size={16} fill={post.likedByMe ? 'currentColor' : 'none'} />{post.likeCount || 0}</button><button className={`post-action${commentsOpen ? ' selected' : ''}`} onClick={() => setCommentsOpen((open) => !open)} aria-expanded={commentsOpen} aria-label={`${commentsOpen ? 'Hide' : 'Show'} ${post.comments?.length || 0} comments`}><MessageCircle size={16} />{post.comments?.length || 0}</button><button className={`post-action save-action${post.isSaved ? ' selected' : ''}`} onClick={toggleSave} disabled={busy} aria-label={post.isSaved ? 'Remove saved post' : 'Save post'}><Bookmark size={16} fill={post.isSaved ? 'currentColor' : 'none'} /></button></div>{commentsOpen && <><div className="comment-list">{post.comments?.slice(-3).map((item) => <div className="comment" key={item._id}><strong>{item.author?.displayName || 'Member'}</strong><span>{item.text}</span></div>)}{!post.comments?.length && <p className="comments-empty">No comments yet. Start the conversation.</p>}</div><form className="comment-form" onSubmit={addComment}><input value={comment} onChange={(event) => setComment(event.target.value)} maxLength="1000" placeholder="Add a thoughtful comment…" aria-label="Add a comment" /><button disabled={busy || !comment.trim()} aria-label="Send comment"><Send size={15} /></button></form></>}{error && <p className="inline-error" role="alert">{error}</p>}</article>;
}

export function PostDetail({ postId }) {
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true); setError('');
    try { const { data } = await api.get(`/api/posts/${postId}`); setPost(data.post); }
    catch (requestError) { setError(getApiError(requestError)); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [postId]);
  if (loading) return <div className="feed-loading">Opening post…</div>;
  if (error || !post) return <div className="social-empty"><h3>Post unavailable.</h3><p>{error || 'This post could not be found.'}</p></div>;
  return <section className="post-detail"><PostCard post={post} onChange={load} /></section>;
}

export default function SocialPage({ mode = 'following', username: givenUsername }) {
  const routeParams = useParams();
  const username = givenUsername || routeParams.username;
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function load() {
    setLoading(true); setError('');
    try {
      const endpoint = mode === 'saved' ? '/api/saved' : mode === 'profile' ? `/api/users/${username}/posts` : `/api/posts?feed=${mode}`;
      const { data } = await api.get(endpoint);
      setPosts(data.posts);
    } catch (requestError) { setError(getApiError(requestError)); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [mode, username]);
  async function createPost(event) {
    event.preventDefault(); if (!text.trim()) return;
    setBusy(true); setError(''); setSuccess('');
    try { await api.post('/api/posts', { text: text.trim(), visibility }); setText(''); setSuccess('Your post is live.'); await load(); }
    catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  }
  const title = mode === 'saved' ? 'Saved posts' : mode === 'explore' ? 'Explore posts' : mode === 'profile' ? 'Posts' : 'Your feed';
  return <section className="social-page"><div className="social-page-heading"><div><span className="section-kicker">{mode === 'following' ? 'FOLLOWING' : mode === 'saved' ? 'JUST FOR YOU' : mode === 'profile' ? 'ON THIS PROFILE' : 'FROM THE COMMUNITY'}</span><h2>{title}</h2></div><button className="refresh-button" onClick={load} disabled={loading}>Refresh</button></div>{mode === 'following' && <form className="composer" onSubmit={createPost}><div className="composer-top"><textarea value={text} onChange={(event) => setText(event.target.value)} maxLength="2000" placeholder="What’s on your mind? Share it with your community…" aria-label="Write a post" /><span>{text.length}/2000</span></div><div className="composer-bottom"><label className="visibility-label">Visible to <select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="public">Everyone</option><option value="followers">Followers</option></select></label><button className="primary-button" disabled={busy || !text.trim()}>{busy ? 'Sharing…' : 'Share post'} <span>↗</span></button></div></form>}{success && <p className="success-message" role="status">{success}</p>}{error && <p className="inline-error" role="alert">{error}</p>}{loading ? <div className="feed-loading">Gathering conversations…</div> : posts.length ? <div className="post-list">{posts.map((post) => <PostCard key={post._id} post={post} onChange={load} />)}</div> : <div className="social-empty"><div className="empty-icon"><MessageCircle size={19} /></div><h3>{mode === 'following' ? 'Your feed starts with a hello.' : mode === 'saved' ? 'Nothing saved yet.' : 'A fresh start.'}</h3><p>{mode === 'following' ? 'Follow people to see their posts here, or share your own thought.' : mode === 'saved' ? 'Save posts you want to come back to.' : 'No posts are available here yet.'}</p>{mode === 'following' && <NavLink className="primary-button" to="/explore">Find people to follow <span>→</span></NavLink>}</div>}</section>;
}
