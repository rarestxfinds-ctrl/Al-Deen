// Guarded service-worker registration per Lovable PWA skill.
// Skips Lovable preview, iframe, dev, and the ?sw=off kill switch.

export function registerSW(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const isProd = import.meta.env.PROD;
  const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const host = window.location.hostname;
  const isLovablePreview =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" || host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev");
  const swOff = new URLSearchParams(window.location.search).has("sw") &&
    new URLSearchParams(window.location.search).get("sw") === "off";

  const refused = !isProd || inIframe || isLovablePreview || swOff;

  if (refused) {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((r) => {
        if (r.active?.scriptURL.endsWith("/sw.js")) r.unregister();
      }))
      .catch(() => {});
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("SW register failed", err);
    });
  });

  // Friendly offline indicator
  const showOffline = () => {
    if (!navigator.onLine) {
      try {
        const id = "al-din-offline-pill";
        if (document.getElementById(id)) return;
        const el = document.createElement("div");
        el.id = id;
        el.textContent = "You're offline — using cached content";
        el.style.cssText = "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:6px 14px;border-radius:999px;font:12px system-ui;z-index:99999";
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
      } catch {}
    }
  };
  window.addEventListener("offline", showOffline);
}
