import { describe, expect, test } from "bun:test";
import { parseBudgetRpcResponse } from "../src/lib/budget-rpc-response";

describe("Supabase budget RPC responses", () => {
  test("accepts a successful 204 with no body when settling or releasing", async () => {
    expect(await parseBudgetRpcResponse(new Response(null, { status: 204 }))).toBeNull();
  });
  test("accepts an empty 200 response without throwing", async () => {
    expect(await parseBudgetRpcResponse(new Response("", { status: 200 }))).toBeNull();
  });
  test("preserves the reserved budget ID JSON scalar", async () => {
    expect(await parseBudgetRpcResponse(new Response('"budget-reservation-123"'))).toBe("budget-reservation-123");
  });
  test("preserves a literal JSON null on exhausted budget", async () => {
    expect(await parseBudgetRpcResponse(new Response("null"))).toBeNull();
  });
  test("does not mask invalid non-empty JSON", async () => {
    expect(parseBudgetRpcResponse(new Response("{invalid"))).rejects.toThrow(SyntaxError);
  });
});
