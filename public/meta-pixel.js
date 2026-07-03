(function () {
  const script = document.currentScript;
  const page = script?.dataset?.pixelPage || "page";
  const eventId = `pv-${page}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let fired = false;

  function trackPageView() {
    if (fired || typeof window.fbq !== "function") return;
    fired = true;
    window.fbq("track", "PageView", {}, { eventID: eventId });

    if (page === "home") {
      window.fbq("track", "ViewContent", {
        content_name: "1000 Atividades de Leitura e Ortografia - BNCC",
        content_category: "Infoproduto Educacional",
        value: 17.9,
        currency: "BRL"
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", trackPageView, { once: true });
  } else {
    trackPageView();
  }

  window.addEventListener("pageshow", trackPageView, { once: true });
  setTimeout(trackPageView, 1200);
})();
