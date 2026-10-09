import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";

describe("Wardrobe cream paper readability across light/night themes", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  const contrastSection = css.slice(css.indexOf("/* Wardrobe night-safe readable ink:"));
  test("has scoped opaque dark ink for Wearing count and caption", () => {
    expect(contrastSection).toContain(".wardrobe-live .wardrobe-current-summary strong");
    expect(contrastSection).toContain(".wardrobe-live .wardrobe-current-summary small");
    expect(contrastSection).toContain("-webkit-text-fill-color: #57222b !important;");
    expect(contrastSection).toContain("background: #f5e7d8 !important;");
  });
  test("inactive cream category pills stay readable without inheriting app-night white", () => {
    expect(contrastSection).toContain(".wardrobe-category-tabs button:not(.active)");
    expect(contrastSection).toContain(".wardrobe-category-tabs button:not(.active) span");
    expect(contrastSection).toContain("background: #f9eee1 !important;");
    expect(contrastSection).toContain("color: #70414a !important;");
  });
  test("active wine category pills keep light text and the owner's color themes", () => {
    expect(contrastSection).toContain(".wardrobe-category-tabs button.active");
    expect(contrastSection).toContain("background: #6d1b27 !important;");
    expect(contrastSection).toContain("-webkit-text-fill-color: #fff1e3 !important;");
    expect(contrastSection).toContain(".wardrobe-live .screen-intro h1");
    expect(contrastSection).toContain("color: var(--text) !important;");
  });
});
