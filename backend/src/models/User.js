import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true, lowercase: true, minlength: 3, maxlength: 24 },
  email: { type: String, required: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true, select: false },
  displayName: { type: String, required: true, trim: true, maxlength: 60 },
  bio: { type: String, trim: true, maxlength: 280, default: '' },
  headline: { type: String, trim: true, maxlength: 100, default: '' },
  profileLink: { type: String, trim: true, maxlength: 200, default: '' },
  avatarUrl: { type: String, default: '' },
  isPrivate: { type: Boolean, default: false },
  messagePreference: { type: String, enum: ['everyone', 'followers', 'nobody'], default: 'followers' },
}, { timestamps: true, toJSON: { transform(_doc, ret) { delete ret.passwordHash; delete ret.email; return ret; } } });

userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

export const User = mongoose.model('User', userSchema);
