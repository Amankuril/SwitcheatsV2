/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

const sanitize = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");
const PUSH_DEBUG_PREFIX = "[push-sw]";
const pushDebugLog = () => {};
const getNotificationKey = (payload) =>
  payload?.data?.notificationId ||
  payload?.data?.messageId ||
  payload?.messageId ||
  [
    payload?.notification?.title || payload?.data?.title || "",
    payload?.notification?.body || payload?.data?.body || "",
    payload?.data?.orderId || "",
    payload?.data?.targetUrl || payload?.data?.link || "",
  ].join("::");

function hasSdkNotificationPayload(payload = {}) {
  return Boolean(
    payload?.notification?.title ||
      payload?.notification?.body ||
      payload?.notification?.image,
  );
}

function getTargetPathFromPayload(payload = {}) {
  const rawTarget =
    payload?.data?.targetUrl ||
    payload?.data?.link ||
    payload?.data?.click_action ||
    payload?.fcmOptions?.link ||
    "/";

  try {
    const url = new URL(rawTarget, self.location.origin);
    return url.pathname || "/";
  } catch {
    return "/";
  }
}

// Check if there's a visible, focused client for the target module
async function hasFocusedClientForTarget(payload = {}) {
  const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
  const targetPath = getTargetPathFromPayload(payload);
  const targetRoot = `/${String(targetPath).split("/").filter(Boolean)[0] || ""}`;

  // Find a visible and focused client that matches the target module
  const focusedClient = windowClients.find((client) => {
    try {
      const clientUrl = new URL(client.url);
      // Client must be visible AND focused
      const isVisibleAndFocused = client.visibilityState === "visible" && client.focused;
      if (!isVisibleAndFocused) return false;
      // Check if client URL matches target module
      if (targetRoot === "/" || !targetRoot) return true;
      return clientUrl.pathname.startsWith(targetRoot);
    } catch {
      return false;
    }
  });

  pushDebugLog(PUSH_DEBUG_PREFIX, "Focused client check", {
    count: windowClients.length,
    targetPath,
    targetRoot,
    hasFocusedClient: Boolean(focusedClient),
    clients: windowClients.map((client) => ({
      url: client.url,
      visibilityState: client.visibilityState,
      focused: client.focused,
    })),
  });

  return Boolean(focusedClient);
}

// Only notify clients if we have a FOCUSED window (app is in foreground)
async function notifyFocusedClients(payload) {
  const focusedClient = await hasFocusedClientForTarget(payload);
  // Only relay to page if there's a focused client (user is actively using the app)
  if (focusedClient) {
    pushDebugLog(PUSH_DEBUG_PREFIX, "Relaying notification to focused client", { payload });
    const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
    windowClients.forEach((client) => {
      // Only send to visible, focused clients
      if (client.visibilityState === "visible" && client.focused) {
        client.postMessage({
          type: "push-notification-received",
          payload,
        });
      }
    });
  }
}

async function loadFirebaseWebConfig() {
  const candidates = [
    "/api/v1/food/public/env",
    "/api/v1/env/public",
    "/api/env/public",
  ];
  for (const url of candidates) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      const json = await response.json();
      const data = (json && json.data) || {};
      const config = {
        apiKey: sanitize(data.VITE_FIREBASE_API_KEY || data.FIREBASE_API_KEY),
        authDomain: sanitize(data.VITE_FIREBASE_AUTH_DOMAIN || data.FIREBASE_AUTH_DOMAIN),
        projectId: sanitize(data.VITE_FIREBASE_PROJECT_ID || data.FIREBASE_PROJECT_ID),
        appId: sanitize(data.VITE_FIREBASE_APP_ID || data.FIREBASE_APP_ID),
        messagingSenderId: sanitize(data.VITE_FIREBASE_MESSAGING_SENDER_ID || data.FIREBASE_MESSAGING_SENDER_ID),
        storageBucket: sanitize(data.VITE_FIREBASE_STORAGE_BUCKET || data.FIREBASE_STORAGE_BUCKET),
        measurementId: sanitize(data.VITE_FIREBASE_MEASUREMENT_ID || data.FIREBASE_MEASUREMENT_ID),
      };

      if (config.apiKey && config.projectId && config.appId && config.messagingSenderId) {
        pushDebugLog(PUSH_DEBUG_PREFIX, "Loaded Firebase web config");
        return config;
      }
    } catch {
      // try next candidate
    }
  }

  return null;
}

(async () => {
  const config = await loadFirebaseWebConfig();
  if (!config || !config.apiKey || !config.projectId || !config.appId || !config.messagingSenderId) {
    return;
  }

  firebase.initializeApp(config);
  pushDebugLog(PUSH_DEBUG_PREFIX, "Firebase messaging service worker initialized");
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage(async (payload) => {
    pushDebugLog(PUSH_DEBUG_PREFIX, "Received Firebase background message", { payload });

    const focusedClient = await hasFocusedClientForTarget(payload);

    // Extract notification content from data.data first, then notification object
    // This fixes content not showing issue when backend sends in different formats
    const title = payload?.data?.title || payload?.notification?.title || "New Notification";
    const body = payload?.data?.body || payload?.notification?.body || "";
    const image =
      payload?.data?.image ||
      payload?.data?.imageUrl ||
      payload?.notification?.image ||
      undefined;
    const notificationKey = getNotificationKey(payload);

    // If app is in foreground (focused window exists): relay to page for in-app display
    // If app is closed/background (no focused window): show system notification
    if (focusedClient) {
      pushDebugLog(PUSH_DEBUG_PREFIX, "App is in foreground - relaying to page", { title, body });
      // Only relay, don't show system notification - page will handle display
      await notifyFocusedClients(payload);
    } else {
      // FCM auto-displays notifications when payload contains the "notification" block.
      // Avoid manual showNotification in that case to prevent duplicate system pushes.
      if (hasSdkNotificationPayload(payload)) {
        pushDebugLog(PUSH_DEBUG_PREFIX, "Skipping manual showNotification to avoid duplicate SDK notification", {
          title,
          body,
          notificationKey,
        });
        return;
      }

      // App is in background or closed - show system notification
      pushDebugLog(PUSH_DEBUG_PREFIX, "App is in background/closed - showing system notification", {
        title,
        body,
        image,
        notificationKey,
      });

      self.registration.showNotification(title, {
        body,
        icon: "/favicon.ico",
        image,
        tag: notificationKey,
        renotify: true,
        silent: false,
        requireInteraction: false,
        vibrate: [200, 100, 200, 100, 300],
        data: payload?.data || {},
      });
    }
  });
})();

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    pushDebugLog(PUSH_DEBUG_PREFIX, "Received raw push event", { payload });
    // No client relay here. onBackgroundMessage handles delivery, and relaying in both
    // places can produce duplicate notifications in web clients.
    event.waitUntil(Promise.resolve());
  } catch {
    // Ignore malformed payloads.
  }
});

self.addEventListener("notificationclick", (event) => {
  pushDebugLog(PUSH_DEBUG_PREFIX, "Notification click received", {
    data: event?.notification?.data || {},
  });
  event.notification.close();
  const rawLink =
    event?.notification?.data?.link ||
    event?.notification?.data?.click_action ||
    event?.notification?.data?.targetUrl ||
    "/";
  const targetUrl = String(rawLink || "/").startsWith("/") ? String(rawLink || "/") : "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      const client = windowClients.find((c) => c.url.includes(self.location.origin));
      if (client) {
        client.focus();
        return client.navigate(targetUrl);
      }
      return clients.openWindow(targetUrl);
    }),
  );
});
