import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  generateOrderNumber,
  slugify,
  validateGCashReference,
} from "../index";

describe("formatCurrency", () => {
  it("formats PHP currency with symbol", () => {
    expect(formatCurrency(100)).toContain("100");
    expect(formatCurrency(100)).toContain("₱");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toContain("0.00");
  });

  it("formats decimals", () => {
    expect(formatCurrency(99.5)).toContain("99.50");
  });

  it("formats large numbers with commas", () => {
    const result = formatCurrency(1234567);
    expect(result).toContain("1");
    expect(result).toContain("234");
    expect(result).toContain("567");
  });
});

describe("slugify", () => {
  it("converts to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("pork siomai 6 pcs")).toBe("pork-siomai-6-pcs");
  });

  it("removes special characters", () => {
    expect(slugify("What's cooking?")).toBe("whats-cooking");
  });

  it("handles leading/trailing whitespace", () => {
    expect(slugify("  hello  ")).toBe("hello");
  });

  it("collapses multiple hyphens", () => {
    expect(slugify("a---b")).toBe("a-b");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
});

describe("validateGCashReference", () => {
  it("accepts exactly 13 digits", () => {
    expect(validateGCashReference("1234567890123")).toBe(true);
  });

  it("rejects fewer than 13 digits", () => {
    expect(validateGCashReference("123456789012")).toBe(false);
  });

  it("rejects more than 13 digits", () => {
    expect(validateGCashReference("12345678901234")).toBe(false);
  });

  it("rejects non-numeric characters", () => {
    expect(validateGCashReference("1234567890abc")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateGCashReference("")).toBe(false);
  });
});

describe("generateOrderNumber", () => {
  it("starts with SFH-", () => {
    expect(generateOrderNumber()).toMatch(/^SFH-/);
  });

  it("contains current year", () => {
    const year = new Date().getFullYear();
    expect(generateOrderNumber()).toContain(String(year));
  });

  it("ends with 4 random digits", () => {
    expect(generateOrderNumber()).toMatch(/-\d{4}$/);
  });

  it("generates unique numbers", () => {
    const set = new Set(Array.from({ length: 100 }, () => generateOrderNumber()));
    expect(set.size).toBeGreaterThan(90); // at most ~10 collisions
  });
});

describe("formatDate", () => {
  it("formats a date string", () => {
    const result = formatDate("2024-12-25");
    expect(result).toContain("25");
    expect(result).toContain("December");
    expect(result).toContain("2024");
  });

  it("formats a Date object", () => {
    const result = formatDate(new Date(2024, 0, 1));
    expect(result).toContain("January");
    expect(result).toContain("1");
    expect(result).toContain("2024");
  });
});

describe("formatRelativeTime", () => {
  it('returns "just now" for recent dates', () => {
    expect(formatRelativeTime(new Date())).toBe("just now");
  });

  it('returns "1 minute ago"', () => {
    const date = new Date(Date.now() - 60000);
    expect(formatRelativeTime(date)).toBe("1 minute ago");
  });

  it('returns "5 minutes ago"', () => {
    const date = new Date(Date.now() - 300000);
    expect(formatRelativeTime(date)).toBe("5 minutes ago");
  });

  it('returns "1 hour ago"', () => {
    const date = new Date(Date.now() - 3600000);
    expect(formatRelativeTime(date)).toBe("1 hour ago");
  });

  it("delegates to formatDate for very old dates", () => {
    const date = new Date("2020-01-01");
    const result = formatRelativeTime(date);
    expect(result).toContain("2020");
  });
});
