from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"expected text not found: {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


# Use the distance accepted by the live measurement pipeline when available.
replace_once(
    "ui/runMeasurementAutoRecord.js",
    "function sampled(points = [], max = 80) {\n",
    '''function measuredSegmentDistanceMeters(a = {}, b = {}) {\n  const previousCumulative = Number(a?.cumulativeDistanceM);\n  const currentCumulative = Number(b?.cumulativeDistanceM);\n  if (finite(a?.cumulativeDistanceM) && finite(b?.cumulativeDistanceM) && currentCumulative >= previousCumulative) {\n    return currentCumulative - previousCumulative;\n  }\n  return haversineDistanceMeters(a, b);\n}\n\nfunction sampled(points = [], max = 80) {\n''',
)
replace_once("ui/runMeasurementAutoRecord.js", "  let altitudeCoverageM = 0;\n", "  let gradeEvaluatedM = 0;\n")
replace_once(
    "ui/runMeasurementAutoRecord.js",
    "    const distanceM = haversineDistanceMeters(a, b);\n",
    "    const distanceM = measuredSegmentDistanceMeters(a, b);\n",
)
replace_once(
    "ui/runMeasurementAutoRecord.js",
    '''    if (!finite(altitudeA) || !finite(altitudeB) || !altitudeAccurate) continue;\n    altitudeCoverageM += distanceM;\n    if (distanceM < MIN_GRADE_DISTANCE_M) continue;\n\n    const riseM = Number(altitudeB) - Number(altitudeA);\n    const grade = riseM / distanceM * 100;\n    if (!Number.isFinite(grade) || Math.abs(grade) > MAX_ABS_GRADE_PERCENT) continue;\n''',
    '''    if (!finite(altitudeA) || !finite(altitudeB) || !altitudeAccurate) continue;\n    if (distanceM < MIN_GRADE_DISTANCE_M) continue;\n\n    const riseM = Number(altitudeB) - Number(altitudeA);\n    const grade = riseM / distanceM * 100;\n    if (!Number.isFinite(grade) || Math.abs(grade) > MAX_ABS_GRADE_PERCENT) continue;\n    gradeEvaluatedM += distanceM;\n''',
)
replace_once(
    "ui/runMeasurementAutoRecord.js",
    '''  const elevationCoverage = altitudeCoverageM / totalM;\n  const gradeKnown = elevationCoverage >= 0.8;\n''',
    '''  const elevationCoverage = gradeEvaluatedM / totalM;\n  const gradeKnown = gradeEvaluatedM > 0 && elevationCoverage >= 0.8;\n''',
)
replace_once(
    "ui/runMeasurementAutoRecord.js",
    '''    upPercent: gradeKnown ? round(upM / totalM * 100, 1) : 0,\n    downPercent: gradeKnown ? round(downM / totalM * 100, 1) : 0,\n    flatPercent: gradeKnown ? round(Math.max(0, 100 - (upM + downM) / totalM * 100), 1) : null,\n''',
    '''    upPercent: gradeKnown ? round(upM / gradeEvaluatedM * 100, 1) : 0,\n    downPercent: gradeKnown ? round(downM / gradeEvaluatedM * 100, 1) : 0,\n    flatPercent: gradeKnown ? round(flatM / gradeEvaluatedM * 100, 1) : null,\n''',
)

# Add explicit regressions for the two previously identified inconsistencies.
p = Path("tests/mobileMeasurementAutoRecord.test.mjs")
text = p.read_text()
anchor = "await test('MISSING-ALTITUDE-DOES-NOT-FABRICATE-SLOPE', async () => {\n"
insert = '''await test('COURSE-ANALYSIS-USES-MEASUREMENT-DISTANCE-INSTEAD-OF-READDING-SMALL-GPS-MOVES', async () => {\n  const track = Array.from({ length: 11 }, (_, index) => ({\n    lat: 35,\n    lon: 139 + index * 0.00002,\n    timestamp: index * 6000,\n    cumulativeDistanceM: index,\n  }));\n  const result = analyzeMeasuredCourse({ track, durationMs: 60 * 1000 });\n  assert.equal(result?.distanceKm, 0.01);\n});\n\nawait test('IMPLAUSIBLE-GRADE-SEGMENTS-DO-NOT-COUNT-AS-ELEVATION-COVERAGE-OR-FLAT', async () => {\n  const track = Array.from({ length: 7 }, (_, index) => ({\n    lat: 35,\n    lon: 139 + index * 0.0001,\n    timestamp: index * 10000,\n    cumulativeDistanceM: index * 10,\n    altitudeM: index * 100,\n    altitudeAccuracyM: 5,\n  }));\n  const result = analyzeMeasuredCourse({ track, durationMs: 60 * 1000 });\n  assert.equal(result?.elevationCoverage, 0);\n  assert.equal(result?.gradeKnowledge, 'UNKNOWN');\n  assert.equal(result?.flatPercent, null);\n  assert.equal(result?.elevationGainM, null);\n});\n\n'''
if anchor not in text:
    raise SystemExit("mobile measurement test insertion anchor not found")
p.write_text(text.replace(anchor, insert + anchor, 1))

# Runtime behavior changed: advance app/cache version.
old = "2026.09.29.6"
new = "2026.09.29.7"
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

print("GPS consistency candidate applied")
