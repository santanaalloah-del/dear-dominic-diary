/**
 * PostgREST often returns HTTP 204 / an empty body for void RPC calls
 * such as settle_ai_budget and release_ai_budget. Calling response.json()
 * on those successful responses threw, hid real world actions, and triggered
 * erroneous cleanup after an already-settled reservation.
 *
 * Preserve the JSON scalar returned by reserve_ai_budget, including null.
 */
export async function parseBudgetRpcResponse(response: Response): Promise<any> {
  const body = await response.text();
  if (!body.trim()) return null;
  return JSON.parse(body);
}
