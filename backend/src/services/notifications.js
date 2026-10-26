import { Notification } from '../models/Notification.js';
import { emitToUser } from '../realtime/socketServer.js';

export async function createNotification({ recipient, actor, type, entityId, text = '' }) {
  if (!recipient || recipient.toString() === actor.toString()) return null;
  const notification = await Notification.create({ recipient, actor, type, entityId, text });
  const populated = await Notification.findById(notification._id).populate('actor', 'username displayName avatarUrl').lean();
  emitToUser(recipient, 'notification:new', populated);
  return populated;
}
