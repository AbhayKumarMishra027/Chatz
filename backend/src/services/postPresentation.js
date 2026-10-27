export function postForClient(post) {
  const value = post?.toObject ? post.toObject() : post;
  if (!value?.image) return value;
  const { cloudinaryUrl: _cloudinaryUrl, publicId: _publicId, ...metadata } = value.image;
  return { ...value, image: { ...metadata, url: `/api/media/posts/${value._id}/image` } };
}
