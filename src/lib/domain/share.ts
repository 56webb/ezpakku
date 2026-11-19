import type { AppState, Result, SharePermission } from "@/lib/types";

export function setSharePermission(
  state: AppState,
  userId: string,
  journeyId: string,
  permission: SharePermission,
): Result<{ state: AppState; token: string }> {
  const journey = state.journeys.find((entry) => entry.id === journeyId);
  if (!journey) return { ok: false, reason: "找不到清單" };
  if (journey.ownerId !== userId) return { ok: false, reason: "只有建立者能分享" };

  const existing = state.shares.find((share) => share.journeyId === journeyId);
  if (!existing) {
    const share = {
      id: crypto.randomUUID(),
      journeyId,
      token: crypto.randomUUID().replaceAll("-", ""),
      permission,
      createdBy: userId,
    };
    return {
      ok: true,
      token: share.token,
      state: { ...state, shares: [...state.shares, share] },
    };
  }

  return {
    ok: true,
    token: existing.token,
    state: {
      ...state,
      shares: state.shares.map((share) =>
        share.id === existing.id ? { ...share, permission } : share,
      ),
      shareMembers:
        permission === "read_only"
          ? state.shareMembers.filter((member) => member.shareId !== existing.id)
          : state.shareMembers,
    },
  };
}

export function openShare(
  state: AppState,
  userId: string,
  token: string,
): Result<{ state: AppState; journeyId: string; permission: SharePermission }> {
  const share = state.shares.find((entry) => entry.token === token);
  if (!share) return { ok: false, reason: "找不到這份分享" };
  if (share.permission !== "editable" || share.createdBy === userId) {
    return { ok: true, state, journeyId: share.journeyId, permission: share.permission };
  }
  const joined = state.shareMembers.some(
    (member) => member.shareId === share.id && member.userId === userId,
  );
  if (joined) {
    return { ok: true, state, journeyId: share.journeyId, permission: share.permission };
  }
  return {
    ok: true,
    journeyId: share.journeyId,
    permission: share.permission,
    state: {
      ...state,
      shareMembers: [...state.shareMembers, { shareId: share.id, userId }],
    },
  };
}
