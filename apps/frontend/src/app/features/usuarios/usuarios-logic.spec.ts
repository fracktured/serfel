import { describe, it, expect } from "vitest";
import { applyFilters, sortRows, computeStats, toCsv, type Filters } from "./usuarios-logic";
import type { UsuarioDto } from "@serfel/shared";

const u = (over: Partial<UsuarioDto>): UsuarioDto => ({
  idUsuario: 1, rutUsuario: 12345678, dvUsuario: "5", rut: "12345678-5",
  nomUsuario: "Juan", apellPatUsuario: "Perez", apellMatUsuario: "Soto",
  nombreCompleto: "Perez Soto Juan", idTipoUsuario: 2, nomTipoUsuario: "Vendedor",
  telefonoUsuario: "1", direccionUsuario: "d", emailUsuario: "j@x.cl", numUsuario: 10,
  idEstado: 1, tieneCognito: false, ...over,
});

const EMPTY: Filters = { nombre: "", rut: "", idTipoUsuario: null, quick: "" };

describe("applyFilters", () => {
  it("matches by name tokens, rut, and tipo", () => {
    const rows = [u({}), u({ idUsuario: 2, nombreCompleto: "Gomez Diaz Ana", rut: "6371526-K", idTipoUsuario: 1 })];
    expect(applyFilters(rows, { ...EMPTY, nombre: "perez" }).map((r) => r.idUsuario)).toEqual([1]);
    expect(applyFilters(rows, { ...EMPTY, rut: "6371526" }).map((r) => r.idUsuario)).toEqual([2]);
    expect(applyFilters(rows, { ...EMPTY, idTipoUsuario: 1 }).map((r) => r.idUsuario)).toEqual([2]);
  });
});

describe("sortRows", () => {
  it("sorts by nombreCompleto ascending and descending", () => {
    const rows = [u({ idUsuario: 1, nombreCompleto: "B" }), u({ idUsuario: 2, nombreCompleto: "A" })];
    expect(sortRows(rows, { key: "nombreCompleto", asc: true }).map((r) => r.idUsuario)).toEqual([2, 1]);
    expect(sortRows(rows, { key: "nombreCompleto", asc: false }).map((r) => r.idUsuario)).toEqual([1, 2]);
  });
});

describe("computeStats", () => {
  it("counts users, tipos, and cognito", () => {
    const all = [u({ tieneCognito: true }), u({ idUsuario: 2, idTipoUsuario: 1, tieneCognito: false })];
    const s = computeStats(all, all);
    expect(s.total).toBe(2);
    expect(s.tipos).toBe(2);
    expect(s.conCognito).toBe(1);
    expect(s.filtrados).toBeNull();
  });
});

describe("toCsv", () => {
  it("emits a header and one row per user", () => {
    const csv = toCsv([u({})]);
    expect(csv.split("\r\n")).toHaveLength(2);
    expect(csv).toContain("12345678-5");
  });
});
