import { Router } from 'express';
import mongoose from 'mongoose';
import { Notification } from '../models/Notification.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireClientOrigin } from '../middleware/requireClientOrigin.js';
import { emitToUser } from '../realtime/socketServer.js';

export const notificationRoutes = Router();
notificationRoutes.use(requireAuth);

notificationRoutes.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 30, 1), 50);
    const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(limit).populate('actor', 'username displayName avatarUrl').lean();
    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, readAt: null });
    res.json({ notifications, unreadCount });
  } catch (error) { next(error); }
});

notificationRoutes.post('/read-all', requireClientOrigin, async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    emitToUser(req.user._id, 'notifications:count', { unreadCount: 0 });
    res.json({ read: true });
  } catch (error) { next(error); }
});

notificationRoutes.post('/:notificationId/read', requireClientOrigin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.notificationId)) return res.status(400).json({ error: { message: 'Invalid notification ID.' } });
    const notification = await Notification.findOneAndUpdate({ _id: req.params.notificationId, recipient: req.user._id }, { $set: { readAt: new Date() } }, { new: true });
    if (!notification) return res.status(404).json({ error: { message: 'Notification not found.' } });
    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, readAt: null });
    emitToUser(req.user._id, 'notifications:count', { unreadCount });
    res.json({ read: true });
  } catch (error) { next(error); }
});
