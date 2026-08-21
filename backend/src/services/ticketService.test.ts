import { describe, it, expect } from "vitest";
import { isLegalTransition } from "./ticketService";

// We test isLegalTransition() directly rather than hitting the real API/DB
// — it's a pure function (same input always gives same output, no side
// effects), which makes it fast and simple to test in isolation. This is
// the single rule the whole app depends on being correct, so it's the
// highest-value place to have tests.
describe("ticket state machine: isLegalTransition", () => {
  it("allows every step of the intended forward path", () => {
    expect(isLegalTransition("OPEN", "TRIAGED")).toBe(true);
    expect(isLegalTransition("TRIAGED", "ASSIGNED")).toBe(true);
    expect(isLegalTransition("ASSIGNED", "IN_PROGRESS")).toBe(true);
    expect(isLegalTransition("IN_PROGRESS", "RESOLVED")).toBe(true);
    expect(isLegalTransition("RESOLVED", "CLOSED")).toBe(true);
  });

  it("rejects skipping a step (the example from the spec)", () => {
    expect(isLegalTransition("OPEN", "RESOLVED")).toBe(false);
  });

  it("rejects skipping ahead by more than one step from any status", () => {
    expect(isLegalTransition("OPEN", "ASSIGNED")).toBe(false);
    expect(isLegalTransition("OPEN", "IN_PROGRESS")).toBe(false);
    expect(isLegalTransition("OPEN", "CLOSED")).toBe(false);
    expect(isLegalTransition("TRIAGED", "IN_PROGRESS")).toBe(false);
    expect(isLegalTransition("ASSIGNED", "RESOLVED")).toBe(false);
  });

  it("rejects moving backwards", () => {
    expect(isLegalTransition("TRIAGED", "OPEN")).toBe(false);
    expect(isLegalTransition("CLOSED", "RESOLVED")).toBe(false);
    expect(isLegalTransition("ASSIGNED", "TRIAGED")).toBe(false);
  });

  it("rejects staying in the same status", () => {
    expect(isLegalTransition("OPEN", "OPEN")).toBe(false);
    expect(isLegalTransition("CLOSED", "CLOSED")).toBe(false);
  });

  it("treats CLOSED as terminal — nothing is legal after it", () => {
    expect(isLegalTransition("CLOSED", "OPEN")).toBe(false);
    expect(isLegalTransition("CLOSED", "TRIAGED")).toBe(false);
  });
});
