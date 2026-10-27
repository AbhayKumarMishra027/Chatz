function avatarRevision(url) {
  const match = String(url || '').match(/[?&]v=(\d+)(?:&|$)/);
  return match ? Number(match[1]) : 0;
}

export function mergeCurrentUser(currentUser, updatedUser) {
  if (!updatedUser) return currentUser;
  if (!currentUser) return updatedUser;
  if (String(currentUser._id) !== String(updatedUser._id)) return currentUser;
  const merged = { ...currentUser, ...updatedUser };
  if (avatarRevision(currentUser.avatarUrl) > avatarRevision(updatedUser.avatarUrl)) {
    merged.avatarUrl = currentUser.avatarUrl;
  }
  return merged;
}

export function hydrateCurrentUser(currentUser, hydratedUser) {
  return currentUser ? mergeCurrentUser(currentUser, hydratedUser) : hydratedUser || null;
}

export function resolveAvatarUrl(currentUser, entityUserId, storedAvatarUrl = '') {
  if (currentUser && entityUserId && String(currentUser._id) === String(entityUserId)) return currentUser.avatarUrl || '';
  return storedAvatarUrl || '';
}
