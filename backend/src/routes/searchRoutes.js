import { Router } from 'express';
import { Block } from '../models/Block.js';
import { Follow } from '../models/Follow.js';
import { Post } from '../models/Post.js';
import { SavedPost } from '../models/SavedPost.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { canView } from './postRoutes.js';

export const searchRoutes = Router();
searchRoutes.use(requireAuth);

searchRoutes.get('/', async (req, res, next) => {
  try {
    const term = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 60) : '';
    if (term.length < 2) return res.json({ users: [], posts: [] });
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escaped, 'i');
    const blocked = await Block.find({ $or: [{ blocker: req.user._id }, { blocked: req.user._id }] }).select('blocker blocked').lean();
    const blockedIds = blocked.map((item) => item.blocker.toString() === req.user.id ? item.blocked : item.blocker);

    const users = await User.find({ _id: { $ne: req.user._id, $nin: blockedIds }, $or: [{ username: pattern }, { displayName: pattern }] })
      .select('username displayName headline avatarUrl isPrivate').sort({ username: 1 }).limit(8).lean();
    const follows = users.length ? await Follow.find({ follower: req.user._id, following: { $in: users.map((person) => person._id) } }).select('following').lean() : [];
    const followedIds = new Set(follows.map((item) => item.following.toString()));
    const userResults = users.map((person) => {
      const isFollowing = followedIds.has(person._id.toString());
      const { headline, avatarUrl, ...identity } = person;
      return { ...identity, ...(person.isPrivate && !isFollowing ? {} : { headline, avatarUrl }), canViewDetails: !person.isPrivate || isFollowing, isFollowing };
    });

    const matches = await Post.find({ text: pattern }).sort({ createdAt: -1, _id: -1 }).limit(60)
      .populate({ path: 'author', select: 'username displayName avatarUrl headline isPrivate' })
      .populate({ path: 'comments.author', select: 'username displayName avatarUrl headline' }).lean();
    const visible = [];
    for (const post of matches) {
      if (!post.author || blockedIds.some((id) => id.toString() === post.author._id.toString())) continue;
      if (await canView(post, req.user._id)) visible.push(post);
      if (visible.length >= 8) break;
    }
    const savedRows = visible.length ? await SavedPost.find({ user: req.user._id, post: { $in: visible.map((post) => post._id) } }).select('post').lean() : [];
    const savedIds = new Set(savedRows.map((item) => item.post.toString()));
    const postResults = visible.map((post) => ({ ...post, likeCount: post.likes.length,
      likedByMe: post.likes.some((id) => id.toString() === req.user.id), isSaved: savedIds.has(post._id.toString()), likes: undefined }));
    res.json({ users: userResults, posts: postResults });
  } catch (error) { next(error); }
});
