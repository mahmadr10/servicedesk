import { RefreshToken } from "../models/RefreshToken";

export function storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
  return RefreshToken.create({ user: userId, tokenHash, expiresAt });
}

export function findActiveRefreshToken(tokenHash: string) {
  return RefreshToken.findOne({ tokenHash, revoked: false, expiresAt: { $gt: new Date() } });
}

export function revokeRefreshToken(tokenHash: string) {
  return RefreshToken.updateOne({ tokenHash }, { revoked: true });
}

// Used on logout-everywhere / password-change scenarios (not currently
// exposed via an endpoint, but here so the seam exists if that's needed).
export function revokeAllForUser(userId: string) {
  return RefreshToken.updateMany({ user: userId, revoked: false }, { revoked: true });
}
