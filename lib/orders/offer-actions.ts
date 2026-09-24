export type OfferActionResult = { error: string | null };

/**
 * Worker accepts their current offer. Atomic conditional update — only
 * succeeds if the booking is still OFFERED and assigned to this worker,
 * preventing double acceptance / accepting an expired offer.
 */
export async function acceptOffer(
  authUserId: string,
  orderId: string,
): Promise<OfferActionResult> {
  return { error: "Automatic dispatch offers are disabled. Assignment is managed manually by the admin." };
}

/**
 * Worker rejects their current offer. Releases the order back to
 * SEARCHING_WORKER and immediately offers it to the next eligible
 * worker (excluding this one).
 */
export async function rejectOffer(
  authUserId: string,
  orderId: string,
): Promise<OfferActionResult> {
  return { error: "Automatic dispatch offers are disabled. Assignment is managed manually by the admin." };
}
