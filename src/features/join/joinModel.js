export function existingParticipantAction(preview, session) {
  const boardId = preview?.boardId;
  if (typeof boardId !== "string" || !boardId || !session) return null;
  return { boardId, shouldReturn: true };
}
