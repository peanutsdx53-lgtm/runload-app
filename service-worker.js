const CACHE_NAME = "running-record-app-runtime-v1";
const CACHE_PREFIX = "running-record-app-";
const LEGACY_CACHE_PREFIXES = Object.freeze(["runload-app-"]);
const PRECACHE_URLS = [
  "./app.js",
  "./core/interpretationBase.js",
  "./core/interpretationCore.js",
  "./core/appCore.js",
  "./core/internal/moduleRegistry.js",
  "./core/internal/infrastructure.js",
  "./core/internal/models.js",
  "./core/internal/application.js",
  "./core/internal/content.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./index.html",
  "./manifest.webmanifest",
  "./screens/bodyPartDetailScreen.js",
  "./screens/consultationScreen.js",
  "./screens/courseEditorScreen.js",
  "./screens/courseLibraryScreen.js",
  "./screens/historyScreen.js",
  "./screens/interpretationRoomScreen.js",
  "./screens/homeScreen.js",
  "./screens/startScreen.js",
  "./screens/runMeasurementScreen.js",
  "./screens/runRouteScreen.js",
  "./screens/gpxAnalysisScreen.js",
  "./screens/moreScreen.js",
  "./screens/readingScreen.js",
  "./screens/simulationScreen.js",
  "./screens/planScreen.js",
  "./screens/privacyScreen.js",
  "./screens/recordInputScreen.js",
  "./screens/resultScreen.js",
  "./screens/settingsScreen.js",
  "./screens/supportGuidanceScreen.js",
  "./styles/base.css",
  "./styles/components.css",
  "./styles/layout.css",
  "./styles/screens.css",
  "./styles/responsive.css",
  "./styles/mobile.css",
  "./styles/interpretation-room.css",
  "./styles/desktop-foundation.css",
  "./styles/desktop.css",
  "./styles/tokens.css",
  "./styles/run-measurement.css",
  "./ui/pwaUpdateBootstrap.js",
  "./ui/appRouter.js",
  "./ui/deviceLayout.js",
  "./ui/appSettings.js",
  "./ui/appShell.js",
  "./ui/commonComponents.js",
  "./ui/consultationPresentation.js",
  "./ui/coursePresentation.js",
  "./ui/guideContent.js",
  "./ui/historyPresentation.js",
  "./ui/interpretationRoomPresentation.js",
  "./ui/bodyRegionVisuals.js",
  "./ui/interactions/browserUtilities.js",
  "./ui/interactions/consultationInteractions.js",
  "./ui/interactions/readingInteractions.js",
  "./ui/interactions/courseInteractions.js",
  "./ui/interactions/formUtilities.js",
  "./ui/interactions/gradeDomainConfirmation.js",
  "./ui/interactions/historyInteractions.js",
  "./ui/interactions/planInteractions.js",
  "./ui/interactions/simulationInteractions.js",
  "./ui/interactions/gpxAnalysisInteractions.js",
  "./ui/interactions/recordInputInteractions.js",
  "./ui/interactions/resultInteractions.js",
  "./ui/interactions/settingsInteractions.js",
  "./ui/personalContextPresentation.js",
  "./ui/planPresentation.js",
  "./ui/recordEmbeddedSubflows.js",
  "./ui/recordInputWorkspace.js",
  "./ui/flowSessionState.js",
  "./ui/gpxLocalAnalysis.js",
  "./ui/runMeasurementCore.js",
  "./ui/runMeasurementMap.js",
  "./ui/runMeasurementState.js",
  "./ui/interactions/runMeasurementInteractions.js",
  "./ui/interactions/runRouteInteractions.js",
  "./ui/recordPresentation.js",
  "./ui/restorePreviewPresentation.js",
  "./ui/screenArchitecture.js",
  "./ui/screenInteractions.js",
  "./ui/screenTutorial.js",
  "./ui/shellInteractions.js",
  "./ui/subjectivePresentation.js",
  "./ui/uiMotion.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

const PRECACHE_PATHS = new Set(PRECACHE_URLS.map((path) => new URL(path, self.location).pathname));

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => (key.startsWith(CACHE_PREFIX) || LEGACY_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => caches.open(CACHE_NAME))
      .then((cache) => cache.keys().then((requests) => Promise.all(requests
        .filter((request) => !PRECACHE_PATHS.has(new URL(request.url).pathname))
        .map((request) => cache.delete(request)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request, { cache: "no-store" }).catch(() => caches.match("./index.html")));
    return;
  }

  if (!PRECACHE_PATHS.has(url.pathname)) return;
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => (
      fetch(new Request(request, { cache: "no-store" }))
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            event.waitUntil(cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cache.match(request, { ignoreSearch: true }))
    ))
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
