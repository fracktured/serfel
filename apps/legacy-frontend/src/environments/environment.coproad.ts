// Coproad build environment (Fase 3.5 rehost). Mirrors environment.prod.ts,
// but esCoproad is on and the backend base URLs are repointed to the
// same-origin /coproad/... paths served by the RehostRouter:
//  - apiUrlSerfelWeb: SerfelWeb (CodeIgniter) -> CoproadWeb, same PHP image
//    (legacy-php/Dockerfile.fargate copies both), reached via /coproad/CoproadWeb.
//  - apiVentas / apiPedidos: routed to the dedicated Coproad-schema Lambdas
//    (RehostSalesCoproadFn / RehostOrdersCoproadFn, infra/rehost/node-api.ts).
//  - apiUrl stays '' (only used by BasicAuthInterceptor as a startsWith('')
//    match-all, not a routable path; there is no Coproad rewrite target for it).
//  - apiProductos / apiPorciones / apiRutas / apiPDF are unchanged: no Coproad
//    tenant exists yet for the products/rutas API in this rehost slice.
// Final Coproad labels/values to be confirmed by the human before go-live.
export const environment = {
   production: true,
   esCoproad: true,
   apiUrl: '',
   apiUrlSerfelWeb: '/coproad/CoproadWeb',
   apiProductos: '/products',
   apiPorciones: '/products/portions',
   apiRutas: '/routes',
   apiPDF: '/pdf',
   apiPedidos: '/coproad/orders/',
   apiVentas: '/coproad/sales',
};
