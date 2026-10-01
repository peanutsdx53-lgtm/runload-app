const CACHE_NAME = "running-record-app-runtime-2026.10.01.40";
const CACHE_PREFIX = "running-record-app-";
const PRECACHE_URLS = [
  "./app.js",
  "./core/interpretationBase.js",
  "./core/interpretationCore.js",
  "./core/appCore.js",
  "./core/rofJConstants.js",
  "./core/rofJAuthorConfirmedScale.js",
  "./core/rofJCore.js",
  "./core/internal/modules.js",
  "./core/internal/platformInfrastructure.js",
  "./core/internal/modelSupport.js",
  "./core/internal/mobileWalkJogSpeedModel.js",
  "./core/internal/inputSupport.js",
  "./core/internal/recordRepositories.js",
  "./core/internal/primaryModelEngine.js",
  "./core/internal/surfacePresetCatalog.js",
  "./core/internal/primaryInputProcessing.js",
  "./core/internal/primaryModelResults.js",
  "./core/internal/applicationDomain.js",
  "./core/internal/courseRepository.js",
  "./core/internal/restoreInspection.js",
  "./core/internal/backupService.js",
  "./core/internal/publicHelpGuidance.js",
  "./core/internal/recordWorkflow.js",
  "./core/internal/historyWorkflow.js",
  "./core/internal/planPreview.js",
  "./core/internal/planWorkflow.js",
  "./core/internal/evidenceData.js",
  "./core/internal/readingCatalog.js",
  "./core/internal/readingService.js",
  "./core/internal/consultationReport.js",
  "./core/internal/bodyRegionTerminology.js",
  "./core/internal/deterministicConsultation.js",
  "./core/internal/applicationServices.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./assets/rof/rof-visual-lowest.png",
  "./assets/rof/rof-visual-low.png",
  "./assets/rof/rof-visual-moderate.png",
  "./assets/rof/rof-visual-high.png",
  "./assets/rof/rof-visual-highest.png",
  "./index.html",
  "./manifest.webmanifest",
  "./screens/achievementsScreen.js",
  "./screens/aboutScreen.js",
  "./screens/bodyPartDetailScreen.js",
  "./screens/consultationScreen.js",
  "./screens/courseEditorScreen.js",
  "./screens/courseLibraryScreen.js",
  "./screens/historyScreen.js",
  "./screens/interpretationRoomScreen.js",
  "./screens/homeScreen.js",
  "./screens/runMeasurementScreen.js",
  "./screens/runRouteScreen.js",
  "./screens/bodyTimelineScreen.js",
  "./screens/gpxAnalysisScreen.js",
  "./screens/moreScreen.js",
  "./screens/mobileQuickToolsScreen.js",
  "./screens/mobilePhotoMemoScreen.js",
  "./screens/mobilePaceCalculatorScreen.js",
  "./screens/readingScreen.js",
  "./screens/simulationScreen.js",
  "./screens/planScreen.js",
  "./screens/privacyScreen.js",
  "./screens/termsScreen.js",
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
  "./styles/mobile-home.css",
  "./styles/mobile-home-editing.css",
  "./styles/mobile-home-ios-editing.css",
  "./styles/mobile-home-three-row.css",
  "./styles/mobile-record.css",
  "./styles/rof-j-visual.css",
  "./styles/rof-j-compact.css",
  "./styles/mobile-run-measurement.css",
  "./styles/mobile-run-measurement-ergonomics.css",
  "./styles/mobile-walk-jog.css",
  "./styles/mobile-walk-jog-records.css",
  "./styles/mobile-walk-jog-history.css",
  "./styles/mobile-app-screens.css",
  "./styles/mobile-quick-tools.css",
  "./styles/mobile-pace-calculator.css",
  "./styles/mobile-navigation-unification.css",
  "./styles/mobile-usability.css",
  "./styles/mobile-course-v16.css",
  "./styles/mobile-onboarding.css",
  "./styles/mobile-achievements.css",
  "./styles/mobile-final-polish.css",
  "./styles/mobile-run-experiments.css",
  "./styles/mobile-insights-v30.css",
  "./styles/mobile-experience-v31.css",
  "./styles/pc-course-v17.css",
  "./styles/interpretation-room.css",
  "./styles/desktop-foundation.css",
  "./styles/desktop.css",
  "./styles/desktop-refresh-v38.css",
  "./styles/desktop-history-v39.css",
  "./styles/desktop-simulation-v40.css",
  "./styles/tokens.css",
  "./styles/run-measurement.css",
  "./ui/mobileAchievements.js",
  "./ui/mobileInsights.js",
  "./ui/mobileHomeExperience.js",
  "./ui/runFingerprint.js",
  "./ui/bootRecovery.js",
  "./ui/appVersionStatus.js",
  "./ui/rofJVisualEnhancement.js",
  "./ui/mobileMeasurementRecordAutofill.js",
  "./ui/mobileHomeInitialLayoutV32.js",
  "./ui/mobileWalkJogMeasurementWiring.js",
  "./ui/mobileWalkJogGpsQuality.js",
  "./ui/mobileWalkJogGpsQualityUi.js",
  "./ui/mobileWalkJogCopyGuard.js",
  "./ui/mobileWalkJogRecordStore.js",
  "./ui/mobileWalkJogSaveHistoryLink.js",
  "./ui/mobileWalkJogHistoryUi.js",
  "./ui/mobileWalkJogGpsQualityHistoryGuard.js",
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
  "./ui/interactions/homeInteractions.js",
  "./ui/interactions/homeGridModel.js",
  "./ui/mobileHomePageCapacity.js",
  "./ui/mobileHomeHub.js",
  "./ui/desktopFirstUse.js",
  "./ui/desktopHomeEnhancement.js",
  "./ui/desktopHistoryEnhancement.js",
  "./ui/mobileOnboarding.js",
  "./ui/mobileHomeDropCoordinator.js",
  "./ui/mobileHomeWidgetIconSwap.js",
  "./ui/iosHomeEditScrollFix.js",
  "./ui/mobileHomeEditScroll.js",
  "./ui/mobileHomeReturnTransition.js",
  "./ui/interactions/mobileQuickToolsInteractions.js",
  "./ui/interactions/mobilePhotoMemoInteractions.js",
  "./ui/interactions/mobilePaceCalculatorInteractions.js",
  "./ui/interactions/planInteractions.js",
  "./ui/interactions/simulationInteractions.js",
  "./ui/interactions/gpxAnalysisInteractions.js",
  "./ui/interactions/recordInputInteractions.js",
  "./ui/interactions/resultInteractions.js",
  "./ui/interactions/bodyPartDetailInteractions.js",
  "./ui/interactions/settingsInteractions.js",
  "./ui/mobileQuickToolsStore.js",
  "./ui/mobilePhotoMemoStore.js",
  "./ui/personalContextPresentation.js",
  "./ui/recordEmbeddedSubflows.js",
  "./ui/recordInputWorkspace.js",
  "./ui/flowSessionState.js",
  "./ui/gpxLocalAnalysis.js",
  "./ui/runMeasurementCore.js",
  "./ui/runMeasurementEnergy.js",
  "./ui/runMeasurementAutoRecord.js",
  "./ui/runMeasurementMap.js",
  "./ui/runMeasurementNotifications.js",
  "./ui/runMeasurementState.js",
  "./ui/interactions/runMeasurementInteractions.js",
  "./ui/interactions/runRouteInteractions.js",
  "./ui/interactions/bodyTimelineInteractions.js",
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
  );
});

const PRECACHE_PATHS = new Set(PRECACHE_URLS.map((path) => new URL(path, self.location).pathname));

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
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
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const refresh = fetch(new Request(request, { cache: "no-store" }))
        .then((response) => {
          if (response.ok && response.type === "basic") {
            event.waitUntil(cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(refresh);
        return cached;
      }

      const response = await refresh;
      return response || Response.error();
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
