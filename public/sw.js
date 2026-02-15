self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  let data = {}

  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {
      title: "Нове сповіщення",
      body: event.data ? event.data.text() : "",
    }
  }

  const title = data.title || "Нове сповіщення"
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    tag: data.tag || "admin-notification",
    data: {
      url: data.url || "/admin",
    },
    vibrate: [180, 80, 180],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || "/admin"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/admin") && "focus" in client) {
          if ("navigate" in client) {
            client.navigate(targetUrl)
          }
          return client.focus()
        }
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})
