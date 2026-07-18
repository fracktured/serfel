import { describe, it, expect } from "vitest";
import type { MeDto } from "@serfel/shared";
import { sessionCanAccess } from "./session-logic";

const admin: MeDto = { idUsuario: 1, idTipoUsuario: 1, nomUsuario: "A", modulos: ["productos"] };
const vendedor: MeDto = { idUsuario: 2, idTipoUsuario: 2, nomUsuario: "V", modulos: [] };

describe("sessionCanAccess", () => {
  it("false when there is no session", () => {
    expect(sessionCanAccess(null, "productos")).toBe(false);
  });
  it("true for an allowed tipo, false otherwise", () => {
    expect(sessionCanAccess(admin, "productos")).toBe(true);
    expect(sessionCanAccess(vendedor, "productos")).toBe(false);
  });
});
