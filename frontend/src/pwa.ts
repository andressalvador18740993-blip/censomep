// Registro del service worker con actualización automática y recarga controlada.
// Soluciona que los dispositivos con la PWA instalada sigan viendo la versión vieja:
//  - revisa si hay versión nueva al cargar, cada 60 s y al volver a primer plano;
//  - fuerza a Safari/iOS a no cachear el propio sw.js (updateViaCache: "none");
//  - recarga sola (una sola vez) cuando se activa una versión nueva.
export function setupPWA() {
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;

  // Cuando el SW nuevo se activa (skipWaiting + clientsClaim), recargamos una vez
  // para cargar el HTML/JS nuevos. Evitamos el bucle con la bandera "refreshing".
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    if (!hadController) return; // primera instalación: no recargar
    refreshing = true;
    window.location.reload();
  });

  const register = () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        const check = () => registration.update().catch(() => {});
        // Revisión periódica.
        window.setInterval(check, 60_000);
        // Al volver a primer plano (caso típico de PWA reanudada desde memoria).
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") check();
        });
        window.addEventListener("focus", check);
        // Y una vez al arrancar, por si la anterior revisión quedó pendiente.
        check();
      })
      .catch(() => {});
  };

  if (document.readyState === "complete") register();
  else window.addEventListener("load", register);
}
