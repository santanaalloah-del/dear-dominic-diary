import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
describe("Chat keeps complete Dominic replies inside one stable message bubble", () => {
  const chat = readFileSync(new URL("../src/components/diario-chat.tsx", import.meta.url), "utf8");
  const response = readFileSync(new URL("../src/components/ai-elements/message.tsx", import.meta.url), "utf8");
  test("uses the nonstreaming Markdown renderer on already complete Chat messages", () => {
    expect(chat).toContain('<MessageResponse mode="static" isAnimating={false}>');
    expect(chat).not.toContain('<MessageResponse>\n      {message.content}');
  });
  test("keeps a single outer bubble with all paragraphs and italic actions", () => {
    expect(chat).toContain('<MessageContent className="diario-message-content messenger-bubble">');
    expect(chat).toMatch(/<MessageContent className="diario-message-content messenger-bubble">[\s\S]{0,450}<MessageResponse mode="static" isAnimating=\{false\}>/);
    expect(response).toContain("Streamdown");
    // Static mode still renders Markdown syntax (including italic phrases).
  });
  test("does not disable future streaming support globally", () => {
    expect(response).toContain('plugins={streamdownPlugins}');
    expect(response).not.toContain('mode="static"');
  });
});
