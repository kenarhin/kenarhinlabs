import { describe, expect, it } from "vitest";

import {
  contactInputSchema,
  createOfferSchema,
  inquiryInputSchema,
  leadInputSchema,
  projectIntakeInputSchema,
  publicContentParamsSchema,
  supportRequestInputSchema,
} from "./index";

describe("shared validators", () => {
  it("normalizes lead email addresses and applies the website source", () => {
    const result = leadInputSchema.parse({
      email: "HELLO@EXAMPLE.COM",
      name: "Ada Lovelace",
    });

    expect(result.email).toBe("hello@example.com");
    expect(result.source).toBe("website");
  });

  it("rejects a lead without a contact method", () => {
    expect(() => leadInputSchema.parse({ name: "Ada Lovelace" })).toThrow();
  });

  it("requires a Turnstile token on every public message contract", () => {
    const message = {
      email: "visitor@example.com",
      message: "A sufficiently detailed public enquiry.",
      name: "Ada Lovelace",
      subject: "General enquiry",
    };

    const schemas = [
      contactInputSchema,
      inquiryInputSchema,
      projectIntakeInputSchema,
      supportRequestInputSchema,
    ];
    for (const schema of schemas) {
      expect(schema.safeParse(message).success).toBe(false);
      expect(schema.safeParse({ ...message, turnstileToken: "verified-token" }).success).toBe(true);
    }
  });

  it("accepts every documented long-term public content type", () => {
    expect(
      publicContentParamsSchema.parse({ type: "product_update", slug: "launch-notes" }),
    ).toEqual({ type: "product_update", slug: "launch-notes" });
  });

  it("rejects an offer whose window closes before it opens", () => {
    expect(() =>
      createOfferSchema.parse({
        endsAt: "2026-07-10T10:00:00Z",
        offerType: "discount",
        slug: "starter-credit",
        startsAt: "2026-07-11T10:00:00Z",
        title: "Starter credit",
      }),
    ).toThrow();
  });
});
