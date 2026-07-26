import PDFDocument from "pdfkit";
import type { CargoListData, CargoListRow } from "./types";

const MARGIN_LEFT = 10;
const COL_N = { width: 40, align: "center" as const };
const COL_NOM = { width: 320, align: "center" as const };
const COL_PRECIO = { width: 65, align: "center" as const };
const COL_CANT = { width: 50, align: "center" as const };
const COL_OBS = { width: 65, align: "center" as const };
const X_NOM = MARGIN_LEFT + COL_N.width + 1;
const X_PRECIO = X_NOM + COL_NOM.width;
const X_CANT = X_PRECIO + COL_PRECIO.width;
const X_UM = X_CANT + COL_CANT.width;
const X_OBS = X_UM + COL_N.width;
const PAGE_OPTIONS = { size: "Letter" as const, margins: { top: 20, bottom: 20, left: 10, right: 10 } };

function ddmmyyyy(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}
const money = (n: number) => new Intl.NumberFormat("de-DE").format(n);

export function renderCargoListPdf(data: CargoListData): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument(PAGE_OPTIONS);
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.on("error", reject);

    let page = 0;
    let currentTipo = "";

    const printHeader = () => {
      page++;
      doc
        .font("Helvetica-Bold").fontSize(13)
        .text("LISTADO CARGA", { align: "center" })
        .moveDown(1)
        .text("Rutas:")
        .text("Fecha Informe:")
        .moveUp(2)
        .font("Helvetica")
        .text(data.nomRutas, 120, doc.y + 1)
        .text(ddmmyyyy(new Date()), 120, undefined)
        .fontSize(8)
        .text(`Página   ${page}`, { align: "right" });
    };

    const printTipoTitle = () => {
      doc.fontSize(12).font("Helvetica-Bold").text(currentTipo, doc.page.margins.left, undefined, { align: "left" });
    };

    const printTableHeader = () => {
      doc
        .font("Helvetica-Bold").fontSize(11)
        .text("N", doc.page.margins.left, undefined, COL_N).moveUp()
        .text("Nombre Producto", X_NOM, undefined, { ...COL_NOM, align: "left" }).moveUp()
        .text("Precio Total", X_PRECIO, undefined, { ...COL_PRECIO, align: "right" }).moveUp()
        .text("Cantidad", X_CANT, undefined, { ...COL_CANT, align: "right" }).moveUp()
        .text("UM", X_UM, undefined, COL_N).moveUp()
        .text("Obs", X_OBS, undefined, COL_OBS)
        .moveTo(doc.page.margins.left, doc.y - 3)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y - 3)
        .stroke()
        .font("Helvetica").fontSize(11);
    };

    // True only on the row where the tipo changes (mirrors legacy's
    // `this.printTipoProducto = nomTipoProducto != this.tipoProducto`,
    // recomputed per row). Used by the pageAdded handler so the tipo
    // title is NOT repeated on pdfkit's automatic overflow pages.
    let tipoJustChanged = false;

    doc.on("pageAdded", () => {
      printHeader();
      doc.moveDown();
      if (tipoJustChanged) printTipoTitle();
      printTableHeader();
    });

    printHeader();

    const obsText = (row: CargoListRow): string =>
      row.obs.length > 0 ? `N(${row.obs.join("-")})` : "";

    for (const row of data.rows) {
      const isNewTipo = row.nomTipoProducto !== currentTipo;
      tipoJustChanged = isNewTipo;
      if (isNewTipo) {
        if (currentTipo !== "") {
          currentTipo = row.nomTipoProducto;
          doc.addPage();
        } else {
          currentTipo = row.nomTipoProducto;
          printTipoTitle();
          printTableHeader();
        }
      }
      const obs = obsText(row);
      doc
        .text(String(row.codSerfel), doc.page.margins.left, undefined, COL_N).moveUp()
        .text(row.nomProducto, X_NOM, undefined, { ...COL_NOM, align: "left" }).moveUp()
        .text(`$ ${money(row.subtotal)}`, X_PRECIO, undefined, { ...COL_PRECIO, align: "right" }).moveUp()
        .text(row.sumCantidad, X_CANT, undefined, { ...COL_CANT, align: "right" }).moveUp()
        .text(row.nomUm, X_UM, undefined, COL_N)
        .moveTo(X_OBS, doc.y - 3)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y - 3)
        .stroke()
        .moveUp();
      if (obs.length > 0) {
        doc.text(obs, X_OBS, undefined, COL_OBS);
      } else {
        doc.moveDown();
      }
    }

    if (data.totals.numFacturas > 0) {
      doc
        .moveDown()
        .fontSize(13)
        .font("Helvetica-Bold")
        .text(
          `Cantidad Facturas: ${data.totals.numFacturas}          Total: $ ${money(data.totals.total)}`,
          doc.page.margins.left,
          undefined,
          { align: "center" }
        );
    }

    doc.end();
  });
}
