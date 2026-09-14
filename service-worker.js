const CACHE_NAME = "runload-app-v1.4-public-readable-r2";
const APP_SHELL = [
  "./app.js",
  "./core/runloadCore.js",
  "./core/registry.js",
  "./core/part-01_storage_safety_foundation.js",
  "./core/part-02_regional_current_engine.js",
  "./core/part-03_regional_current_extensions.js",
  "./core/part-04_historical_v25r1.js",
  "./core/part-05_historical_a9_legacy.js",
  "./core/part-06_body_safety_notebook.js",
  "./core/part-07_v27_backup_model.js",
  "./core/part-08_workflows_consultation_app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./index.html",
  "./manifest.webmanifest",
  "./screens/activationScreen.js",
  "./screens/bodyPartDetailScreen.js",
  "./screens/columnScreen.js",
  "./screens/consultationScreen.js",
  "./screens/courseEditorScreen.js",
  "./screens/courseLibraryScreen.js",
  "./screens/historyScreen.js",
  "./screens/homeScreen.js",
  "./screens/notebookScreen.js",
  "./screens/personalInputScreen.js",
  "./screens/planScreen.js",
  "./screens/privacyScreen.js",
  "./screens/recordInputScreen.js",
  "./screens/resultScreen.js",
  "./screens/settingsScreen.js",
  "./screens/subjectiveInputScreen.js",
  "./screens/supportGuidanceScreen.js",
  "./styles/base.css",
  "./styles/components.css",
  "./styles/layout.css",
  "./styles/screens.css",
  "./styles/tokens.css",
  "./ui/appRouter.js",
  "./ui/appSettings.js",
  "./ui/appShell.js",
  "./ui/bodyRegionTerminology.js",
  "./ui/commonComponents.js",
  "./ui/consultationDraftState.js",
  "./ui/consultationPresentation.js",
  "./ui/coursePresentation.js",
  "./ui/externalCourseCheckSupport.js",
  "./ui/guideContent.js",
  "./ui/hierarchicalExplanation.js",
  "./ui/historyPresentation.js",
  "./ui/interactions/browserUtilities.js",
  "./ui/interactions/columnInteractions.js",
  "./ui/interactions/consultationInteractions.js",
  "./ui/interactions/courseInteractions.js",
  "./ui/interactions/formUtilities.js",
  "./ui/interactions/gradeDomainConfirmation.js",
  "./ui/interactions/historyInteractions.js",
  "./ui/interactions/notebookInteractions.js",
  "./ui/interactions/personalInputInteractions.js",
  "./ui/interactions/planInteractions.js",
  "./ui/interactions/recordInputInteractions.js",
  "./ui/interactions/resultInteractions.js",
  "./ui/interactions/settingsInteractions.js",
  "./ui/interactions/subjectiveInputInteractions.js",
  "./ui/newModelV1Presentation.js",
  "./ui/personalContextPresentation.js",
  "./ui/planPresentation.js",
  "./ui/recordInputWorkspace.js",
  "./ui/recordPresentation.js",
  "./ui/regionalV1Presentation.js",
  "./ui/restorePreviewPresentation.js",
  "./ui/resultPresentation.js",
  "./ui/screenArchitecture.js",
  "./ui/screenInteractions.js",
  "./ui/screenTutorial.js",
  "./ui/shellInteractions.js",
  "./ui/subjectivePresentation.js",
  "./ui/uiMotion.js",
  "./ui/v27ResultPresentation.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && (key.startsWith("runload-") || key.startsWith("running-journal-"))).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("message", (event) => { if (event.data?.type === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok && new URL(event.request.url).origin === self.location.origin) { const copy=response.clone(); caches.open(CACHE_NAME).then((cache)=>cache.put(event.request,copy)); }
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || (event.request.mode === "navigate" ? caches.match("./index.html") : undefined))));
});
