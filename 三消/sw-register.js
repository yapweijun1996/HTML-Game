if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./service-worker.js");
      console.log("Service Worker registered:", reg.scope);
    } catch (err) {
      console.error("Service Worker registration failed:", err);
    }
  });
}
