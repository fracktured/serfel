# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Angular 11 application for "Serfel" - a business management system handling orders (pedidos), products (productos), sales (ventas), and routes (rutas). The application includes a variant configuration for "Coproad" controlled via the `esCoproad` flag in environment files.

## Common Commands

### Development Server
```bash
export NODE_OPTIONS=--openssl-legacy-provider
ng serve
```
The app runs at `http://localhost:4200/`

**Important**: The `NODE_OPTIONS=--openssl-legacy-provider` environment variable is required due to OpenSSL compatibility with the Node.js version being used.

### Build
```bash
# Development build
ng build

# Production build
ng build --prod --aot --outputHashing=all
```
Build artifacts are stored in `dist/serfel-ang/`

### Testing & Linting
```bash
# Run unit tests
ng test

# Run linter
ng lint

# Run e2e tests
ng e2e
```

### Code Generation
```bash
ng generate component component-name
ng generate directive|pipe|service|class|guard|interface|enum|module
```

## Architecture

### Module Structure

The application uses lazy-loaded feature modules organized by business domain:

- **AppModule** (src/app/app.module.ts): Root module with core dependencies
  - Configures `BasicAuthInterceptor` for HTTP authentication
  - Includes `SharedModule` for common components

- **Feature Modules** (lazy-loaded via routing):
  - **PedidosModule**: Order management (create, list, modify orders)
  - **ProductoModule**: Product and portion management
  - **VentasModule**: Sales operations including "Prefacturacion" (pre-invoicing)
  - **RutaModule**: Route management and cargo listings

- **SharedModule** (src/app/pages/shared/shared.module.ts):
  - Shared components: LayoutComponent, SidebarComponent, NavbarComponent
  - Modal components: ModalTimeOutComponent, ModalConfirmacionComponent, ModalMensajesComponent
  - Shared pipes: MonedaPipe, FiltrarPorTextoPipe, ClientFullRutPipe, ContactFullName, FullName
  - **Must be imported by feature modules** that use shared components/pipes

### Routing Architecture

- **Top-level routes** (src/app/app-routing.module.ts):
  - `/login` - Login page (LoginComponent)
  - Feature modules wrapped in LayoutComponent with lazy loading
  - All authenticated routes use `AutenticacionGuard`
  - Default redirect to login for unknown routes

- **Feature routing pattern**:
  Each feature module has its own routing module (e.g., `pedidos-routing.module.ts`)
  Routes are children of the main feature path with `AutenticacionGuard` protection
  Example: `/pedidos/listar`, `/pedidos/crear`, `/pedidos/modificar/:idPedido`

### Authentication Flow

1. User authenticates via LoginComponent
2. `LoginService` stores user credentials with Basic Auth token
3. `BasicAuthInterceptor` automatically adds `Authorization` header to API requests
4. `AutenticacionGuard` protects routes requiring authentication
5. Session timeout handled by `ModalTimeOutComponent` (using @ng-idle/keepalive)

### Backend API Structure

The application communicates with multiple backend services configured in environment files:

- **apiUrl**: Legacy backend (localhost in dev)
- **apiUrlSerfelWeb**: SerfelWeb backend service
- **apiProductos**: Products API (port 3002)
- **apiPorciones**: Portions API (port 3001)
- **apiRutas**: Routes API (port 3003)
- **apiPDF**: PDF generation API (port 3003)
- **apiPedidos**: Orders API (port 3004)
- **apiVentas**: Sales API (port 3005)

### Service Layer

Services are organized by domain in `src/app/services/`:
- `login.service.ts`: Authentication and user management
- `pedidos.service.ts`: Order operations
- `producto.service.ts`: Product management
- `porcion.service.ts`: Portion management
- `venta.service.ts`: Sales operations
- `ruta.service.ts`: Route management
- `locales.service.ts`: Store/location management
- `precio.service.ts`: Pricing operations
- `pdf.service.ts`: PDF generation
- `layout.service.ts`: UI/layout state management

### Models

TypeScript models in `src/app/models/` define data structures:
- `user.model.ts`, `usuario.model.ts`: User/authentication models
- `pedido.model.ts`: Order model
- `producto.model.ts`, `porcion.model.ts`: Product and portion models
- `venta.model.ts`: Sales model
- `cliente.model.ts`, `local.model.ts`, `local-cliente.model.ts`: Customer and location models
- `ruta.model.ts`: Route model
- `precio-producto.model.ts`: Product pricing model

### Path Aliases

TypeScript paths configured in `tsconfig.json`:
- `@app/*` → `src/app/*`
- `@environments/*` → `src/environments/*`

Use these aliases for cleaner imports throughout the codebase.

### Environment Configuration

- `environment.ts`: Development configuration
- `environment.prod.ts`: Production configuration
- **Important flag**: `esCoproad: boolean` - toggles between Serfel and Coproad variants

When building for production, Angular automatically replaces `environment.ts` with `environment.prod.ts` via file replacements in `angular.json`.

### Global Dependencies

The application includes jQuery and Bootstrap loaded globally via `angular.json`:
- jQuery 3.5.1
- Bootstrap 4.5.0 (JS + CSS)
- Font Awesome icons
- Animate.css
- Custom MD5 library (src/assets/md5/md5-min.js)

Bootstrap modals and components from `@ng-bootstrap/ng-bootstrap` are used extensively.

## Development Notes

### Working with Feature Modules

When creating new features:
1. Generate a feature module with routing: `ng generate module pages/feature-name --route feature-name --module app-routing.module`
2. Import SharedModule if using common pipes or components
3. Add route protection with AutenticacionGuard for authenticated pages
4. Set page titles using route data: `data: {title: 'Page Title'}`

### Modal Pattern

The codebase uses NgBootstrap modals extensively. Common pattern:
- Modal components declared in feature modules
- Opened via `NgbModal.open()` from parent components
- Use `NgbActiveModal` for closing and passing data back
- See examples in `src/app/pages/pedidos/modal-*` components

### Recent Work Context

The current branch `feature/SER-3-prefacturacion` includes work on the pre-invoicing functionality in the VentasModule. Recent commits show:
- Implementation of "Prefacturacion" feature
- Column sorting in prefacturacion views
- Display of Sale ID (Id Venta) in success messages
- Version customization for Coproad variant
