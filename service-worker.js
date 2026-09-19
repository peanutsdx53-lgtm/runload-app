const CACHE_NAME = "runload-app-current-v119-usability-v1";
const RUNLOAD_CACHE_PREFIX = "runload-app-";
const PRECACHE_URLS = [
  "./app.js",
  "./core/runloadCore.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./index.html",
  "./manifest.webmanifest",
  "./screens/activationScreen.js",
  "./screens/bodyPartDetailScreen.js",
  "./screens/consultationScreen.js",
  "./screens/courseEditorScreen.js",
  "./screens/courseLibraryScreen.js",
  "./screens/historyScreen.js",
  "./screens/homeScreen.js",
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
  "./styles/prototype-fidelity-v2.css",
  "./styles/prototype-mobile-parity.css",
  "./styles/product-quality.css",
  "./styles/tokens.css",
  "./ui/appRouter.js",
  "./ui/appSettings.js",
  "./ui/appShell.js",
  "./ui/bodyRegionResultPresentation.js",
  "./ui/commonComponents.js",
  "./ui/consultationDraftState.js",
  "./ui/consultationPresentation.js",
  "./ui/coursePresentation.js",
  "./ui/externalCourseCheckSupport.js",
  "./ui/guideContent.js",
  "./ui/hierarchicalExplanation.js",
  "./ui/historyPresentation.js",
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
  "./ui/recordPresentation.js",
  "./ui/restorePreviewPresentation.js",
  "./ui/runResultPresentation.js",
  "./ui/screenArchitecture.js",
  "./ui/screenInteractions.js",
  "./ui/screenTutorial.js",
  "./ui/shellInteractions.js",
  "./ui/subjectivePresentation.js",
  "./ui/uiMotion.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(RUNLOAD_CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

const PRECACHE_PATHS = new Set(PRECACHE_URLS.map((path) => new URL(path, self.location).pathname));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("./index.html")));
    return;
  }

  if (!PRECACHE_PATHS.has(url.pathname)) return;
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => (
      cache.match(request, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            event.waitUntil(cache.put(request, copy));
          }
          return response;
        });
      })
    ))
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
