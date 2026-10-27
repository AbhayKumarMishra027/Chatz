import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
}, { timestamps: true });

const imageSchema = new mongoose.Schema({
  cloudinaryUrl: { type: String, required: true, select: false },
  publicId: { type: String, required: true, select: false },
  width: { type: Number, required: true, min: 1 },
  height: { type: Number, required: true, min: 1 },
  format: { type: String, enum: ['jpg', 'png', 'webp', 'gif'], required: true },
  bytes: { type: Number, required: true, min: 1 },
}, { _id: false });

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text: { type: String, required() { return !this.image; }, trim: true, maxlength: 2000, default: '' },
  image: { type: imageSchema, default: undefined },
  visibility: { type: String, enum: ['public', 'followers'], default: 'public', index: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
}, { timestamps: true });
postSchema.index({ createdAt: -1, _id: -1 });
postSchema.index({ author: 1, createdAt: -1, _id: -1 });
export const Post = mongoose.model('Post', postSchema);
