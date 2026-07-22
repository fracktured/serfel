import { describe, it, expect } from "vitest";
import { verifyBasicAuth } from "../verify";

const expected = { username: "serfel", password: "s3cr3t" };
const header = (u: string, p: string) => `Basic ${Buffer.from(`${u}:${p}`).toString("base64")}`;

describe("verifyBasicAuth", () => {
  it("accepts correct credentials", () => {
    expect(verifyBasicAuth(header("serfel", "s3cr3t"), expected)).toBe(true);
  });
  it("rejects a wrong password", () => {
    expect(verifyBasicAuth(header("serfel", "nope"), expected)).toBe(false);
  });
  it("rejects a wrong username", () => {
    expect(verifyBasicAuth(header("intruso", "s3cr3t"), expected)).toBe(false);
  });
  it("rejects a missing header", () => {
    expect(verifyBasicAuth(undefined, expected)).toBe(false);
  });
  it("rejects a non-Basic scheme", () => {
    expect(verifyBasicAuth("Bearer abc.def.ghi", expected)).toBe(false);
  });
  it("rejects a malformed base64 payload with no colon", () => {
    expect(verifyBasicAuth(`Basic ${Buffer.from("nocolon").toString("base64")}`, expected)).toBe(false);
  });
});
