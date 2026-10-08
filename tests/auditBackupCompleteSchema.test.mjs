import assert from "node:assert/strict";
import { createApplicationServices, createMemoryStorage, STORAGE_KEYS } from "../core/appCore.js";

const storage = createMemoryStorage();
const services = createApplicationServices({ storage });
const backup = services.storage.backup;
const original = backup.createBackupSnapshot();
const keys = Object.keys(original.data);
assert.equal(keys.length, 19, "current backup must export all registered user data keys");
assert.equal(backup.validateBackupSnapshot(original).canRestore, true, "complete current format stays restorable");

let checks = 0;
for (const missingKey of keys) {
  const partial = { ...original, data: { ...original.data } };
  delete partial.data[missingKey];
  const inspection = backup.validateBackupSnapshot(partial);
  assert.equal(inspection.canRestore, false, `missing key ${missingKey} should block restore`);
  assert.equal(inspection.status, "RESTORE_BLOCKED");
  assert.ok(inspection.issues.some((i) => i.code === "BACKUP_REQUIRED_STORAGE_KEY_MISSING" && i.details?.missingKeys.includes(missingKey)));
  assert.equal(backup.restoreInspectedBackup(inspection, { acceptReview: true }).ok, false);
  assert.equal(backup.restoreBackupText(JSON.stringify(partial)).ok, false);
  checks++;
}
const nullData = { ...original, data: { ...original.data, [STORAGE_KEYS.profile]: null } };
assert.equal(backup.validateBackupSnapshot(nullData).canRestore, true, "null of an existing optional field remains valid");
const unknownData = { ...original, data: { ...original.data, "old-unknown-storage": [] } };
assert.equal(backup.validateBackupSnapshot(unknownData).canRestore, false, "unknown keys must remain rejected");
console.log(`auditBackupCompleteSchema: PASS; incomplete backup keys rejected ${checks}/${keys.length}; full/null/unknown boundaries PASS`);
