import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireClientOrigin } from '../middleware/requireClientOrigin.js';
import { User } from '../models/User.js';
import { Follow } from '../models/Follow.js';
import { FollowRequest } from '../models/FollowRequest.js';
import { Block } from '../models/Block.js';
import { createNotification } from '../services/notifications.js';
import { Post } from '../models/Post.js';
import { SavedPost } from '../models/SavedPost.js';
import { decideFollowRequest, followProfile, hasAcceptedFollow } from '../services/followRequests.js';

export const userRoutes = Router();
const updateSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  bio: z.string().trim().max(280).optional(),
  headline: z.string().trim().max(100).optional(),
  profileLink: z.union([z.string().trim().max(200).url(), z.literal('')]).optional(),
  isPrivate: z.boolean().optional(),
  messagePreference: z.enum(['everyone', 'followers', 'nobody']).optional(),
}).strict();

userRoutes.get('/search', requireAuth, async (req, res, next) => {
  try {
    const term = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 40) : '';
    if (term.length < 2) return res.json({ users: [] });
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const blocked = await Block.find({ $or: [{ blocker: req.user._id }, { blocked: req.user._id }] }).select('blocker blocked').lean();
    const blockedIds = blocked.map((item) => item.blocker.toString() === req.user.id ? item.blocked : item.blocker);
    const users = await User.find({ _id: { $ne: req.user._id, $nin: blockedIds }, isPrivate: false, $or: [{ username: new RegExp(escaped, 'i') }, { displayName: new RegExp(escaped, 'i') }] })
      .select('username displayName headline avatarUrl').sort({ username: 1 }).limit(20).lean();
    const followed = await Follow.find({ follower: req.user._id, following: { $in: users.map((user) => user._id) } }).select('following').lean();
    const followedIds = new Set(followed.map((item) => item.following.toString()));
    res.json({ users: users.map((user) => ({ ...user, isFollowing: followedIds.has(user._id.toString()) })) });
  } catch (error) { next(error); }
});

userRoutes.get('/suggestions', requireAuth, async (req, res, next) => {
  try {
    const blocked = await Block.find({ $or: [{ blocker: req.user._id }, { blocked: req.user._id }] })
      .select('blocker blocked').lean();
    const blockedIds = blocked.map((item) => item.blocker.toString() === req.user.id ? item.blocked : item.blocker);
    const users = await User.find({ _id: { $ne: req.user._id, $nin: blockedIds }, isPrivate: false })
      .select('username displayName headline avatarUrl').sort({ createdAt: -1 }).limit(8).lean();
    const follows = users.length ? await Follow.find({ follower: req.user._id, following: { $in: users.map((person) => person._id) } }).select('following').lean() : [];
    const followingIds = new Set(follows.map((item) => item.following.toString()));
    res.json({ users: users.map((person) => ({ ...person, isFollowing: followingIds.has(person._id.toString()) })) });
  } catch (error) { next(error); }
});

userRoutes.get('/blocked', requireAuth, async (req, res, next) => {
  try {
    const rows = await Block.find({ blocker: req.user._id }).populate('blocked', 'username displayName avatarUrl').sort({ createdAt: -1 });
    res.json({ users: rows.filter((row) => row.blocked).map((row) => row.blocked) });
  } catch (error) { next(error); }
});

userRoutes.get('/follow-requests', requireAuth, async (req, res, next) => {
  try {
    const requests = await FollowRequest.find({ following: req.user._id })
      .sort({ createdAt: -1 }).populate('follower', 'username displayName avatarUrl').lean();
    res.json({ requests: requests.filter((request) => request.follower) });
  } catch (error) { next(error); }
});

userRoutes.patch('/follow-requests/:requestId', requireAuth, requireClientOrigin, async (req, res, next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.requestId)) return res.status(400).json({ error: { message: 'Invalid follow request ID.' } });
    const decision = req.body?.decision;
    if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ error: { message: 'Choose approve or reject.' } });
    const request = await FollowRequest.findById(req.params.requestId);
    const result = await decideFollowRequest({ request, ownerId: req.user._id, decision, Follow, FollowRequest });
    if (result.status === 'not-found') return res.status(404).json({ error: { message: 'Follow request not found.' } });
    if (result.status === 'self-request') return res.status(403).json({ error: { message: 'You cannot approve your own follow request.' } });
    res.json({ status: result.status });
  } catch (error) { next(error); }
});

userRoutes.get('/:username', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) return res.status(404).json({ error: { message: 'We could not find that profile.' } });
    const isSelf = user.id === req.user.id;
    if (!isSelf && await Block.exists({ $or: [{ blocker: req.user._id, blocked: user._id }, { blocker: user._id, blocked: req.user._id }] })) return res.status(404).json({ error: { message: 'We could not find that profile.' } });
    const [isFollowing, followerCount, followingCount, hasPendingFollowRequest] = await Promise.all([
      isSelf ? false : hasAcceptedFollow(req.user._id, user._id, Follow),
      Follow.countDocuments({ following: user._id }),
      Follow.countDocuments({ follower: user._id }),
      isSelf ? false : FollowRequest.exists({ follower: req.user._id, following: user._id }),
    ]);
    const canViewDetails = isSelf || !user.isPrivate || Boolean(isFollowing);
    const details = canViewDetails ? user.toJSON() : {
      _id: user._id, username: user.username, displayName: user.displayName,
      isPrivate: true,
    };
    res.json({ user: { ...details, isPrivate: user.isPrivate, canViewDetails,
      ...(canViewDetails ? { followerCount, followingCount } : {}),
      isFollowing: Boolean(isFollowing), hasPendingFollowRequest: Boolean(hasPendingFollowRequest) } });
  } catch (error) { next(error); }
});

userRoutes.patch('/me', requireAuth, requireClientOrigin, async (req, res, next) => {
  try {
    const result = updateSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: { message: result.error.issues.map((issue) => issue.message).join(' ') } });
    const user = await User.findByIdAndUpdate(req.user.id, { $set: result.data }, { new: true, runValidators: true });
    res.json({ user: user.toJSON() });
  } catch (error) { next(error); }
});

userRoutes.get('/:username/posts', requireAuth, async (req, res, next) => {
  try {
    const profile = await User.findOne({ username: req.params.username.toLowerCase() }).select('_id isPrivate');
    if (!profile) return res.status(404).json({ error: { message: 'We could not find that profile.' } });
    const isSelf = profile.id === req.user.id;
    if (!isSelf && await Block.exists({ $or: [{ blocker: req.user._id, blocked: profile._id }, { blocker: profile._id, blocked: req.user._id }] })) return res.status(404).json({ error: { message: 'We could not find that profile.' } });
    const isFollowing = isSelf || await hasAcceptedFollow(req.user._id, profile._id, Follow);
    if (profile.isPrivate && !isFollowing) return res.status(403).json({ error: { message: 'This profile is private.' } });
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 30);
    const query = { author: profile._id };
    if (!isFollowing) query.visibility = 'public';
    const posts = await Post.find(query).sort({ createdAt: -1, _id: -1 }).limit(limit).populate('author', 'username displayName avatarUrl headline').populate('comments.author', 'username displayName avatarUrl').lean();
    const saved = posts.length ? await SavedPost.find({ user: req.user._id, post: { $in: posts.map((post) => post._id) } }).select('post').lean() : [];
    const savedIds = new Set(saved.map((item) => item.post.toString()));
    res.json({ posts: posts.map((post) => ({ ...post, likeCount: post.likes.length, likedByMe: post.likes.some((id) => id.toString() === req.user.id), isSaved: savedIds.has(post._id.toString()), likes: undefined })) });
  } catch (error) { next(error); }
});

userRoutes.post('/:username/follow', requireAuth, requireClientOrigin, async (req, res, next) => {
  try {
    const target = await User.findOne({ username: req.params.username.toLowerCase() }).select('_id isPrivate');
    if (!target) return res.status(404).json({ error: { message: 'We could not find that profile.' } });
    if (target.id === req.user.id) return res.status(400).json({ error: { message: 'You cannot follow yourself.' } });
    if (await Block.exists({ $or: [{ blocker: req.user._id, blocked: target._id }, { blocker: target._id, blocked: req.user._id }] })) return res.status(403).json({ error: { message: 'This follow is not available.' } });
    const result = await followProfile({ requesterId: req.user._id, target, Follow, FollowRequest });
    if (result.created && result.following) await createNotification({ recipient: target._id, actor: req.user._id, type: 'follow' });
    const [followers, following] = await Promise.all([Follow.countDocuments({ following: target._id }), Follow.countDocuments({ follower: target._id })]);
    res.json({ ...result, followerCount: followers, followingCount: following });
  } catch (error) {
    if (error.code === 11000) return res.json({ following: true });
    next(error);
  }
});

userRoutes.delete('/:username/follow', requireAuth, requireClientOrigin, async (req, res, next) => {
  try {
    const target = await User.findOne({ username: req.params.username.toLowerCase() }).select('_id');
    if (!target) return res.status(404).json({ error: { message: 'We could not find that profile.' } });
    await Promise.all([
      Follow.deleteOne({ follower: req.user._id, following: target._id }),
      FollowRequest.deleteOne({ follower: req.user._id, following: target._id }),
    ]);
    const [followers, following] = await Promise.all([Follow.countDocuments({ following: target._id }), Follow.countDocuments({ follower: target._id })]);
    res.json({ following: false, followerCount: followers, followingCount: following });
  } catch (error) { next(error); }
});

userRoutes.post('/:username/block', requireAuth, requireClientOrigin, async (req, res, next) => {
  try {
    const target = await User.findOne({ username: req.params.username.toLowerCase() }).select('_id');
    if (!target) return res.status(404).json({ error: { message: 'We could not find that account.' } });
    if (target.id === req.user.id) return res.status(400).json({ error: { message: 'You cannot block yourself.' } });
    await Block.updateOne({ blocker: req.user._id, blocked: target._id }, { $setOnInsert: { blocker: req.user._id, blocked: target._id } }, { upsert: true });
    const relationship = { $or: [{ follower: req.user._id, following: target._id }, { follower: target._id, following: req.user._id }] };
    await Promise.all([
      Follow.deleteMany(relationship),
      FollowRequest.deleteMany(relationship),
    ]);
    res.json({ blocked: true });
  } catch (error) { next(error); }
});

userRoutes.delete('/:username/block', requireAuth, requireClientOrigin, async (req, res, next) => {
  try {
    const target = await User.findOne({ username: req.params.username.toLowerCase() }).select('_id');
    if (!target) return res.status(404).json({ error: { message: 'We could not find that account.' } });
    await Block.deleteOne({ blocker: req.user._id, blocked: target._id });
    res.json({ blocked: false });
  } catch (error) { next(error); }
});
