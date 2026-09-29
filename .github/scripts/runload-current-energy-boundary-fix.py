from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"expected text not found: {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    "ui/interactions/runMeasurementInteractions.js",
    '  if (result?.ok) return "体重と平均速度から推定しています。";\n',
    '  if (result?.ok) return "連続して走った場合として仮推定しています。走り＋歩きの記録には保存しません。";\n',
)

replace_once(
    "ui/runMeasurementState.js",
    'export function commitPendingRunMeasurement(recordId = "") {\n  const id = String(recordId || "").trim();\n',
    'export function commitPendingRunMeasurement(recordId = "", options = {}) {\n  const id = String(recordId || "").trim();\n  const runningFormat = String(options?.runningFormat || "UNKNOWN").toUpperCase();\n  const keepContinuousRunEnergy = runningFormat === "CONTINUOUS_RUN";\n',
)
replace_once(
    "ui/runMeasurementState.js",
    '    energyEstimate: normalizeEnergyEstimate(pending.energyEstimate),\n',
    '    energyEstimate: keepContinuousRunEnergy ? normalizeEnergyEstimate(pending.energyEstimate) : null,\n',
)

replace_once(
    "ui/interactions/recordInputInteractions.js",
    '      const measurementResult = commitPendingRunMeasurement(result.record.id);\n',
    '      const measurementResult = commitPendingRunMeasurement(result.record.id, { runningFormat: result.record.runningFormat });\n',
)

# Add direct persistence regressions without creating an additional test file.
p = Path("tests/mobileMeasurementAutoRecord.test.mjs")
text = p.read_text()
old_import = """} from '../ui/runMeasurementAutoRecord.js';\n\nconst stateText"""
new_import = """} from '../ui/runMeasurementAutoRecord.js';\nimport {\n  clearPendingRunMeasurement,\n  commitPendingRunMeasurement,\n  findSavedRunMeasurement,\n  savePendingRunMeasurement,\n} from '../ui/runMeasurementState.js';\n\nconst stateText"""
if old_import not in text:
    raise SystemExit("state import anchor not found")
text = text.replace(old_import, new_import, 1)

anchor = "await test('SMARTPHONE-UI-SHOWS-AUTO-FACTS-AND-KEEPS-SURFACE-MANUAL', async () => {\n"
insert = '''await test('ENERGY-ESTIMATE-IS-STORED-ONLY-AFTER-CONTINUOUS-RUN-CONFIRMATION', async () => {\n  const track = [\n    { lat: 35, lon: 139, timestamp: 0, cumulativeDistanceM: 0 },\n    { lat: 35.001, lon: 139.001, timestamp: 60000, cumulativeDistanceM: 100 },\n  ];\n  const energyEstimate = {\n    modelId: 'adult-compendium-2024-running-speed-v1',\n    estimatedKcal: 240, met: 8.5, compendiumCode: '12030', mapping: 'test',\n    bodyMassKg: 60, averageSpeedKmh: 10, durationMinutes: 30,\n  };\n\n  clearPendingRunMeasurement();\n  let pending = savePendingRunMeasurement({\n    runId: 'energy-continuous', distanceKm: 5, durationMinutes: 30,\n    energyEstimate, track, saveRoute: true,\n  });\n  assert.equal(pending.ok, true);\n  let committed = commitPendingRunMeasurement('energy-continuous-record', { runningFormat: 'CONTINUOUS_RUN' });\n  assert.equal(committed.ok, true);\n  assert.equal(committed.saved, true);\n  assert.equal(findSavedRunMeasurement('energy-continuous-record')?.energyEstimate?.estimatedKcal, 240);\n\n  pending = savePendingRunMeasurement({\n    runId: 'energy-run-walk', distanceKm: 5, durationMinutes: 30,\n    energyEstimate, track, saveRoute: true,\n  });\n  assert.equal(pending.ok, true);\n  committed = commitPendingRunMeasurement('energy-run-walk-record', { runningFormat: 'RUN_WALK' });\n  assert.equal(committed.ok, true);\n  assert.equal(findSavedRunMeasurement('energy-run-walk-record')?.energyEstimate, null);\n\n  pending = savePendingRunMeasurement({\n    runId: 'energy-unknown', distanceKm: 5, durationMinutes: 30,\n    energyEstimate, track, saveRoute: true,\n  });\n  assert.equal(pending.ok, true);\n  committed = commitPendingRunMeasurement('energy-unknown-record', { runningFormat: 'UNKNOWN' });\n  assert.equal(committed.ok, true);\n  assert.equal(findSavedRunMeasurement('energy-unknown-record')?.energyEstimate, null);\n});\n\n'''
if anchor not in text:
    raise SystemExit("energy regression insertion anchor not found")
text = text.replace(anchor, insert + anchor, 1)
p.write_text(text)

# Keep a human-readable UI contract in the existing smartphone measurement suite.
p = Path("tests/runMeasurementRofJBridge.test.mjs")
text = p.read_text()
anchor = "test('ENERGY-MODEL-USES-CONTROLLED-COMPENDIUM-BOUNDARY', () => {\n"
insert = '''test('LIVE-ENERGY-IS-LABELED-AS-PROVISIONAL-CONTINUOUS-RUN-ESTIMATE', () => {\n  assert.ok(interactions.includes('連続して走った場合として仮推定しています。走り＋歩きの記録には保存しません。'));\n  assert.ok(state.includes('keepContinuousRunEnergy'));\n  assert.ok(state.includes('runningFormat === "CONTINUOUS_RUN"'));\n});\n\n'''
if anchor not in text:
    raise SystemExit("energy UI contract insertion anchor not found")
text = text.replace(anchor, insert + anchor, 1)
old_expectation = "  assert.ok(state.includes('energyEstimate: normalizeEnergyEstimate(pending.energyEstimate)'));\n"
new_expectation = "  assert.ok(state.includes('energyEstimate: keepContinuousRunEnergy ? normalizeEnergyEstimate(pending.energyEstimate) : null'));\n"
if old_expectation not in text:
    raise SystemExit("stale energy persistence expectation not found")
text = text.replace(old_expectation, new_expectation, 1)
p.write_text(text)

# Runtime behavior changed: advance app/cache version.
old = "2026.09.29.7"
new = "2026.09.29.8"
version_tests = [p for p in Path("tests").glob("*.mjs") if old in p.read_text()]
expected = {
    "tests/currentOnlyRecordSchema.test.mjs",
    "tests/mobileHomeAtomicDropCoordinator.test.mjs",
    "tests/mobileHomeInitialLayout.test.mjs",
    "tests/mobileHomeIosScrollCapacity.test.mjs",
    "tests/runMeasurementNotifications.test.mjs",
}
actual = {str(p) for p in version_tests}
if actual != expected:
    raise SystemExit(f"unexpected version-pinned tests: {sorted(actual)}")
for file in [Path("ui/appVersionStatus.js"), Path("service-worker.js"), *version_tests]:
    source = file.read_text()
    if old not in source:
        raise SystemExit(f"old version absent: {file}")
    file.write_text(source.replace(old, new))

print("Energy persistence boundary candidate applied")
