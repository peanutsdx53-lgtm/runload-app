import "./readingContent.js";
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
