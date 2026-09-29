from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"expected text not found: {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


# Presentation-only cleanup. Keep stored/model terminology unchanged and translate
# only when it is about to become user-visible in the advanced explanation.
replace_once(
    "ui/interpretationRoomPresentation.js",
    '''function publicConstructText(value = "") {
  return String(value || "")
    .replace(/Reference[- ]?100/gi, "基準100")
    .replace(/reference[- ]?100/gi, "基準100")
    .replace(/Reference/gi, "基準");
}

function renderAdvanced(output, region) {''',
    r'''function publicConstructText(value = "") {
  return String(value || "")
    .replace(/膝蓋大腿関節stress力積/gi, "膝蓋大腿関節の応力の積み重なりを表す指標")
    .replace(/脛骨stress力積/gi, "脛骨の応力の積み重なりを表す指標")
    .replace(/アキレス腱strain力積/gi, "アキレス腱のひずみの積み重なりを表す指標")
    .replace(/stress力積/gi, "応力の積み重なりを表す指標")
    .replace(/strain力積/gi, "ひずみの積み重なりを表す指標")
    .replace(/Reference[- ]?100/gi, "基準100")
    .replace(/reference[- ]?100/gi, "基準100")
    .replace(/Reference/gi, "基準");
}

function publicSourceRoleText(value = "") {
  return String(value || "")
    .replace(/保存原典Figure 3とTable 3から再現した筋活動経路/gi, "保存原典の図3と表3から再現した筋活動の関係")
    .replace(/Table 3係数と2\.5 m\/s正規化で再現した下腿後面筋活動経路/gi, "表3の係数を使い、2.5 m/sを基準にそろえて再現した下腿後面の筋活動の関係")
    .replace(/Figure\s*([0-9]+)/gi, "図$1")
    .replace(/Table\s*([0-9]+)/gi, "表$1")
    .replace(/cadence/gi, "ピッチ")
    .replace(/速度\/条件応答/g, "速度と走行条件への応答")
    .replace(/速度\/上り応答/g, "速度と上り条件への応答");
}

function renderAdvanced(output, region) {''',
)

replace_once(
    "ui/interpretationRoomPresentation.js",
    '${sources.map((source) => `<li>${escapeHtml(source.label || "参考資料")}${source.role ? ` — ${escapeHtml(source.role)}` : ""}</li>`).join("")}',
    '${sources.map((source) => `<li>${escapeHtml(source.label || "参考資料")}${source.role ? ` — ${escapeHtml(publicSourceRoleText(source.role))}` : ""}</li>`).join("")}',
)

# Lock the public rendering boundary in the presentation test.
path = Path("tests/interpretationPresentation.test.mjs")
text = path.read_text()
anchor = '''await test('REGION-LINK-CARRIES-RECORD-AND-REGION',()=>{'''
new_test = r'''await test('ADVANCED-COPY-TRANSLATES-RESEARCH-INTERNALS-BEFORE-DISPLAY',()=>{
  const stress=baseOutput({selected:true});
  stress.advanced.evidence.regions['BA-DISP-014']={
    construct:'膝蓋大腿関節stress力積に基づく部位内Reference-100',
    sources:[
      {label:'Gazendam & Hof 2007',role:'保存原典Figure 3とTable 3から再現した筋活動経路'},
      {label:'Gazendam & Hof 2007',role:'Table 3係数と2.5 m/s正規化で再現した下腿後面筋活動経路'},
      {label:'Hagen et al. 2023',role:'膝蓋大腿関節の速度・相対cadence応答'},
      {label:'Van Hooren et al. 2024',role:'脛骨・アキレス腱の速度/条件応答'},
    ],
  };
  const stressHtml=renderInterpretationRoom({output:stress});
  assert.match(stressHtml,/膝蓋大腿関節の応力の積み重なりを表す指標に基づく部位内基準100/);
  assert.match(stressHtml,/保存原典の図3と表3から再現した筋活動の関係/);
  assert.match(stressHtml,/表3の係数を使い、2\.5 m\/sを基準にそろえて再現した下腿後面の筋活動の関係/);
  assert.match(stressHtml,/相対ピッチ応答/);
  assert.match(stressHtml,/脛骨・アキレス腱の速度と走行条件への応答/);
  assert.doesNotMatch(stressHtml,/stress力積|strain力積|Figure 3|Table 3|cadence|正規化|Reference-100/i);

  const strain=baseOutput({selected:true});
  strain.advanced.evidence.regions['BA-DISP-014'].construct='アキレス腱strain力積に基づく部位内Reference-100';
  const strainHtml=renderInterpretationRoom({output:strain});
  assert.match(strainHtml,/アキレス腱のひずみの積み重なりを表す指標に基づく部位内基準100/);
  assert.doesNotMatch(strainHtml,/stress力積|strain力積|Reference-100/i);
});

'''
if anchor not in text:
    raise SystemExit("interpretation presentation insertion anchor not found")
path.write_text(text.replace(anchor, new_test + anchor, 1))

# Runtime UI changed, so advance the app/cache version in the same verified candidate.
old = "2026.09.29.5"
new = "2026.09.29.6"
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

print("Stage 4B public terminology candidate applied")
