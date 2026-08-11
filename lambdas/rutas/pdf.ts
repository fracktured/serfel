import PDFDocument from "pdfkit";
import type { CargoListData, CargoListRow } from "./types";

const MARGIN_LEFT = 10;
// Column geometry mirrors the legacy JasperReport (ListadoCarga.jrxml): a
// narrow N, a roomy product name, then a compact numeric block (Precio /
// Cantidad / UM) pulled left of centre, and a wide Observaciones underline.
// Widths are laid out across the Letter usable width (592pt), giving the name
// more room than the A4 legacy while keeping the same visual proportions.
const COL_N = { width: 40, align: "center" as const };
const COL_NOM = { width: 250, align: "left" as const };
const COL_PRECIO = { width: 80, align: "right" as const };
const COL_CANT = { width: 60, align: "right" as const };
const COL_UM = { width: 40, align: "center" as const };
const COL_OBS = { width: 122, align: "center" as const };
const X_NOM = MARGIN_LEFT + COL_N.width;
const X_PRECIO = X_NOM + COL_NOM.width;
const X_CANT = X_PRECIO + COL_PRECIO.width;
const X_UM = X_CANT + COL_CANT.width;
const X_OBS = X_UM + COL_UM.width;
// Legacy detail band is 18pt tall; add line spacing so rows breathe like the
// reference report instead of the cramped single-line default.
const ROW_GAP = 5;
const NAME_INDENT = 8;
const PAGE_OPTIONS = { size: "Letter" as const, margins: { top: 20, bottom: 20, left: 10, right: 10 } };

function ddmmyyyy(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}
const money = (n: number) => new Intl.NumberFormat("de-DE").format(n);

export function renderCargoListPdf(data: CargoListData): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument(PAGE_OPTIONS);
    doc.lineGap(ROW_GAP);
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
        .text("Nombre Producto", X_NOM + NAME_INDENT, undefined, { ...COL_NOM, width: COL_NOM.width - NAME_INDENT }).moveUp()
        .text("Precio Total", X_PRECIO, undefined, COL_PRECIO).moveUp()
        .text("Cantidad", X_CANT, undefined, COL_CANT).moveUp()
        .text("UM", X_UM, undefined, COL_UM).moveUp()
        .text("Observaciones", X_OBS, undefined, COL_OBS)
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

    // Clip an over-long product name to a single line (with an ellipsis) so the
    // row stays one line tall — the moveUp/moveDown flow assumes each cell
    // advances by exactly one line, which a wrapped name would break.
    const fitName = (s: string, maxWidth: number): string => {
      if (doc.widthOfString(s) <= maxWidth) return s;
      let t = s;
      while (t.length > 1 && doc.widthOfString(`${t}…`) > maxWidth) t = t.slice(0, -1);
      return `${t.trimEnd()}…`;
    };
    const NAME_WIDTH = COL_NOM.width - NAME_INDENT;

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
        .text(fitName(row.nomProducto, NAME_WIDTH), X_NOM + NAME_INDENT, undefined, { ...COL_NOM, width: NAME_WIDTH }).moveUp()
        .text(`$ ${money(row.subtotal)}`, X_PRECIO, undefined, COL_PRECIO).moveUp()
        .text(row.sumCantidad, X_CANT, undefined, COL_CANT).moveUp()
        .text(row.nomUm, X_UM, undefined, COL_UM)
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
