# Design: Serfel navigation prototypes

Date: 2026-08-13

## Goal

Produce standalone HTML prototypes of different navigation layouts, reusing the
visual language of the new Productos maintainer, to send to the client so they
can pick one. No build step, no dependencies — open directly in a browser.

## Deliverable

Files in `docs/prototypes/navigation/`:

- `index.html` — Serfel-branded chooser linking to the four options.
- `option-1-sidebar.html` — Collapsible lateral sidebar with a hamburger
  open/close button and multi-level accordion sub-items (the explicitly
  requested pattern).
- `option-2-topbar-mega.html` — Top bar where each group opens a multi-level
  mega-dropdown/flyout on click.
- `option-3-two-tier.html` — Top bar picks the section; a secondary left
  sidebar shows that section's nested items.
- `option-4-icon-rail.html` — Thin left icon rail that expands on hover/click
  to reveal labels and nested items.

## Shared design language (from `apps/frontend/src/styles.scss`)

- Font: Plus Jakarta Sans (system-ui fallback).
- Gradient: `linear-gradient(135deg, #7c3aed, #2563eb)`.
- Background `#f1f5f9`, white surfaces, border `#e2e8f0`, radius 14px, purple
  accent `#7c3aed`, pill buttons, soft card shadows.

## Shared content canvas (mock)

The Catálogo de Productos screen: hero title + actions, four stat cards, a
filter row, and a products table with ~8 rows of realistic mock data
(Soprole / Nestlé / Colún / Loncoleche brand badges).

## Menu tree (same across all four, shows 3 levels)

- Mantenedores ▸ Usuarios · Clientes · Productos (active) · Marcas
- Logística ▸ Documentos ▸ (Listado de Carga · Guías de Despacho) · Rutas
- Ventas ▸ Prefacturación · Facturación · Notas de Crédito
- Reportes ▸ Ventas por Cliente · Stock
- Configuración (leaf)

## Behavior

Interactive via inline vanilla JS (menus open/close, accordions expand, active
states). Links are `#` — this is a prototype. All CSS/JS inlined so each file
is self-contained and safe to zip and send.
