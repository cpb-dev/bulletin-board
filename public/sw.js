/* Service worker for Our Little Board — handles incoming web push
   notifications and focuses the app when one is tapped. */

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: "Our Little Board", body: event.data && event.data.text() };
  }

  const title = payload.title || "Our Little Board";
  const options = {
    body: payload.body || "Something new is waiting for you 💌",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: payload.url || "/board" },
    vibrate: [80, 40, 80],
    tag: payload.tag || "board-update",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/board";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      })
  );
});
