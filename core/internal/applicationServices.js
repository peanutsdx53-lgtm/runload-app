import "./deterministicConsultation.js";
import { internalModules } from "./modules.js";

// ===== core/dataManagement/dataManagementService.js =====
{
const moduleExports = Object.create(null);
const { CURRENT_APP_REMOVABLE_STORAGE_KEYS } = internalModules.storageKeys;

function createDataManagementService(gateway) {
  function clearAllUserData() {
    return gateway.transact(CURRENT_APP_REMOVABLE_STORAGE_KEYS.map((key) => ({ key, remove: true })));
  }
  return Object.freeze({ clearAllUserData });
}
moduleExports["createDataManagementService"] = createDataManagementService;
internalModules.dataManagementService = moduleExports;
}

// ===== core/applicationServices.js =====
{
const moduleExports = Object.create(null);
const { createStorageGateway } = internalModules.storageGateway;
const { createRecordRepository } = internalModules.recordRepository;
const { createModelResultV27Repository } = internalModules.legacyLoadResultRepository;
const { createModelResultRegionalV2Repository } = internalModules.primaryRegionalResultRepository;
const { createSubjectiveFeedbackRepository } = internalModules.subjectiveFeedbackRepository;
const { createPlanRepository } = internalModules.planRepository;
const { createProfileRepository, createSettingsRepository, createDraftRepository } = internalModules.simpleValueRepositories;
const { createBackupService } = internalModules.backupService;
const { createCourseRepository } = internalModules.courseRepository;
const { evaluateSupportDecision, shouldBlockNormalPlanSuggestions, shouldPrioritizeOfficialHelp } = internalModules.supportDecision;
const { buildPublicHelpGuidance } = internalModules.publicHelpGuidance;
const { normalizeSubjectiveFeedback } = internalModules.subjectiveFeedback;
const { normalizeRunningRecord, validateRunningRecord, validateRunningRecordInput } = internalModules.inputValidation;
const { createRecordWorkflow } = internalModules.recordWorkflow;
const { createHistoryWorkflow } = internalModules.historyWorkflow;
const { createPlanWorkflow } = internalModules.planWorkflow;
const { createColumnService } = internalModules.columnService;
const { createDataManagementService } = internalModules.dataManagementService;
const { buildConsultationReport, createShortConsultationMemo, createStandardConsultationText, createDetailedConsultationText } = internalModules.consultationReport;
const { buildDeterministicConsultation, CONSULTATION_PURPOSES, DETERMINISTIC_CONSULTATION_VERSION } = internalModules.deterministicConsultation;
const { adaptRecordToV27Session } = internalModules.legacyLoadInputAdapter;
const { assertV27ResultSemantics, calculateV27Session } = internalModules.legacyLoadModel;
const { createV27ResultRecord } = internalModules.legacyLoadResultService;
const { createPrimaryRegionalV2ResultRecord } = internalModules.primaryRegionalResultService;
const { calculateRun: calculatePrimaryRegionalV2 } = internalModules.primaryRegionalEngine;

function createApplicationServices(options = {}) {
  const gateway = options.gateway || createStorageGateway(options.storage);
  const records = createRecordRepository(gateway);
  const modelResultsV27 = createModelResultV27Repository(gateway);
  const modelResultsRegionalV2 = createModelResultRegionalV2Repository(gateway);
  const subjectiveFeedback = createSubjectiveFeedbackRepository(gateway);
  const plans = createPlanRepository(gateway);
  const profile = createProfileRepository(gateway);
  const recordWorkflow = createRecordWorkflow({
    gateway,
    recordsRepository: records,
    subjectiveFeedbackRepository: subjectiveFeedback,
    profileRepository: profile,
    modelResultV27Repository: modelResultsV27,
    modelResultRegionalV2Repository: modelResultsRegionalV2,
  });

  const services = {
    model: Object.freeze({
      primaryRegionalV2: Object.freeze({ calculatePrimaryRegionalV2, createPrimaryRegionalV2ResultRecord }),
      v27: Object.freeze({
        adaptRecordToV27Session,
        calculateV27Session,
        assertV27ResultSemantics,
        createV27ResultRecord,
      }),
    }),
    safety: Object.freeze({
      evaluateSupportDecision,
      shouldBlockNormalPlanSuggestions,
      shouldPrioritizeOfficialHelp,
      buildPublicHelpGuidance,
      normalizeSubjectiveFeedback,
      normalizeRunningRecord,
      validateRunningRecord,
      validateRunningRecordInput,
    }),
    storage: Object.freeze({
      gateway,
      records,
      modelResultsV27,
      modelResultsRegionalV2,
      subjectiveFeedback,
      plans,
      profile,
      settings: createSettingsRepository(gateway),
      draft: createDraftRepository(gateway),
      courses: createCourseRepository(gateway),
      backup: createBackupService(gateway),
    }),
    workflows: {},
    consultation: Object.freeze({
      buildConsultationReport,
      createShortConsultationMemo,
      createStandardConsultationText,
      createDetailedConsultationText,
      buildDeterministicConsultation,
      purposes: CONSULTATION_PURPOSES,
      deterministicVersion: DETERMINISTIC_CONSULTATION_VERSION,
    }),
    column: createColumnService(),
    dataManagement: createDataManagementService(gateway),
  };
  services.workflows.records = recordWorkflow;
  services.workflows.history = createHistoryWorkflow({
    gateway,
    recordsRepository: records,
    modelResultV27Repository: modelResultsV27,
    modelResultRegionalV2Repository: modelResultsRegionalV2,
    subjectiveFeedbackRepository: subjectiveFeedback,
    planRepository: plans,
  });
  services.workflows.plans = createPlanWorkflow({ services, planRepository: plans });
  services.workflows = Object.freeze(services.workflows);
  return Object.freeze(services);
}
moduleExports["createApplicationServices"] = createApplicationServices;
internalModules.applicationServices = moduleExports;
}
