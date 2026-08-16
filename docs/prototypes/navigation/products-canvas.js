/* Shared mock "Catálogo de Productos" content, injected into #canvas.
   Reproduces the look of the real Serfel Productos maintainer so the client
   sees a realistic screen behind each navigation option. Data is fictional. */
(function () {
  var STYLE = `
  .pc-body{padding:26px 32px 48px;max-width:1180px;margin:0 auto}
  .pc-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:22px;flex-wrap:wrap}
  .pc-head h1{font-size:26px;font-weight:800;letter-spacing:-.5px;line-height:1.15}
  .pc-head p{color:var(--muted);font-size:14px;margin-top:5px}
  .pc-actions{display:flex;gap:10px}
  .pc-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:999px;font-size:13.5px;font-weight:700;font-family:inherit;cursor:pointer;border:none;transition:all .18s}
  .pc-btn svg{width:16px;height:16px}
  .pc-btn-outline{background:#fff;color:var(--accent);border:1.5px solid var(--border)}
  .pc-btn-outline:hover{border-color:var(--accent);background:#f5f3ff}
  .pc-btn-primary{background:var(--grad);color:#fff;box-shadow:0 4px 16px rgba(124,58,237,.3)}
  .pc-btn-primary:hover{opacity:.92;transform:translateY(-1px)}

  .pc-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}
  .pc-stat{background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;display:flex;align-items:center;gap:13px;box-shadow:0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.04);transition:transform .2s,box-shadow .2s}
  .pc-stat:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(0,0,0,.09)}
  .pc-ico{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .pc-ico svg{width:22px;height:22px}
  .pc-num{font-size:26px;font-weight:800;line-height:1;letter-spacing:-.5px}
  .pc-lbl{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:3px}

  .pc-filters{display:flex;gap:10px;background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:14px 18px;margin-bottom:16px;align-items:flex-end;flex-wrap:wrap}
  .pc-f{display:flex;flex-direction:column;gap:5px}
  .pc-f label{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
  .pc-f input,.pc-f select{padding:7px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;outline:none;color:var(--text);background:var(--bg);transition:border-color .2s}
  .pc-f input:focus,.pc-f select:focus{border-color:var(--accent);background:#fff}
  .pc-clear{padding:8px 18px;background:var(--grad);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:6px;align-self:flex-end}
  .pc-clear svg{width:13px;height:13px}
  .pc-count{font-size:12px;color:var(--muted);font-weight:600;margin-bottom:14px}

  .pc-table-wrap{background:#fff;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.04)}
  .pc-table-scroll{overflow-x:auto}
  table.pc{width:100%;border-collapse:collapse;min-width:620px}
  table.pc thead{background:linear-gradient(135deg,#7c3aed12,#2563eb12);border-bottom:2px solid var(--border)}
  table.pc th{padding:13px 16px;text-align:left;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);white-space:nowrap}
  table.pc tbody tr{border-bottom:1px solid #f1f5f9;transition:background .12s}
  table.pc tbody tr:last-child{border-bottom:none}
  table.pc tbody tr:hover{background:#faf5ff}
  table.pc td{padding:12px 16px;font-size:13px}
  .t-num{font-weight:800;color:var(--accent);font-variant-numeric:tabular-nums;font-size:14px}
  .t-name{font-weight:600}
  .t-muted{color:var(--muted)}
  .badge{display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:6px;text-transform:uppercase;letter-spacing:.04em}
  .b-soprole{background:#fef3c7;color:#92400e}
  .b-nestle{background:#dcfce7;color:#14532d}
  .b-colun{background:#dbeafe;color:#1e3a8a}
  .b-loncoleche{background:#fce7f3;color:#831843}
  .um{display:inline-block;background:#f0fdf4;color:var(--green);border:1px solid #bbf7d0;font-size:11px;font-weight:700;padding:2px 9px;border-radius:6px}
  .t-actions{display:flex;gap:6px}
  .t-btn{padding:5px 10px;border-radius:6px;font-size:11px;font-weight:700;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:4px;border:1.5px solid transparent;transition:all .15s}
  .t-btn svg{width:12px;height:12px}
  .t-edit{background:#f5f3ff;color:var(--accent);border-color:#e9d5ff}
  .t-edit:hover{background:var(--accent);color:#fff}
  .t-del{background:#fef2f2;color:var(--red);border-color:#fecaca}
  .t-del:hover{background:var(--red);color:#fff}
  .pc-pag{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-top:1px solid var(--border);flex-wrap:wrap;gap:10px}
  .pc-pag .info{font-size:12px;color:var(--muted)}
  .pc-pag .ctrls{display:flex;gap:4px}
  .pg{min-width:32px;height:32px;border-radius:8px;border:1.5px solid var(--border);background:#fff;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;color:var(--muted);display:flex;align-items:center;justify-content:center}
  .pg:hover{border-color:var(--accent);color:var(--accent);background:#f5f3ff}
  .pg.active{background:var(--grad);color:#fff;border-color:transparent}
  @media(max-width:820px){.pc-stats{grid-template-columns:repeat(2,1fr)}.pc-body{padding:20px}}
  `;

  var ROWS = [
    { n: 311, name: 'Leche Entera 1L', brand: 'Soprole', bc: 'b-soprole', um: 'UN', tipo: 'Lácteos' },
    { n: 312, name: 'Yogurt Natural 150g', brand: 'Soprole', bc: 'b-soprole', um: 'UN', tipo: 'Lácteos' },
    { n: 418, name: 'Manjar Repostero 1kg', brand: 'Nestlé', bc: 'b-nestle', um: 'KG', tipo: 'Postres' },
    { n: 420, name: 'Crema de Leche 200ml', brand: 'Nestlé', bc: 'b-nestle', um: 'UN', tipo: 'Lácteos' },
    { n: 507, name: 'Queso Gauda Laminado', brand: 'Colún', bc: 'b-colun', um: 'KG', tipo: 'Quesos' },
    { n: 509, name: 'Mantequilla con Sal 250g', brand: 'Colún', bc: 'b-colun', um: 'UN', tipo: 'Lácteos' },
    { n: 631, name: 'Leche Descremada 1L', brand: 'Loncoleche', bc: 'b-loncoleche', um: 'UN', tipo: 'Lácteos' },
    { n: 634, name: 'Postre Sémola 120g', brand: 'Loncoleche', bc: 'b-loncoleche', um: 'UN', tipo: 'Postres' },
  ];

  var editSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  var delSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';

  var rowsHtml = ROWS.map(function (r) {
    return '<tr>' +
      '<td class="t-num">' + r.n + '</td>' +
      '<td class="t-name">' + r.name + '</td>' +
      '<td><span class="badge ' + r.bc + '">' + r.brand + '</span></td>' +
      '<td><span class="um">' + r.um + '</span></td>' +
      '<td class="t-muted">' + r.tipo + '</td>' +
      '<td><div class="t-actions"><button class="t-btn t-edit">' + editSvg + 'Editar</button>' +
      '<button class="t-btn t-del">' + delSvg + 'Eliminar</button></div></td>' +
    '</tr>';
  }).join('');

  var HTML = `
  <div class="pc-body">
    <div class="pc-head">
      <div>
        <h1>Catálogo de Productos</h1>
        <p>Gestiona, filtra y actualiza todos los productos del sistema</p>
      </div>
      <div class="pc-actions">
        <button class="pc-btn pc-btn-outline"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Exportar</button>
        <button class="pc-btn pc-btn-primary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>Nuevo Producto</button>
      </div>
    </div>

    <div class="pc-stats">
      <div class="pc-stat"><div class="pc-ico" style="background:linear-gradient(135deg,#f5f3ff,#ede9fe)"><svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg></div><div><div class="pc-num" style="color:#7c3aed">248</div><div class="pc-lbl">Productos</div></div></div>
      <div class="pc-stat"><div class="pc-ico" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe)"><svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg></div><div><div class="pc-num" style="color:#2563eb">12</div><div class="pc-lbl">Marcas</div></div></div>
      <div class="pc-stat"><div class="pc-ico" style="background:linear-gradient(135deg,#dcfce7,#bbf7d0)"><svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg></div><div><div class="pc-num" style="color:#059669">9</div><div class="pc-lbl">Tipos</div></div></div>
      <div class="pc-stat"><div class="pc-ico" style="background:linear-gradient(135deg,#fef3c7,#fde68a)"><svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div><div><div class="pc-num" style="color:#d97706">8</div><div class="pc-lbl">Filtrados</div></div></div>
    </div>

    <div class="pc-filters">
      <div class="pc-f"><label>Nº</label><input type="text" placeholder="311" style="width:110px" /></div>
      <div class="pc-f" style="flex:1;min-width:180px"><label>Nombre del Producto</label><input type="text" placeholder="Buscar por nombre…" style="width:100%" /></div>
      <div class="pc-f"><label>Marca</label><select style="min-width:150px"><option>Todas las marcas</option><option>Soprole</option><option>Nestlé</option><option>Colún</option><option>Loncoleche</option></select></div>
      <div class="pc-f"><label>Estado</label><select><option>Activos</option><option>Inactivos</option><option>Todos</option></select></div>
      <button class="pc-clear"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>Limpiar</button>
    </div>

    <div class="pc-count">8 productos encontrados</div>

    <div class="pc-table-wrap">
      <div class="pc-table-scroll">
        <table class="pc">
          <thead><tr><th>Nº ↕</th><th>Nombre Producto ↕</th><th>Marca ↕</th><th>UM ↕</th><th>Tipo ↕</th><th>Acciones</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
      <div class="pc-pag">
        <span class="info">Mostrando 1–8 de 248</span>
        <div class="ctrls">
          <button class="pg">‹</button>
          <button class="pg active">1</button>
          <button class="pg">2</button>
          <button class="pg">3</button>
          <button class="pg">…</button>
          <button class="pg">31</button>
          <button class="pg">›</button>
        </div>
      </div>
    </div>
  </div>`;

  var style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  var mount = document.getElementById('canvas');
  if (mount) mount.innerHTML = HTML;
})();
