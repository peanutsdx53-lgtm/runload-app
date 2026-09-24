import "./application.js";
import { coreModules as __mods } from "./moduleRegistry.js";

// ===== data/evidenceGovernanceData.js =====
{
const __exp = Object.create(null);
const EVIDENCE_GOVERNANCE_VERSION = "runload-evidence-governed-columns-v5";
const EVIDENCE_GOVERNANCE_REVIEW_DATE = "2026-08-06";

function freezeList(items = []) {
  return Object.freeze([...items]);
}

function sourceRecord(input) {
  return Object.freeze({
    ...input,
    modelSourceIds: freezeList(input.modelSourceIds),
    anchorIds: freezeList(input.anchorIds),
    relatedInputs: freezeList(input.relatedInputs),
    relatedRoutes: freezeList(input.relatedRoutes),
    relatedRegions: freezeList(input.relatedRegions),
  });
}

function articleRecord(input) {
  return Object.freeze({
    ...input,
    sourceIds: freezeList(input.sourceIds),
    relatedInputs: freezeList(input.relatedInputs),
    relatedRoutes: freezeList(input.relatedRoutes),
    relatedRegions: freezeList(input.relatedRegions),
  });
}

const SOURCE_EVIDENCE_REGISTRY = Object.freeze([
  sourceRecord({
    sourceId: "RUNLOAD-SPEC-CURRENT",
    sourceRole: "CURRENT_INTERNAL_SPECIFICATION",
    title: "RunLoad Current model, output, and claim-boundary specifications",
    locator: "Master V1.10: 02_INPUT_OUTPUT_UI_CURRENT/03_OUTPUT_UI_SEMANTIC_CONTRACT_CURRENT.md; 03_REGIONAL_A4_MODEL_CURRENT/00, 12, 13, 24",
    evidenceStatus: "CURRENT_INTERNAL_SPEC",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: [],
    anchorIds: [],
    relatedInputs: ["記事ごとの関連入力", "表示状態", "比較signature"],
    relatedRoutes: ["表示契約", "情報分離", "非主張境界"],
    relatedRegions: ["記事ごとの対象部位"],
    allowedClaim: "Current仕様で固定した計算の意味、表示状態、情報分離、非主張境界を説明できる。",
    prohibitedClaim: "臨床妥当性、個人の安全、傷害確率、診断、走行可否を証明する資料として扱わない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-MINETTI",
    sourceRole: "V27_ACTIVE_MODEL_AND_APP_READING",
    title: "Energy cost of walking and running at extreme uphill and downhill slopes",
    locator: "Methods/equation and grade-cost results / PDF pp.3-6; Current packaged PDF identity in Source Crosswalk",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["SRC-NEW-001"],
    anchorIds: [],
    relatedInputs: ["代表勾配", "上り区間割合", "下り区間割合"],
    relatedRoutes: ["V2.7 grade energy-cost route"],
    relatedRegions: ["なし（総合推定負荷の別指標）"],
    allowedClaim: "資料内の勾配と代謝コストの方向・比率を、宣言したV2.7比較用変換の範囲で説明できる。",
    prohibitedClaim: "個人の消費エネルギー実測値、疲労、傷害、走行可否へ変換しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-VAN-HOOREN",
    sourceRole: "REGIONAL_A4_V27_AND_APP_READING",
    title: "Per-step and cumulative load at three common running injury locations: The effect of speed, surface gradient, and cadence",
    locator: "Table 2 / PDF p.9",
    evidenceStatus: "FULL_TEXT_AND_A4_ANCHORS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["BAT-SRC-010"],
    anchorIds: ["RCM-ANCH-001..039"],
    relatedInputs: ["速度", "勾配", "cadence"],
    relatedRoutes: ["Regional A4 SPEED", "Regional A4 GRADE", "Regional A4 CADENCE"],
    relatedRegions: ["膝蓋大腿関節領域", "アキレス腱領域", "足底腱膜領域"],
    allowedClaim: "資料の条件・endpoint・範囲内で、3領域の累積代理指標の方向と比率を説明できる。",
    prohibitedClaim: "3領域以外へ一般化せず、傷害確率、危険順位、共通物理単位、因果関係を主張しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-NUCKOLS",
    sourceRole: "REGIONAL_A4_V27_AND_APP_READING",
    title: "Mechanics of walking and running up and downhill: a joint-level perspective",
    locator: "Table 1 / PDF p.6",
    evidenceStatus: "FULL_TEXT_AND_A4_ANCHORS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["SRC-SUP-003"],
    anchorIds: ["RCM-ANCH-A3-001..015"],
    relatedInputs: ["勾配"],
    relatedRoutes: ["Regional A4 GRADE_JOINT_POWER"],
    relatedRegions: ["股関節領域", "大腿前面領域", "足関節領域"],
    allowedClaim: "資料のjoint-power条件と指定proxy変換の範囲で、勾配による方向差を説明できる。",
    prohibitedClaim: "筋・腱・関節の実測負荷や、全12部位の直接測定として扱わない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-YAMIN",
    sourceRole: "REGIONAL_A4_AND_APP_READING",
    title: "Effects of Surface Stiffness on Plantar Pressure and Lower-Limb Muscle Activity during Running",
    locator: "Table 3 / PDF p.12",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["RCM-SRC-003"],
    anchorIds: [],
    relatedInputs: ["路面の硬さ", "シューズ着用条件"],
    relatedRoutes: ["Regional A4 surface context"],
    relatedRegions: ["足底部", "下肢筋群"],
    allowedClaim: "研究条件の範囲で、路面の硬さにより足底圧と下肢筋活動が異なることを一般的に説明できる。",
    prohibitedClaim: "個人の障害原因、最適な路面、走行可否、全路面への一般化には用いない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-VOLOSHINA",
    sourceRole: "REGIONAL_A4_AND_APP_READING",
    title: "Biomechanics and energetics of running on uneven terrain",
    locator: "Results / PDF pp.3-6",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["BAT-SRC-027"],
    anchorIds: [],
    relatedInputs: ["路面の凹凸"],
    relatedRoutes: ["Regional A4 uneven-surface context"],
    relatedRegions: ["下肢全体"],
    allowedClaim: "研究条件の範囲で、凹凸のある路面では平らな路面と身体の安定化やエネルギー面の反応が異なることを一般的に説明できる。",
    prohibitedClaim: "個人の障害原因、転倒確率、走行可否、あらゆる自然路面への一般化には用いない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-HORIGUCHI",
    sourceRole: "REGIONAL_A4_AND_APP_READING",
    title: "Effects of uphill and downhill running on plantar pressure distribution in different foot strike patterns",
    locator: "Table 1 / PDF p.3; Methods / pp.2-3; limitations / pp.7-8",
    evidenceStatus: "FULL_TEXT_AND_A4_ANCHORS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["SRC-A4-001"],
    anchorIds: ["RCM-ANCH-A4-001..011"],
    relatedInputs: ["勾配", "足部接地"],
    relatedRoutes: ["Regional A4 grade and foot-strike context"],
    relatedRegions: ["後足部", "足底中部", "前足部"],
    allowedClaim: "研究条件の範囲で、上り・下りと足部接地の違いにより足底圧分布が異なることを一般的に説明できる。",
    prohibitedClaim: "個人の接地型を推定せず、障害原因、最適な接地、走行可否には用いない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-HADDAD",
    sourceRole: "V27_ACTIVE_MODEL_AND_APP_READING",
    title: "Session-RPE Method for Training Load Monitoring",
    locator: "Session-RPE method and influencing-factor review / PDF pp.2-9",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["SRC-CUR-017"],
    anchorIds: [],
    relatedInputs: ["実走時間", "RPE"],
    relatedRoutes: ["session-RPE separate subjective route"],
    relatedRegions: ["なし（走行全体の本人申告）"],
    allowedClaim: "実走時間と本人RPEを別指標として記録する方法と、影響要因があることを一般的に説明できる。",
    prohibitedClaim: "Regional A4係数、部位別実測値、健康状態、傷害予測へ使用しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-LINTON",
    sourceRole: "RESEARCH_PLAN_AND_APP_READING",
    title: "Running-Centred Injury Prevention Support: A Scoping Review on Current Injury Risk Reduction Practices for Runners",
    locator: "Review scope, support practices, and limitations / PDF pp.1, 25; Current finding CUR-FND-021",
    evidenceStatus: "FULL_TEXT_AND_CURRENT_FINDINGS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-015"],
    anchorIds: [],
    relatedInputs: ["本人申告", "相談用共有範囲", "記録文脈"],
    relatedRoutes: ["deterministic consultation information-organization route"],
    relatedRegions: ["本人が選択した部位のみ"],
    allowedClaim: "ランナー支援で記録・教育・専門家への共有が検討される背景を一般的に説明できる。",
    prohibitedClaim: "RunLoadの傷害予防効果、診断精度、相談結果の有効性を主張しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-BUIST",
    sourceRole: "RESEARCH_PLAN_AND_APP_READING",
    title: "No Effect of a Graded Training Program on the Number of Running-Related Injuries in Novice Runners: A Randomized Controlled Trial",
    locator: "Trial program, results, and limitations / PDF pp.3, 9; Current findings CUR-FND-006..007",
    evidenceStatus: "FULL_TEXT_AND_CURRENT_FINDINGS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-005"],
    anchorIds: [],
    relatedInputs: ["予定距離", "予定時間", "予定と実績"],
    relatedRoutes: ["general-knowledge column route", "plan non-prescription boundary"],
    relatedRegions: ["なし（走行全体の練習計画）"],
    allowedClaim: "初心者を対象に10％ルールを用いた13週間の段階的プログラムが、標準プログラムよりランニング関連傷害を減らさなかったことを研究条件付きで説明できる。",
    prohibitedClaim: "安全な増加率、急増の許容、個人の傷害予防、最適な練習計画を導かない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-KRUKOWSKI",
    sourceRole: "RESEARCH_PLAN_AND_APP_READING",
    title: "Impact of feedback generation and presentation on self-monitoring behaviors, dietary intake, physical activity, and weight: a systematic review and meta-analysis",
    locator: "Physical-activity findings and review limitations / PDF pp.1, 16; Current finding CUR-FND-013",
    evidenceStatus: "FULL_TEXT_AND_CURRENT_FINDINGS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-008"],
    anchorIds: [],
    relatedInputs: ["記録目的", "本人メモ", "フィードバック表示"],
    relatedRoutes: ["general-knowledge column route", "non-evaluative feedback boundary"],
    relatedRegions: ["なし（行動・記録文脈）"],
    allowedClaim: "身体活動介入ではフィードバックに小さな優位がみられた一方、最適な生成・提示方法の証拠は一定しなかったことを説明できる。",
    prohibitedClaim: "RunLoadの行動変容効果、継続効果、初心者ランナーへの個別効果を主張しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-KARAHANOGLU",
    sourceRole: "RESEARCH_PLAN_AND_APP_READING",
    title: "How Are Sports-Trackers Used by Runners? Running-Related Data, Personal Goals, and Self-Tracking in Running",
    locator: "Goals, tracker uses, and design implications / PDF pp.1, 12; Current findings CUR-FND-016..017",
    evidenceStatus: "FULL_TEXT_AND_CURRENT_FINDINGS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-011"],
    anchorIds: [],
    relatedInputs: ["記録目的", "履歴", "本人メモ"],
    relatedRoutes: ["general-knowledge column route", "running-goal reading route"],
    relatedRegions: ["なし（ランナーの記録利用）"],
    allowedClaim: "調査対象者が記録保存と振り返り・行動の両方にデータを使い、状況に応じて目標を変えていたことを説明できる。",
    prohibitedClaim: "経験豊富な機器利用者の結果を初心者全員へ一般化せず、特定の記録方法の優位性を主張しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-JANSSEN",
    sourceRole: "RESEARCH_PLAN_AND_APP_READING",
    title: "Understanding Different Types of Recreational Runners and How They Use Running-Related Technology",
    locator: "Runner profiles and technology-use differences / PDF pp.1, 14; Current finding CUR-FND-018",
    evidenceStatus: "FULL_TEXT_AND_CURRENT_FINDINGS_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-012"],
    anchorIds: [],
    relatedInputs: ["記録目的", "技術利用", "本人の関心"],
    relatedRoutes: ["general-knowledge column route", "running-goal reading route"],
    relatedRegions: ["なし（ランナーの多様性）"],
    allowedClaim: "レクリエーショナルランナーの態度・関心・技術利用が一様でなかったことを説明できる。",
    prohibitedClaim: "4類型をRunLoad利用者の分類や自動判定へ使わず、初心者固有の結果としない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-WINTER",
    sourceRole: "RESEARCH_PLAN_AND_APP_READING",
    title: "A Multifactorial Approach to Overuse Running Injuries: A 1-Year Prospective Study",
    locator: "Studied factors and predictor limitations / PDF pp.1, 7; Current finding CUR-FND-022",
    evidenceStatus: "FULL_TEXT_AND_CURRENT_FINDINGS_VERIFIED_WITH_METHOD_LIMITATION",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-016"],
    anchorIds: [],
    relatedInputs: ["生活背景メモ", "練習記録", "過去の経験"],
    relatedRoutes: ["general-knowledge column route", "context-only information route"],
    relatedRegions: ["なし（複数背景要因の説明）"],
    allowedClaim: "複数の練習・身体・既往・バイオメカニクス要因が検討され、研究自体も頑健な個人予測を支持しなかったことを説明できる。",
    prohibitedClaim: "観察された関連を個人の因果関係、傷害予測、RunLoad係数へ変換しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-BESOMI",
    sourceRole: "RESEARCH_PLAN_AND_APP_READING",
    title: "Exploring contextual factors for management and prevention of running-related injuries: runners and experts’ perspectives",
    locator: "Experience, context, and information-reliability findings / PDF pp.1, 3, 9; Current finding CUR-FND-027",
    evidenceStatus: "FULL_TEXT_AND_CURRENT_FINDINGS_VERIFIED_WITH_CONTEXT_LIMITATION",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-021"],
    anchorIds: [],
    relatedInputs: ["生活背景メモ", "本人の経験", "相談用メモ"],
    relatedRoutes: ["general-knowledge column route", "consultation information-organization route"],
    relatedRegions: ["なし（本人と専門家の見方）"],
    allowedClaim: "経験や文脈が認識・行動に関係し、経験の少ないランナーが情報の信頼性判断に迷う場合があったことを説明できる。",
    prohibitedClaim: "限定された傷害関連の質的研究から、全初心者の問題、因果関係、RunLoadの有効性を証明しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-COOLDOWN-VAN-HOOREN",
    sourceRole: "APP_READING_CONTENT",
    title: "Do We Need a Cool-Down After Exercise? A Narrative Review of the Psychophysiological Effects and the Effects on Performance, Injuries and the Long-Term Adaptive Response",
    locator: "Abstract, evidence summary, and conclusions / PDF pp.1, 16; Current source CUR-SRC-022",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED_CC_BY_4_0",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-022"],
    anchorIds: [],
    relatedInputs: ["運動後に行ったこと", "本人の感じ方", "本人メモ"],
    relatedRoutes: ["general-knowledge column route", "non-prescriptive after-run reading route"],
    relatedRegions: ["なし（運動後の一般的な振り返り）"],
    allowedClaim: "能動的クールダウンの回復指標に対する結果が限定的または一定せず、けが予防が確認された方法ではないことを研究範囲付きで説明できる。",
    prohibitedClaim: "個人向けの方法・強さ・時間、治療効果、けが予防、回復保証、走行可否を導かない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-AFONSO",
    sourceRole: "APP_READING_CONTENT",
    title: "The Effectiveness of Post-exercise Stretching in Short-Term and Delayed Recovery of Strength, Range of Motion and Delayed Onset Muscle Soreness: A Systematic Review and Meta-Analysis of Randomized Controlled Trials",
    locator: "Abstract, GRADE assessment, limitations, and conclusions / PDF pp.1, 22-23; Current source CUR-SRC-023",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED_CC_BY_4_0_WITH_VERY_LOW_CERTAINTY",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-023"],
    anchorIds: [],
    relatedInputs: ["運動後のストレッチ記録", "筋肉痛の本人メモ", "本人の感じ方"],
    relatedRoutes: ["general-knowledge column route", "evidence-certainty boundary"],
    relatedRegions: ["なし（運動後の一般的な回復指標）"],
    allowedClaim: "運動後ストレッチは受動的休養と比べ、筋肉痛や筋力回復の明確な改善が確認されず、証拠の確かさがとても低かったことを説明できる。",
    prohibitedClaim: "ストレッチを一律に勧めたり禁止したりせず、個人の治療、予防、回復、走行可否へ一般化しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-HEW-BUTLER",
    sourceRole: "APP_READING_CONTENT",
    title: "Exercise-Associated Hyponatremia: 2017 Update",
    locator: "Abstract, etiology, and prevention discussion / PDF pp.1, 3-4, 8; Current source CUR-SRC-024",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED_CC_BY_4_0",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-024"],
    anchorIds: [],
    relatedInputs: ["走行時間", "天候メモ", "食事・水分の自己記録"],
    relatedRoutes: ["general-knowledge column route", "non-diagnostic hydration reading route"],
    relatedRegions: ["なし（水分摂取の一般的な背景）"],
    allowedClaim: "主に持久性運動の文献で、のどの渇きを超える飲み過ぎが運動関連低ナトリウム血症の主要背景と整理されていることを説明できる。",
    prohibitedClaim: "個人の必要量、脱水・低ナトリウム血症、電解質、治療、走行可否を判定または処方しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-ARENT",
    sourceRole: "APP_READING_CONTENT",
    title: "Nutrient Timing: A Garage Door of Opportunity?",
    locator: "Abstract, post-exercise context, practical application, and conclusion / PDF pp.1, 8-10, 17; Current source CUR-SRC-025",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED_CC_BY_4_0",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-025"],
    anchorIds: [],
    relatedInputs: ["運動内容", "次の運動までの間隔", "食事・水分の自己記録"],
    relatedRoutes: ["general-knowledge column route", "non-prescriptive nutrition reading route"],
    relatedRegions: ["なし（運動後の食事文脈）"],
    allowedClaim: "栄養を取る時機の重要性が運動内容・頻度・次の運動までの間隔などに依存し、一日の摂取全体と切り離せないことを説明できる。",
    prohibitedClaim: "個人の摂取量・食品・補助食品・時刻、栄養状態、回復効果、走行可否を評価または処方しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-DOHERTY-SLEEP",
    sourceRole: "APP_READING_CONTENT",
    title: "The Sleep and Recovery Practices of Athletes",
    locator: "Abstract, sleep domains, self-report limits, and discussion / PDF pp.1, 16-19; Current source CUR-SRC-026",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED_CC_BY_4_0",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-026"],
    anchorIds: [],
    relatedInputs: ["睡眠の本人メモ", "睡眠時間", "本人の感じ方"],
    relatedRoutes: ["general-knowledge column route", "non-diagnostic sleep reading route"],
    relatedRegions: ["なし（睡眠と回復の一般的な背景）"],
    allowedClaim: "競技者の睡眠には個人差があり、時間だけでなく質・量・時機を分け、自己記録の限界も含めて考える必要があることを説明できる。",
    prohibitedClaim: "競技者338人の横断的な自己記録から、初心者個人の必要時間、睡眠障害、回復状態、原因、走行可否を判定または処方しない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-GRUNDSTEIN-HEAT",
    sourceRole: "APP_READING_CONTENT",
    title: "Influence of Race Performance and Environmental Conditions on Exertional Heat Stroke Prevalence Among Runners Participating in a Warm Weather Road Race",
    locator: "Abstract, methods, discussion, and limitations / PDF pp.1-5; Current source CUR-SRC-027",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED_CC_BY_4_0",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-027"],
    anchorIds: [],
    relatedInputs: ["気温", "天候メモ", "時間帯", "走行ペース"],
    relatedRoutes: ["general-knowledge column route", "non-diagnostic heat-context reading route"],
    relatedRegions: ["なし（暑熱環境と走行全体の背景）"],
    allowedClaim: "特定の温暖な11.26kmレースの後ろ向き研究で、WBGTと平均ペースを含む複数条件が検討され、関連のみが示されたことを範囲付きで説明できる。",
    prohibitedClaim: "一つの大会の関連から、個人の原因、熱中症、危険度、安全なペース、水分量、運動可否を推定または処方しない。",
  }),
  sourceRecord({
    sourceId: "APP-GUIDE-JSPO-HEAT",
    sourceRole: "PUBLIC_GUIDANCE_FOR_APP_READING",
    title: "スポーツ活動中の熱中症予防ガイドブック",
    locator: "日本スポーツ協会の現行公開ページとガイドブック案内（2026-08-06確認、2025年6月第6版改訂）",
    evidenceStatus: "OFFICIAL_CURRENT_PUBLIC_GUIDANCE_PAGE_VERIFIED",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: [],
    anchorIds: [],
    relatedInputs: ["気温", "天候メモ", "走る場所と時間"],
    relatedRoutes: ["public heat guidance link", "external current-information check boundary"],
    relatedRegions: ["なし（スポーツ活動時の暑熱環境）"],
    allowedClaim: "スポーツ活動時の暑さを考える公的指標としてWBGTを紹介し、場所と時間に合う最新の公式情報をアプリ外で確認する必要を説明できる。",
    prohibitedClaim: "公開資料をアプリ内の自動判定へ置き換えず、固定した閾値、個人の安全、診断、運動の中止・実施可否を決めない。",
  }),
  sourceRecord({
    sourceId: "APP-COL-KWON-TALK",
    sourceRole: "APP_READING_CONTENT",
    title: "The talk test as a useful tool to monitor aerobic exercise intensity in healthy population",
    locator: "Abstract, participants, protocol, discussion, and limitations / PDF pp.1-7; Current source CUR-SRC-028",
    evidenceStatus: "FULL_TEXT_IDENTITY_VERIFIED_CC_BY_NC_4_0",
    reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
    modelSourceIds: ["CUR-SRC-028"],
    anchorIds: [],
    relatedInputs: ["走行ペース", "RPE", "会話のしやすさの本人メモ"],
    relatedRoutes: ["general-knowledge column route", "subjective talk-ease reading route"],
    relatedRegions: ["なし（走行全体の主観的な強さ）"],
    allowedClaim: "健康成人17人のトレッドミル研究で、3段階の会話テストと複数の生理・心理指標に関連があったことを、標本と条件の限界付きで説明できる。",
    prohibitedClaim: "小規模な実験室研究から、初心者全員の正確なペース、心肺機能、病気、安全な強さ、走行可否を評価または処方しない。",
  }),
]);

const SOURCE_BY_ID = new Map(SOURCE_EVIDENCE_REGISTRY.map((source) => [source.sourceId, source]));

const ARTICLE_EVIDENCE_REGISTRY = Object.freeze([
  articleRecord({
    articleId: "model-total-v27", claimId: "COL-CLM-001", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-MINETTI"],
    relatedInputs: ["距離", "代表勾配", "上り・下り割合", "路面性質"], relatedRoutes: ["V2.7 total-load route", "coverage route"], relatedRegions: ["なし（総合推定負荷）"],
    allowedClaim: "距離を土台に、対応資料がある坂と路面だけを比較用推定へ反映する設計を説明する。",
    prohibitedClaim: "実測した身体負荷、消費エネルギー、疲労、傷害リスクとして説明しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "regional-three-views", claimId: "COL-CLM-002", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-VAN-HOOREN", "APP-COL-NUCKOLS"],
    relatedInputs: ["速度", "勾配", "cadence", "路面", "足部接地ほかA4 route入力"], relatedRoutes: ["Regional A4 endpoint-family routes", "coverage/status route"], relatedRegions: ["12部位"],
    allowedClaim: "各部位固有Reference 100、endpoint、算出状態、反映理由の読み方を説明する。",
    prohibitedClaim: "部位間順位、共通物理単位、傷害確率、危険度として読ませない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "regional-six-eight-28", claimId: "COL-CLM-003", sourceIds: ["RUNLOAD-SPEC-CURRENT"],
    relatedInputs: ["詳細身体記録", "左右", "程度", "気づいた時点"], relatedRoutes: ["self-report route", "Regional A4 separate display route"], relatedRegions: ["本人入力28領域", "Regional A4 12部位"],
    allowedClaim: "本人申告と走行条件モデルが異なる情報層であることを説明する。",
    prohibitedClaim: "一致・不一致から原因、診断、走行起因性を推定しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "rpe-separated", claimId: "COL-CLM-004", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-HADDAD"],
    relatedInputs: ["実走時間", "RPE"], relatedRoutes: ["session-RPE subjective route", "A4/V2.7 separation"], relatedRegions: ["なし（走行全体）"],
    allowedClaim: "RPEを本人の走行全体の感じ方として、走行事実モデルとは別に保存・表示する理由を説明する。",
    prohibitedClaim: "RPEを部位係数、健康判定、傷害予測へ変換しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "grade-and-coverage", claimId: "COL-CLM-005", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-MINETTI", "APP-COL-VAN-HOOREN", "APP-COL-NUCKOLS"],
    relatedInputs: ["上り割合", "下り割合", "代表勾配", "勾配把握状態"], relatedRoutes: ["V2.7 grade route", "Regional A4 grade routes", "supported-domain route"], relatedRegions: ["routeごとの対応部位"],
    allowedClaim: "区間割合、代表勾配、資料範囲、反映率を分けて扱う設計を説明する。",
    prohibitedClaim: "範囲外を端値へ丸めず、コース全変化や実測組織負荷として扱わない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "surface-missingness", claimId: "COL-CLM-006", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-YAMIN", "APP-COL-VOLOSHINA", "APP-COL-HORIGUCHI"],
    relatedInputs: ["路面性質", "路面の凹凸", "勾配", "足部接地"], relatedRoutes: ["surface and foot-strike explanatory route", "unknown route"], relatedRegions: ["足底部と下肢"],
    allowedClaim: "路面の硬さや凹凸、坂、足部接地により足底圧や身体の反応が異なるという研究知見を一般的に説明する。",
    prohibitedClaim: "路面名だけで個人の反応を決めず、障害原因や最適条件、走行可否を示さない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "personal-reference", claimId: "COL-CLM-007", sourceIds: ["RUNLOAD-SPEC-CURRENT"],
    relatedInputs: ["比較signature", "過去の同一部位結果", "coverage", "model version"], relatedRoutes: ["directly comparable history route"], relatedRegions: ["本人が選択した同一部位"],
    allowedClaim: "適格な過去記録だけを用いる本人内比較の表示条件を説明する。",
    prohibitedClaim: "正常値、適応、危険な変化、因果関係として扱わない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "history-compatible", claimId: "COL-CLM-008", sourceIds: ["RUNLOAD-SPEC-CURRENT"],
    relatedInputs: ["活動種別", "model version", "result state", "比較基準"], relatedRoutes: ["history compatibility route"], relatedRegions: ["選択した同一部位"],
    allowedClaim: "同一モデル版・同一比較条件だけを系列化し、空白や休養を0へ補完しないルールを説明する。",
    prohibitedClaim: "異なるモデル・部位・比較基準を同じ系列として比較しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "plan-facts-current", claimId: "COL-CLM-009", sourceIds: ["RUNLOAD-SPEC-CURRENT"],
    relatedInputs: ["予定距離", "予定コース条件"], relatedRoutes: ["plan preview route separated from completed records"], relatedRegions: ["予定表示で選択した部位"],
    allowedClaim: "予定の入力事実が完了記録とは別に保存され、後から条件差を見返せることを説明する。",
    prohibitedClaim: "結果予測、練習処方、実施の推奨、安全保証として扱わない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "consultation-prep-v27", claimId: "COL-CLM-010", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-LINTON"],
    relatedInputs: ["本人申告", "走行事実", "選択部位", "共有範囲"], relatedRoutes: ["deterministic consultation route"], relatedRegions: ["本人が明示選択した1部位"],
    allowedClaim: "本人入力、走行事実、モデル表示を分け、共有前に整理する方法を説明する。",
    prohibitedClaim: "診断、原因特定、走行可否、治療・練習処方を行わない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "slope-endpoints", claimId: "COL-CLM-011", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-VAN-HOOREN", "APP-COL-NUCKOLS"],
    relatedInputs: ["勾配", "速度", "cadence", "選択部位"], relatedRoutes: ["Regional A4 grade/speed/cadence endpoint routes"], relatedRegions: ["routeとendpointが対応する部位"],
    allowedClaim: "部位ごとに異なるendpointと資料条件を使うため、方向が一致しない場合があることを説明する。",
    prohibitedClaim: "endpoint間を共通単位で順位付けせず、直接測定された身体負荷と呼ばない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "model-limits-v27", claimId: "COL-CLM-012", sourceIds: ["RUNLOAD-SPEC-CURRENT", "APP-COL-LINTON", "APP-COL-VAN-HOOREN"],
    relatedInputs: ["全入力群", "欠測", "範囲外", "本人申告"], relatedRoutes: ["claim boundary", "unsupported-domain route", "information separation"], relatedRegions: ["12部位と別指標"],
    allowedClaim: "モデルの対応範囲、算出状態、非主張、本人入力との分離を説明する。",
    prohibitedClaim: "測定・診断・傷害確率・危険スコア・走行可否・因果推定を主張しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "training-progression-no-universal-rule", claimId: "COL-CLM-013", sourceIds: ["APP-COL-BUIST", "APP-COL-LINTON"],
    relatedInputs: ["予定距離", "予定時間", "予定と実績", "本人の振り返り"], relatedRoutes: ["general-knowledge column route", "plan non-prescription boundary"], relatedRegions: ["なし（走行全体の練習計画）"],
    allowedClaim: "一定割合の段階的プログラムを普遍的な傷害予防ルールとせず、予定と実績を分けて振り返る考え方を説明する。",
    prohibitedClaim: "安全な増加率、急増の許容、個人の傷害予防、最適な練習処方を提示しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "goals-and-recording-differ", claimId: "COL-CLM-014", sourceIds: ["APP-COL-KARAHANOGLU", "APP-COL-JANSSEN", "APP-COL-KRUKOWSKI"],
    relatedInputs: ["記録目的", "履歴", "本人メモ", "フィードバック表示"], relatedRoutes: ["general-knowledge column route", "running-goal reading route"], relatedRegions: ["なし（記録・目標の利用文脈）"],
    allowedClaim: "ランナーの目標・関心・技術利用が一様でなく、記録とフィードバックは本人の目的や時機に合わせて選べることを説明する。",
    prohibitedClaim: "記録継続、特定目標、利用者分類、RunLoadによる行動変容の効果を保証しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "context-not-single-cause", claimId: "COL-CLM-015", sourceIds: ["APP-COL-LINTON", "APP-COL-WINTER", "APP-COL-BESOMI"],
    relatedInputs: ["天候・環境メモ", "睡眠・生活背景メモ", "本人の感じ方", "相談用メモ"], relatedRoutes: ["general-knowledge column route", "context-only information route", "consultation information-organization route"], relatedRegions: ["なし（複数の背景情報）"],
    allowedClaim: "複数の背景要因、経験差、研究上の予測限界を示し、一つの記録から原因を決めず事実を分けて残す考え方を説明する。",
    prohibitedClaim: "本人メモや数値から原因、診断、傷害確率、走行可否、個人予測を導かない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "cooldown-stretching-limits", claimId: "COL-CLM-016", sourceIds: ["APP-COL-COOLDOWN-VAN-HOOREN", "APP-COL-AFONSO"],
    relatedInputs: ["運動後に行ったこと", "ストレッチ記録", "本人の感じ方"], relatedRoutes: ["general-knowledge column route", "non-prescriptive after-run reading route"], relatedRegions: ["なし（運動後の一般的な振り返り）"],
    allowedClaim: "クールダウンと運動後ストレッチについて、確認された回復効果が限定的または一定せず、証拠にも限界があることを説明する。",
    prohibitedClaim: "実施方法・時間、治療効果、けが予防、回復保証、次の走行可否を提示しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "hydration-not-more-is-better", claimId: "COL-CLM-017", sourceIds: ["APP-COL-HEW-BUTLER"],
    relatedInputs: ["走行時間", "天候メモ", "食事・水分の自己記録"], relatedRoutes: ["general-knowledge column route", "non-diagnostic hydration reading route"], relatedRegions: ["なし（水分摂取の一般的な背景）"],
    allowedClaim: "水分摂取を量の多さだけで評価せず、飲み過ぎにも注意が必要という持久性運動の一般知識を説明する。",
    prohibitedClaim: "個人の必要量、脱水・低ナトリウム血症、電解質、治療、走行可否を判定または処方しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "post-run-food-timing-context", claimId: "COL-CLM-018", sourceIds: ["APP-COL-ARENT"],
    relatedInputs: ["運動内容", "次の運動までの間隔", "食事・水分の自己記録"], relatedRoutes: ["general-knowledge column route", "non-prescriptive nutrition reading route"], relatedRegions: ["なし（運動後の食事文脈）"],
    allowedClaim: "運動後の食事を一つの短い時間帯だけでなく、運動内容、頻度、次の運動までの間隔、一日の食事全体から捉える考え方を説明する。",
    prohibitedClaim: "食事量、食品、補助食品、摂取時刻、栄養状態、回復効果、走行可否を個別に評価または処方しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "sleep-not-hours-only", claimId: "COL-CLM-019", sourceIds: ["APP-COL-DOHERTY-SLEEP"],
    relatedInputs: ["睡眠の本人メモ", "睡眠時間", "本人の感じ方"], relatedRoutes: ["general-knowledge column route", "non-diagnostic sleep reading route"], relatedRegions: ["なし（睡眠と回復の一般的な背景）"],
    allowedClaim: "睡眠を一つの時間だけで正解とせず、時間、質、時機、本人の感じ方を分けて自己記録する考え方を説明する。",
    prohibitedClaim: "必要な睡眠時間、睡眠障害、回復状態、原因、次の走行可否を個人について判定または処方しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "heat-not-temperature-only", claimId: "COL-CLM-020", sourceIds: ["APP-COL-GRUNDSTEIN-HEAT", "APP-GUIDE-JSPO-HEAT"],
    relatedInputs: ["気温", "天候メモ", "時間帯", "走行ペース"], relatedRoutes: ["general-knowledge column route", "external current-information check boundary"], relatedRegions: ["なし（暑熱環境と走行全体の背景）"],
    allowedClaim: "暑さを一つの気温だけで決めず、WBGT、走る場所と時間、走行内容を分けて確認・記録する考え方を説明する。",
    prohibitedClaim: "熱中症、危険度、安全なペース、水分量、運動の中止・実施可否を個人について判定または処方しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "talk-test-as-subjective-cue", claimId: "COL-CLM-021", sourceIds: ["APP-COL-KWON-TALK"],
    relatedInputs: ["走行ペース", "RPE", "会話のしやすさの本人メモ"], relatedRoutes: ["general-knowledge column route", "subjective talk-ease reading route"], relatedRegions: ["なし（走行全体の主観的な強さ）"],
    allowedClaim: "会話のしやすさを、速度やRPEとは別の主観的な手掛かりとして本人が記録・振り返る考え方を説明する。",
    prohibitedClaim: "会話のしやすさから、正確なペース、心肺機能、病気、安全な強さ、走行可否を評価または処方しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
]);

const ARTICLE_BY_ID = new Map(ARTICLE_EVIDENCE_REGISTRY.map((article) => [article.articleId, article]));

function getSourceEvidenceGovernance(sourceId) {
  return SOURCE_BY_ID.get(String(sourceId || "")) || null;
}

function getArticleEvidenceGovernance(articleId) {
  return ARTICLE_BY_ID.get(String(articleId || "")) || null;
}

function buildArticleEvidenceGovernance(articleId, sources = []) {
  const governance = getArticleEvidenceGovernance(articleId);
  if (!governance) return null;
  const declaredSourceIds = sources.map((source) => String(source?.sourceId || "")).filter(Boolean);
  const missingSourceIds = governance.sourceIds.filter((sourceId) => !declaredSourceIds.includes(sourceId));
  return Object.freeze({
    ...governance,
    version: EVIDENCE_GOVERNANCE_VERSION,
    sourceRecords: Object.freeze(governance.sourceIds.map(getSourceEvidenceGovernance).filter(Boolean)),
    sourceIntegrity: Object.freeze({
      declaredSourceIds: Object.freeze(declaredSourceIds),
      missingSourceIds: Object.freeze(missingSourceIds),
      status: missingSourceIds.length ? "MISMATCH" : "PASS",
    }),
  });
}
__exp["EVIDENCE_GOVERNANCE_VERSION"] = EVIDENCE_GOVERNANCE_VERSION;
__exp["EVIDENCE_GOVERNANCE_REVIEW_DATE"] = EVIDENCE_GOVERNANCE_REVIEW_DATE;
__exp["SOURCE_EVIDENCE_REGISTRY"] = SOURCE_EVIDENCE_REGISTRY;
__exp["ARTICLE_EVIDENCE_REGISTRY"] = ARTICLE_EVIDENCE_REGISTRY;
__exp["getSourceEvidenceGovernance"] = getSourceEvidenceGovernance;
__exp["getArticleEvidenceGovernance"] = getArticleEvidenceGovernance;
__exp["buildArticleEvidenceGovernance"] = buildArticleEvidenceGovernance;
__mods[51] = __exp;
}

// ===== data/columnData.js =====
{
const __exp = Object.create(null);
const { buildArticleEvidenceGovernance } = __mods[51];

// RunLoadの利用者向け読みもの。
// 計算の詳しい説明は保存資料側で管理し、ここでは初心者が表示を
// 誤解しないために必要な範囲だけを説明する。

const COLUMN_CATEGORIES = Object.freeze([
  "結果の読み方",
  "入力と振り返り",
  "走りとのつき合い方",
  "走る前・走っている間",
  "走った後の整え方",
  "部位・コース",
  "相談・共有",
]);

const PROJECT_V27 = Object.freeze({
  sourceId: "RUNLOAD-SPEC-CURRENT",
  title: "RunLoadの表示と比較の考え方",
  organization: "RunLoad",
  year: "2026",
  url: "",
  sourceType: "designSpecification",
  sourceTypeLabel: "アプリ内の説明",
  lastChecked: "2026-07-31",
});

const MINETTI_2002 = Object.freeze({
  sourceId: "APP-COL-MINETTI",
  title: "Energy cost of walking and running at extreme uphill and downhill slopes",
  organization: "Journal of Applied Physiology",
  year: "2002",
  url: "https://journals.physiology.org/doi/10.1152/japplphysiol.01177.2001",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-07-31",
});

const VAN_HOOREN_2024 = Object.freeze({
  sourceId: "APP-COL-VAN-HOOREN",
  title: "Per-step and cumulative load at three common running injury locations: The effect of speed, surface gradient, and cadence",
  organization: "Scandinavian Journal of Medicine & Science in Sports",
  year: "2024",
  url: "https://onlinelibrary.wiley.com/doi/full/10.1111/sms.14570",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-07-31",
});

const NUCKOLS_2020 = Object.freeze({
  sourceId: "APP-COL-NUCKOLS",
  title: "Mechanics of walking and running up and downhill: A joint-level perspective to guide design of lower-limb exoskeletons",
  organization: "PLOS ONE",
  year: "2020",
  url: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0231996",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-07-31",
});

const YAMIN_2021 = Object.freeze({
  sourceId: "APP-COL-YAMIN",
  title: "Effects of Surface Stiffness on Plantar Pressure and Lower-Limb Muscle Activity during Running",
  organization: "BioMed Research International",
  year: "2021",
  url: "https://doi.org/10.1155/2021/8842591",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-05",
});

const VOLOSHINA_2015 = Object.freeze({
  sourceId: "APP-COL-VOLOSHINA",
  title: "Biomechanics and energetics of running on uneven terrain",
  organization: "Journal of Experimental Biology",
  year: "2015",
  url: "https://doi.org/10.1242/jeb.106518",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-05",
});

const HORIGUCHI_2025 = Object.freeze({
  sourceId: "APP-COL-HORIGUCHI",
  title: "Effects of uphill and downhill running on plantar pressure distribution in different foot strike patterns",
  organization: "Frontiers in Sports and Active Living",
  year: "2025",
  url: "https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1654489/full",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-05",
});

const HADDAD_2017 = Object.freeze({
  sourceId: "APP-COL-HADDAD",
  title: "Session-RPE Method for Training Load Monitoring: Validity, Ecological Usefulness, and Influencing Factors",
  organization: "Frontiers in Neuroscience",
  year: "2017",
  url: "https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2017.00612/full",
  sourceType: "reviewPaper",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-07-31",
});

const LINTON_2025 = Object.freeze({
  sourceId: "APP-COL-LINTON",
  title: "Running-Centred Injury Prevention Support: A Scoping Review on Current Injury Risk Reduction Practices for Runners",
  organization: "Translational Sports Medicine",
  year: "2025",
  url: "https://doi.org/10.1155/tsm2/3007544",
  sourceType: "scopingReview",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-07-31",
});

const BUIST_2008 = Object.freeze({
  sourceId: "APP-COL-BUIST",
  title: "No Effect of a Graded Training Program on the Number of Running-Related Injuries in Novice Runners: A Randomized Controlled Trial",
  organization: "The American Journal of Sports Medicine",
  year: "2008",
  url: "https://doi.org/10.1177/0363546507307505",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const KRUKOWSKI_2024 = Object.freeze({
  sourceId: "APP-COL-KRUKOWSKI",
  title: "Impact of feedback generation and presentation on self-monitoring behaviors, dietary intake, physical activity, and weight: a systematic review and meta-analysis",
  organization: "International Journal of Behavioral Nutrition and Physical Activity",
  year: "2024",
  url: "https://doi.org/10.1186/s12966-023-01555-6",
  sourceType: "systematicReview",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const KARAHANOGLU_2021 = Object.freeze({
  sourceId: "APP-COL-KARAHANOGLU",
  title: "How Are Sports-Trackers Used by Runners? Running-Related Data, Personal Goals, and Self-Tracking in Running",
  organization: "Sensors",
  year: "2021",
  url: "https://doi.org/10.3390/s21113687",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const JANSSEN_2020 = Object.freeze({
  sourceId: "APP-COL-JANSSEN",
  title: "Understanding Different Types of Recreational Runners and How They Use Running-Related Technology",
  organization: "International Journal of Environmental Research and Public Health",
  year: "2020",
  url: "https://doi.org/10.3390/ijerph17072276",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const WINTER_2020 = Object.freeze({
  sourceId: "APP-COL-WINTER",
  title: "A Multifactorial Approach to Overuse Running Injuries: A 1-Year Prospective Study",
  organization: "Sports Health",
  year: "2020",
  url: "https://doi.org/10.1177/1941738119888504",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const BESOMI_2025 = Object.freeze({
  sourceId: "APP-COL-BESOMI",
  title: "Exploring contextual factors for management and prevention of running-related injuries: runners and experts’ perspectives",
  organization: "BMJ Open Sport & Exercise Medicine",
  year: "2025",
  url: "https://doi.org/10.1136/bmjsem-2024-002413",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const COOLDOWN_VAN_HOOREN_2018 = Object.freeze({
  sourceId: "APP-COL-COOLDOWN-VAN-HOOREN",
  title: "Do We Need a Cool-Down After Exercise? A Narrative Review of the Psychophysiological Effects and the Effects on Performance, Injuries and the Long-Term Adaptive Response",
  organization: "Sports Medicine",
  year: "2018",
  url: "https://link.springer.com/article/10.1007/s40279-018-0916-2",
  sourceType: "reviewPaper",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const AFONSO_2021 = Object.freeze({
  sourceId: "APP-COL-AFONSO",
  title: "The Effectiveness of Post-exercise Stretching in Short-Term and Delayed Recovery of Strength, Range of Motion and Delayed Onset Muscle Soreness: A Systematic Review and Meta-Analysis of Randomized Controlled Trials",
  organization: "Frontiers in Physiology",
  year: "2021",
  url: "https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2021.677581/full",
  sourceType: "systematicReview",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const HEW_BUTLER_2017 = Object.freeze({
  sourceId: "APP-COL-HEW-BUTLER",
  title: "Exercise-Associated Hyponatremia: 2017 Update",
  organization: "Frontiers in Medicine",
  year: "2017",
  url: "https://www.frontiersin.org/journals/medicine/articles/10.3389/fmed.2017.00021/full",
  sourceType: "reviewPaper",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const ARENT_2020 = Object.freeze({
  sourceId: "APP-COL-ARENT",
  title: "Nutrient Timing: A Garage Door of Opportunity?",
  organization: "Nutrients",
  year: "2020",
  url: "https://www.mdpi.com/2072-6643/12/7/1948",
  sourceType: "reviewPaper",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const DOHERTY_2021 = Object.freeze({
  sourceId: "APP-COL-DOHERTY-SLEEP",
  title: "The Sleep and Recovery Practices of Athletes",
  organization: "Nutrients",
  year: "2021",
  url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8072992/",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const GRUNDSTEIN_2019 = Object.freeze({
  sourceId: "APP-COL-GRUNDSTEIN-HEAT",
  title: "Influence of Race Performance and Environmental Conditions on Exertional Heat Stroke Prevalence Among Runners Participating in a Warm Weather Road Race",
  organization: "Frontiers in Sports and Active Living",
  year: "2019",
  url: "https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2019.00042/full",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

const JSPO_HEAT_GUIDANCE_2025 = Object.freeze({
  sourceId: "APP-GUIDE-JSPO-HEAT",
  title: "スポーツ活動中の熱中症予防ガイドブック",
  organization: "公益財団法人日本スポーツ協会",
  year: "2025",
  url: "https://www.japan-sports.or.jp/medicine/heatstroke/tabid523.html",
  sourceType: "publicGuidance",
  sourceTypeLabel: "公的資料",
  lastChecked: "2026-08-06",
});

const KWON_2023 = Object.freeze({
  sourceId: "APP-COL-KWON-TALK",
  title: "The talk test as a useful tool to monitor aerobic exercise intensity in healthy population",
  organization: "Journal of Exercise Rehabilitation",
  year: "2023",
  url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10331140/",
  sourceType: "primaryStudy",
  sourceTypeLabel: "参考資料",
  lastChecked: "2026-08-06",
});

function article(input) {
  return Object.freeze({
    ...input,
    tags: Object.freeze([...(input.tags || [])]),
    body: Object.freeze([...(input.body || [])]),
    practicePoints: Object.freeze([...(input.practicePoints || [])]),
    sources: Object.freeze([...(input.sources || [])]),
    evidenceGovernance: buildArticleEvidenceGovernance(input.id, input.sources || []),
    lastReviewed: "2026-08-06",
  });
}

const COLUMN_ARTICLES = Object.freeze([
  article({
    id: "model-total-v27",
    title: "走り全体の目安で、何を見返せるか",
    category: "結果の読み方",
    tags: ["走り全体の目安", "距離", "勾配", "路面"],
    lead: "走った量とコース条件をまとめて振り返り、自分の記録どうしを比べるための目安です。",
    summary: "長い距離を走った日と短い日、平坦な日と坂のある日では、走行の内容が違います。その違いを見返す手掛かりにします。",
    body: [
      "走行距離が増えると、走る動作を繰り返す回数や時間も増えます。上り・下りでは、平坦路と比べて身体の使い方も変わります。",
      "路面の硬さや凹凸も、足の接地や身体の動かし方に関係します。そのため、数値だけを見るのではなく、距離・坂・路面など、その日の記録を一緒に見ることが大切です。",
      "この値は自分の記録を同じ意味で比べるための目安です。身体に加わった力や消費エネルギーを直接測った値ではありません。",
    ],
    practicePoints: [
      "値と一緒に、距離、時間、坂、路面を確認する。",
      "距離が大きく違う日は、まず走った量の違いを考える。",
      "分からない条件がある日は、分かっている範囲の目安として読む。",
    ],
    caution: "この値は実測した力、疲労、障害の有無や確率、走行可否を表しません。",
    sources: [PROJECT_V27, MINETTI_2002],
  }),
  article({
    id: "regional-three-views",
    title: "12部位の目安をどう読むか",
    category: "結果の読み方",
    tags: ["部位の目安", "走行距離", "12部位", "基準100", "身体図"],
    lead: "走行距離と、確認できた走行条件を使って各部位の目安を出し、その部位自身の基準100と比べます。",
    summary: "12部位それぞれで100との差を見ます。別の部位どうしの数値を順位として比べません。",
    body: [
      "坂の向き、走る速さ、足の運び方が変わると、関節の動き、筋肉の働き、足裏の圧のかかり方も変わります。変わり方は部位ごとに同じではありません。",
      "この画面では、走行距離と確認できた走行条件から出した部位の目安を、その部位自身の基準100と比べます。たとえば128なら、その部位の基準より28ポイント上です。別の部位どうしの数値を比べて、どちらの負担が大きいとは判断できません。",
      "走行距離は部位の数値へ掛けず、別の走行事実として扱います。歩数は使える条件がそろった場合だけ一部の部位に反映し、条件が足りないときは無理に補正しません。",
    ],
    practicePoints: [
      "各部位について、その部位自身の基準100との差を確認する。",
      "次に、距離・ペース・坂・路面など、保存した走行条件を一緒に確認する。",
      "過去比較があるときは、同じ意味で比べられる記録かを確認する。",
    ],
    caution: "この部位の目安は、実測した力、けがの確率、危険度、走ってよいかどうか、部位どうしの順位を示すものではありません。基準100は安全値・正常値・初心者平均でもありません。",
    sources: [PROJECT_V27, VAN_HOOREN_2024, NUCKOLS_2020],
  }),
  article({
    id: "regional-six-eight-28",
    title: "12部位の身体図と、自分の身体記録の違い",
    category: "結果の読み方",
    tags: ["身体図", "12部位", "身体記録", "自分の感覚"],
    lead: "12部位の目安と、自分で残す身体記録は目的が異なります。",
    summary: "身体図は走行条件から出した12部位の目安、身体記録は自分が感じたことをそのまま残す記録です。",
    body: [
      "12部位の身体図は、坂・ペース・歩数・路面などの記録から出した目安です。自分が痛みや疲れを感じた場所を示すものではありません。",
      "身体記録では、感じた場所、左右、程度、気づいた時点を残せます。こちらは自分の感覚を記録するもので、12部位の目安とは分けて表示します。",
      "2つの表示が同じ方向でも違っていても、それだけで原因は分かりません。気になったことがあれば、走った条件と自分の感覚を分けて残すと、あとで振り返りやすくなります。",
    ],
    practicePoints: [
      "身体図では、各部位自身の基準100との差を見る。",
      "身体記録では、感じた場所・程度・時点を自分の言葉で残す。",
      "2つが一致したかどうかだけで原因を決めない。",
    ],
    caution: "部位分類はアプリの情報設計であり、診断分類や普遍的な人体区分ではありません。",
    sources: [PROJECT_V27],
  }),
  article({
    id: "rpe-separated",
    title: "走り全体のきつさ（RPE）を別に見る理由",
    category: "入力と振り返り",
    tags: ["RPE", "走り全体のきつさ", "振り返り"],
    lead: "同じ距離やコースでも、自分が感じるきつさは毎回同じとは限りません。",
    summary: "RPEは、走り終えた自分が1回の走行全体をどれくらいきつく感じたかを0〜10で残す方法です。",
    body: [
      "RPEは、走り終えた自分が、この1回をどれくらいきつく感じたかを0〜10で記録する方法です。トレーニングの振り返りに広く使われています。",
      "同じ距離やコースでも、暑さ、睡眠、体調、走る速さなどによって感じ方が違うことがあります。そのため、走行条件の数値だけでなく、自分の感じ方も別に残す意味があります。",
      "履歴では、走行全体の参考値、部位ごとの表示、RPE、自分の身体記録を分けて見ます。似た条件の日に感じ方がどう違ったかを振り返る材料にできます。",
    ],
    practicePoints: [
      "RPEは走行全体を振り返って入力する。",
      "数値とRPEが同じ方向でも違う方向でも、それだけで良し悪しを決めない。",
      "気になった背景は、睡眠や天候を断定せず自分のメモへ残す。",
    ],
    caution: "RPEは部位の実測値、健康状態の判定、障害予測ではありません。",
    sources: [PROJECT_V27, HADDAD_2017],
  }),
  article({
    id: "grade-and-coverage",
    title: "上り・下りで身体の使われ方が変わる理由",
    category: "部位・コース",
    tags: ["上り", "下り", "坂道", "身体の使い方"],
    lead: "上り・下りでは、平坦路と比べて関節の動きや筋肉の働きが変わります。",
    summary: "同じ坂道でも、上りと下り、部位、走る速さによって身体の反応は同じではありません。",
    body: [
      "上りでは身体を持ち上げる動きが増え、下りでは着地しながら速度を調整する動きが増えます。股関節・膝・足首の働き方は、上りと下りで異なります。",
      "膝蓋大腿関節部、下腿後面、足関節部などは、それぞれ違う役割を持ちます。そのため、上りだから全部位が上がる、下りだから全部位が下がる、という単純な関係ではありません。",
      "坂の傾きや区間の長さによっても走り方は変わります。記録するときは、コース全体のおおよその上り・下りと、分かる範囲の傾きを残すと振り返りやすくなります。",
    ],
    practicePoints: [
      "上りと下りを分けて記録する。",
      "坂の区間が短いか長いかも一緒に思い出す。",
      "部位の数値は、坂だけで決まるものとして読まない。",
    ],
    caution: "代表勾配はコースの全変化を再現するものではなく、部位表示は実際の筋・腱・関節力ではありません。",
    sources: [PROJECT_V27, MINETTI_2002, VAN_HOOREN_2024, NUCKOLS_2020],
  }),
  article({
    id: "surface-missingness",
    title: "路面や足のつき方で、足元の使われ方が変わる理由",
    category: "部位・コース",
    tags: ["路面", "足裏", "足のつき方", "凹凸"],
    lead: "路面の硬さや凹凸、足のつき方によって、足裏の圧や身体の動かし方が変わることがあります。",
    summary: "路面名だけで決めつけず、硬さ、安定性、凹凸、乾湿など、実際の状態を一緒に見ることが大切です。",
    body: [
      "路面の硬さが変わると、足裏の圧や脚の使い方も変わります。凹凸のある地面では、平らな地面より身体を安定させる動きが増えることがあります。",
      "上り・下りでは、かかと寄りか前足部寄りかといった足のつき方によっても、足裏の圧が分布する場所が変わることがあります。",
      "実際の路面は、同じ『舗装路』『天然芝』という名前でも状態が同じとは限りません。よく分からない場合は無理に決めず、分からないまま残すと、別の条件と取り違えずに振り返れます。",
    ],
    practicePoints: [
      "路面名だけでなく、硬さ・凹凸・乾湿を思い出す。",
      "自分の足のつき方が分からないときは、推測で選ばない。",
      "迷う条件は『不明』として残す。",
    ],
    caution: "路面による数値の違いは、個人の障害原因や、その路面を走ってよいかを示しません。",
    sources: [PROJECT_V27, YAMIN_2021, VOLOSHINA_2015, HORIGUCHI_2025],
  }),
  article({
    id: "personal-reference",
    title: "部位の前回比較は、いつ表示されるか",
    category: "入力と振り返り",
    tags: ["自分の過去記録", "前回比較", "比べられる記録"],
    lead: "同じ部位で、同じ計算方法で比べられる以前の記録がある場合だけ表示します。",
    summary: "今回の部位の目安を、同じ部位・同じ基準・同じ計算方法で比べられる直近の過去記録とだけ見比べます。",
    body: [
      "部位の目安は、同じ部位・同じ基準・同じ計算方法を使った記録だけを比較候補にします。条件が違う記録でも、同じ意味で比べられる場合だけ前回比較に使います。",
      "直接比べられる以前の記録があるときは、その中で直近の1件と今回の差を表示します。比べられる記録がなければ、無理に差を作らず理由を示します。",
      "この比較は正常値や理想値との比較ではありません。今回と以前の部位の目安を同じ意味の範囲で振り返るための参考です。",
    ],
    practicePoints: [
      "部位の目安を数値で出せる場合は、その部位自身の基準100との関係も確認する。",
      "前回比較が出ないときは、比較できない理由と走行条件を確認する。",
      "前回より上でも下でも、それだけで良し悪しを決めない。",
    ],
    caution: "部位の前回比較は、正常範囲、身体の適応、障害リスク、原因を示しません。異なる条件経路どうしの数値を直接つなぎません。",
    sources: [PROJECT_V27],
  }),
  article({
    id: "history-compatible",
    title: "履歴で比べてよい記録・比べない記録",
    category: "入力と振り返り",
    tags: ["履歴", "過去比較", "未入力", "比べられない記録"],
    lead: "同じ意味で比べられる記録だけを、同じグラフに並べます。",
    summary: "休養、未記録、比較できない記録、数値なしを0で埋めず、線に含めない理由を表示します。",
    body: [
      "走っていない日、記録していない日、同じ意味で比べられない記録は、数値の0ではありません。グラフでは0として線をつながず、含めなかった理由を表示します。",
      "部位別の履歴では、選んだ部位・基準・計算方法がそろった記録だけをつなぎます。意味が違う記録は同じ線にしません。",
      "RPEと自分の身体記録は、数値結果とは別の記録です。並びを見て自分の記録を振り返る材料にはできますが、一致や不一致から原因を自動判定しません。",
    ],
    practicePoints: [
      "グラフの部位名・基準・条件経路の意味を確認する。",
      "空白を0と読まず、線に含めなかった理由を確認する。",
      "書き出したデータでは、比べた記録の件数も一緒に確認する。",
    ],
    caution: "履歴の変化だけから身体状態、原因、障害の発生確率を推定しません。",
    sources: [PROJECT_V27],
  }),
  article({
    id: "plan-facts-current",
    title: "走る予定と、実際の記録を分ける",
    category: "入力と振り返り",
    tags: ["プラン", "予定入力", "実績", "比較"],
    lead: "予定画面は、これから走る距離・時間・コース条件を整理する場所です。",
    summary: "予定を数値スコアにせず、保存した入力条件と実績を後から比べる材料にします。",
    body: [
      "走る前に分かるのは予定です。実際の歩数、走り全体のきつさ（RPE）、走行時間、コースの状態は、走ったあとで予定と違うことがあります。",
      "予定画面では、距離・時間・走行形式・コース条件を予定事実として確認します。旧形式の走行全体スコアは新しい予定には作りません。12部位の結果は、実際に走って記録を保存したあとに確認します。",
      "保存した予定は、その時点で考えていた内容として残ります。実際の記録と並べると、距離、時間、コース条件がどのように違ったかを振り返れます。",
    ],
    practicePoints: [
      "予定画面では距離・時間・コース条件が事実として確認できるかを見る。",
      "予定はおすすめの練習メニューではなく、自分で考えた内容の記録として読む。",
      "走ったあとは、実際の歩数・RPE・走行時間を入力する。",
    ],
    caution: "予定の入力事実は最適な練習、達成可能性、身体状態、走行可否を示しません。",
    sources: [PROJECT_V27],
  }),
  article({
    id: "training-progression-no-universal-rule",
    title: "練習量に『毎週○％』という万能ルールはあるか",
    category: "走りとのつき合い方",
    tags: ["練習量", "10％ルール", "距離", "予定と実績"],
    lead: "毎週同じ割合で距離を増やせば、誰にでも安全になるという決まりは確認されていません。",
    summary: "一つの割合を正解にせず、予定と実績、その日の感じ方や背景を分けて見返すことが大切です。",
    body: [
      "初心者ランナーを対象に、練習量を毎週約10％ずつ増やす方法と別の方法を比べた調査では、10％ずつ増やした方でけがが少なくなるとは確認されませんでした。",
      "これは、練習量を急に増やしてよいという意味ではありません。また、10％という割合を全員に当てはまる安全な増やし方とは言えません。",
      "走り方や生活背景は人によって違うため、一つの増やし方を全員に当てはめないことが大切です。予定は守るべき正解ではなく、実際にどう走ったかを後で振り返るための記録として使えます。",
    ],
    practicePoints: [
      "予定どおり、変更、未実施のどれも事実として残す。",
      "割合だけでなく、距離、時間、回数、コースも分けて見る。",
      "次の予定は、直前の一回だけで決めず、自分の記録を見ながら考える。",
    ],
    caution: "この記事は、個人に合う増加率、けがを防ぐ方法、走ってよいかどうかを示しません。",
    sources: [BUIST_2008, LINTON_2025],
  }),
  article({
    id: "goals-and-recording-differ",
    title: "記録や目標の使い方は、人によって違う",
    category: "走りとのつき合い方",
    tags: ["記録", "目標", "振り返り", "ランニング用機器"],
    lead: "走る目的や、記録から知りたいことは、同じ人でも状況に応じて変わることがあります。",
    summary: "距離や連続日数だけを成功の基準にせず、自分が今知りたいことに合わせて記録を選びます。",
    body: [
      "ランニングの記録は、走った事実を残すためにも、次の行動を考えるためにも使えます。必要な情報や目標は、そのときの状況によって変わります。",
      "走る目的や、記録から知りたいことは人によって違います。他の人と同じ使い方に合わせる必要はありません。",
      "記録は多ければよいとは限りません。今の自分が振り返りたいことに必要な記録を選ぶと、見返しやすくなります。",
    ],
    practicePoints: [
      "今の自分が覚えておきたいことを一つ選ぶ。",
      "目標が変わったら、以前の目標に無理に合わせない。",
      "記録しない日や休む日を、失敗や0点として扱わない。",
    ],
    caution: "この記事は、記録を続けたときの効果や、特定の目標・機器・アプリが他よりよいことを保証しません。",
    sources: [KARAHANOGLU_2021, JANSSEN_2020, KRUKOWSKI_2024],
  }),
  article({
    id: "context-not-single-cause",
    title: "走った日の背景を、一つの原因に決めない",
    category: "走りとのつき合い方",
    tags: ["生活背景", "環境", "個人差", "相談準備"],
    lead: "走った日の感じ方には、練習、過去の経験、生活や環境など、複数の背景が重なることがあります。",
    summary: "一つの記録だけで原因を決めず、分かっている事実と自分の感じ方を分けて残します。",
    body: [
      "走った日の感じ方には、練習だけでなく、休養、生活、環境など複数のことが重なります。一つだけを原因と決めないことが大切です。",
      "練習、過去の経験、身体の特徴、走り方などは別々の情報です。一回の記録だけで、その後の状態を正確に予測することはできません。",
      "ランナーと専門家への聞き取りでは、経験や状況によって情報の受け取り方や行動が異なり、経験の少ない人が情報の確かさを判断しにくい場合も報告されています。これは、どれか一つを原因と決めるのではなく、分かる範囲の事実を整理する意味を示しています。",
      "天候、睡眠、生活背景、自分の感じ方は、それぞれ別の記録として残せます。何日かを見返すときも、同時に記録されていることだけで原因と結果を決めず、必要なら相談相手へ事実として共有します。",
    ],
    practicePoints: [
      "天候、睡眠、走った内容、自分の感じ方を別々に残す。",
      "一回だけの一致から、原因や良し悪しを決めない。",
      "相談するときは、推測より先に日付と記録した事実を伝える。",
    ],
    caution: "自分のメモや数値から、原因、診断、けがの確率、走ってよいかどうかを推定する記事ではありません。",
    sources: [LINTON_2025, WINTER_2020, BESOMI_2025],
  }),
  article({
    id: "cooldown-stretching-limits",
    title: "クールダウンやストレッチで、できること・できないこと",
    category: "走った後の整え方",
    tags: ["クールダウン", "ストレッチ", "筋肉痛", "回復"],
    lead: "クールダウンやストレッチは、行えば必ず筋肉痛やけがを防げる方法ではありません。",
    summary: "目的や感じ方には違いがあります。クールダウンやストレッチだけで回復やけが予防を決めつけないことが大切です。",
    body: [
      "運動後の軽い運動をまとめたレビューでは、翌日以降の運動成績や筋肉痛などへの効果は全体として小さいか、結果が一定していませんでした。また、クールダウンによってけがを防げることが確認されたわけではありません。",
      "運動後のストレッチについては、何もしないで休んだ場合より筋肉痛や筋力の戻り方が明らかに良くなるとは確認されていません。効果を一律に決めつけないようにします。",
      "これらは、クールダウンやストレッチをしてはいけない、または全く意味がないという結論ではありません。気持ちの切り替えや自分の好みなど、回復効果とは別の目的もあります。行った内容と、その後にどう感じたかを分けて残すと振り返りやすくなります。",
    ],
    practicePoints: [
      "行った内容と、その後の自分の感じ方を別々に記録する。",
      "行ったかどうかだけを、その日の成功・失敗にしない。",
      "筋肉痛の有無だけで、次に走ってよいかを決めない。",
    ],
    caution: "この記事は、方法や時間を指定せず、治療効果、けがの予防、回復の保証、走行可否を示しません。",
    sources: [COOLDOWN_VAN_HOOREN_2018, AFONSO_2021],
  }),
  article({
    id: "hydration-not-more-is-better",
    title: "水分補給は、多いほどよいわけではない",
    category: "走った後の整え方",
    tags: ["水分補給", "発汗", "暑さ", "個人差"],
    lead: "走る前後や途中の水分補給は、全員が同じ量を飲めばよいものではありません。",
    summary: "走った時間や環境、自分の記録を分けて振り返り、飲んだ量の多さだけを良し悪しにしません。",
    body: [
      "汗のかき方や走る時間、気温などは人や日によって違います。そのため、全員に共通する一つの量だけで、水分補給の良し悪しを決めることはできません。",
      "長時間の運動などを扱ったレビューでは、のどの渇きを超えて飲み続けることが、運動に伴う低ナトリウム血症（血液中のナトリウム濃度が低くなる状態）の主な背景として整理されています。また、飲み過ぎを避ける考え方として、のどの渇きに応じて飲む方法が示されています。これは、全員に同じ量を示すものではありません。",
      "RunLoadには天候や食事・水分の自己記録を残せますが、必要な水分量や身体の水分状態を計算していません。何をどのくらい飲んだかは事実として残し、量の多さだけを安心や不足の判定に変えないことが大切です。",
    ],
    practicePoints: [
      "走った時間、天候、飲んだものを分けて記録する。",
      "本数や量だけを、水分が足りたかどうかの判定にしない。",
      "体調について気になることがある場合は、アプリで判断せず適切な相談先へ伝える。",
    ],
    caution: "この記事は、個人の水分量、電解質の取り方、脱水や飲み過ぎの判定、治療、走行可否を示しません。",
    sources: [HEW_BUTLER_2017],
  }),
  article({
    id: "post-run-food-timing-context",
    title: "走った後の食事は、早さだけで決まらない",
    category: "走った後の整え方",
    tags: ["食事", "栄養", "走った後", "個人差"],
    lead: "走った後の食事は、何分以内かだけでなく、走った内容や普段の食事も含めて考えます。",
    summary: "一つの短い時間帯を全員共通の正解にせず、運動の内容と一日の食事を分けて見ます。",
    body: [
      "栄養を取る時機についてまとめたレビューでは、運動前・運動中・運動後の食事は互いにつながっており、運動後の一つの短い時間だけで考えるものではないと整理されています。",
      "食事の時機がどれほど重要かは、運動の種類、強さ、長さ、回数や、次の運動までの間隔などによって変わります。同じ日に複数回運動する場合のように、短い時間での回復が必要な場面と、そうでない場面を同じに扱うことはできません。",
      "このレビューでは、一日の食事全体や運動内容が土台にあり、その上で食事の時機を考えるという見方が示されています。RunLoadの食事・水分メモは自分の記録であり、栄養状態や回復を評価するものではありません。",
    ],
    practicePoints: [
      "食べた内容と時刻を、良し悪しを付けずに記録する。",
      "次の運動までの間隔など、その日の予定も別に残す。",
      "早く食べたことや補助食品を使ったことだけを、よりよい回復と決めない。",
    ],
    caution: "この記事は、食事量、食品や補助食品、摂取時刻を個別に勧めず、栄養不足、回復効果、走行可否を判定しません。",
    sources: [ARENT_2020],
  }),
  article({
    id: "sleep-not-hours-only",
    title: "睡眠は、『何時間なら正解』だけで決めない",
    category: "走る前・走っている間",
    tags: ["睡眠", "睡眠時間", "睡眠の質", "自分の感じ方"],
    lead: "睡眠は、長さだけでなく、眠れた感じや普段との違いも分けて振り返ります。",
    summary: "一つの睡眠時間を全員共通の正解にせず、睡眠時間、眠りの質、眠る時間帯、自分の感じ方を別々の情報として見ます。",
    body: [
      "必要な睡眠時間には個人差があります。睡眠時間だけでなく、眠れた感じや眠る時間帯も一緒に振り返ります。",
      "睡眠の記録は思い出し方によるずれもあります。一晩の記録だけで、身体の回復や次に走ってよいかを決めることはできません。",
      "RunLoadの睡眠メモは、自分が覚えている事実や感じ方を残す欄です。睡眠の質や回復を計算するものではありません。『短かった』『途中で目が覚めた』『いつもと違った』のように分けて残すと、後から普段との違いを見返しやすくなります。",
    ],
    practicePoints: [
      "眠った時間と、眠れた感じを別々に記録する。",
      "他の人の時間ではなく、自分の普段の記録と比べる。",
      "一晩の記録だけで、原因や次に走ってよいかを決めない。",
    ],
    caution: "この記事は、睡眠障害、回復状態、治療、必要な睡眠時間、走行可否を判定または処方しません。",
    sources: [DOHERTY_2021],
  }),
  article({
    id: "heat-not-temperature-only",
    title: "暑い日の走りは、気温だけで判断しない",
    category: "走る前・走っている間",
    tags: ["暑さ", "気温", "暑さ指数", "WBGT", "天候"],
    lead: "暑さを考えるときは、気温だけでなく、湿度や日差し、走る内容なども関係します。",
    summary: "一つの気温だけで安全・危険を決めず、走る場所と時間の最新情報を別に確認します。",
    body: [
      "暑さは気温だけでは決まりません。湿度や日差しなどを含む暑さ指数（WBGT）も確認し、一つの数値だけで安全・危険を決めないようにします。",
      "日本スポーツ協会の案内でも、スポーツ時の暑さを考える指標としてWBGTが使われています。公式情報は更新されるため、走る前には、アプリ内の過去記録だけでなく、走る場所と時間の最新のWBGTや公的な案内を確認します。",
      "RunLoadには気温や天候のメモを残せますが、WBGTや暑さによる体調不良の可能性を計算していません。気温、天候、時間帯、日差しなどを分けて残すと、その日の環境を後から思い出しやすくなります。",
    ],
    practicePoints: [
      "走る場所と時間の最新のWBGTや公的な案内を、アプリとは別に確認する。",
      "気温、天候、時間帯、日差しの有無を分けて記録する。",
      "一つの気温や過去記録だけを、安全・危険の判定にしない。",
    ],
    caution: "この記事は、熱中症などの診断、個人の安全、必要な水分量、運動の中止・実施可否を判定しません。",
    sources: [GRUNDSTEIN_2019, JSPO_HEAT_GUIDANCE_2025],
  }),
  article({
    id: "talk-test-as-subjective-cue",
    title: "ペースが分からないときは、会話のしやすさも手掛かりになる",
    category: "走る前・走っている間",
    tags: ["ペース", "会話", "走るときのきつさ", "RPE", "自分の感じ方"],
    lead: "速度だけでなく、話しやすかったかどうかも、走っているときのきつさを振り返る手掛かりになります。",
    summary: "会話できる・話しにくいという自分の感覚を、速度や走り全体のきつさ（RPE）とは別の情報として扱います。",
    body: [
      "会話のしやすさは、走っているときのきつさを振り返る手掛かりの一つです。",
      "ただし、会話のしやすさだけから、正確なペースや安全な強さを決めることはできません。",
      "会話のしやすさは自分の感覚であり、速度やRPEと同じ情報ではありません。『話しやすかった』『短い言葉なら話せた』『話しにくかった』などを自分のメモに残し、同じ人の記録を何回か見返す手掛かりにできます。",
    ],
    practicePoints: [
      "走っている間の話しやすさを、自分の言葉で短く残す。",
      "速度、RPE、会話のしやすさを、それぞれ別の記録として見る。",
      "話せたかどうかだけで、安全・危険や目標ペースを決めない。",
    ],
    caution: "この記事は、心肺機能、病気、個人の目標ペース、走る強さ、走行可否を評価または処方しません。",
    sources: [KWON_2023],
  }),
  article({
    id: "consultation-prep-v27",
    title: "相談資料に入れるもの・入れないもの",
    category: "相談・共有",
    tags: ["相談準備", "自分の記録", "基準100", "共有"],
    lead: "入力した事実と自分の言葉を先に置き、数値には基準100の意味と注意点を添えます。",
    summary: "相談相手が再確認できる情報をそろえ、順位・診断・原因推定は資料へ入れません。",
    body: [
      "相談資料には、日付、距離、実走時間、走り全体のきつさ（RPE）、把握した坂・路面、自分のメモ、自分が選んだ身体部位を入れます。自分が感じたことと数値表示は別の欄にします。",
      "数値結果を入れる場合は、確認できた条件、選択した部位、100の意味、値が表す内容を明記します。自分の過去記録と比べる場合は、参照した件数と期間も添えます。",
      "部位の順位、障害名、原因、発生確率、危険度、走行してよいかという結論は自動で作りません。短文は自分で編集し、アプリから自動送信せず、共有相手も自分で選びます。",
    ],
    practicePoints: [
      "相手に確認してほしいことを自分の言葉で1つ書く。",
      "まず今回の記録を確認し、必要なら同じ計算方法で比べられる最近の記録も添える。",
      "共有前に、見せたくないメモが含まれていないか確認する。",
    ],
    caution: "相談資料は記録整理であり、医学的評価や専門家の判断を代替しません。",
    sources: [PROJECT_V27, LINTON_2025],
  }),
  article({
    id: "slope-endpoints",
    title: "上りと下りで、部位表示の方向が違う理由",
    category: "部位・コース",
    tags: ["上り", "下り", "膝蓋大腿関節部", "脛骨部", "アキレス腱部"],
    lead: "上りと下りでは身体の役割が変わり、その変化も部位ごとに同じではありません。",
    summary: "股関節部、膝蓋大腿関節部、足関節部、アキレス腱部などは走るときの役割が違うため、同じ坂でも表示が別の方向へ動くことがあります。",
    body: [
      "上りでは身体を前上方へ運ぶため、股関節や足首の働き方が平坦路とは変わります。下りでは着地の衝撃を受け止めながら速度を調整する動きが増えます。",
      "速度、坂の傾き、歩数の違いによって、膝蓋大腿関節部、アキレス腱部、足底周辺の目安が違う方向へ動くことがあります。",
      "12部位は同じ単位で測った順位ではありません。部位の目安を数値で出せる場合は、その部位自身の基準100との差と、その日の走行条件を一緒に見ます。数値を出せない部位は「数値なし」のまま確認します。",
    ],
    practicePoints: [
      "部位詳細画面で、その部位が何を表すかを確認する。",
      "数値だけでなく、坂・ペース・歩数も一緒に見る。",
      "上り・下りの一つの結果を、障害名や原因へ結びつけない。",
    ],
    caution: "表示される値は、個人の筋・腱・関節に加わる力の実測値や、けがの予測ではありません。",
    sources: [PROJECT_V27, VAN_HOOREN_2024, NUCKOLS_2020],
  }),
  article({
    id: "model-limits-v27",
    title: "この表示が言えること・言えないこと",
    category: "相談・共有",
    tags: ["非主張", "限界", "多因子", "自己判断"],
    lead: "入力条件の違いを見返す道具であり、身体や障害を判定する道具ではありません。",
    summary: "数値を身体の測定値と思わず、走行記録を振り返るための目安として使うことが大切です。",
    body: [
      "RunLoadは、距離、時間、坂、路面、歩数など、自分が入力した走行記録を振り返るための表示です。似た意味の記録どうしを比べる手掛かりになります。",
      "実際に筋肉・腱・関節へ加わった力を測っているわけではありません。診断、障害の有無や確率、原因、走ってよいかどうかも示しません。",
      "ランニング中の身体の状態には、トレーニングだけでなく、休養、体調、環境など多くのことが関わります。数値と自分の感覚が並んでいても、一方がもう一方の原因だとは限りません。",
    ],
    practicePoints: [
      "値が表す内容、100の意味、その日の条件をセットで読む。",
      "自分の感覚とアプリの数値は別の情報として見る。",
      "分からない条件は、推測で埋めずにそのまま残す。",
    ],
    caution: "アプリの表示を医療判断、障害予防の保証、個別の練習処方へ使用しません。",
    sources: [PROJECT_V27, LINTON_2025, VAN_HOOREN_2024],
  }),
]);
__exp["COLUMN_CATEGORIES"] = COLUMN_CATEGORIES;
__exp["COLUMN_ARTICLES"] = COLUMN_ARTICLES;
__mods[52] = __exp;
}

// ===== core/column/columnService.js =====
{
const __exp = Object.create(null);
const { COLUMN_ARTICLES, COLUMN_CATEGORIES } = __mods[52];
const { EVIDENCE_GOVERNANCE_VERSION, getArticleEvidenceGovernance, getSourceEvidenceGovernance } = __mods[51];

function normalizeQuery(value) {
  return String(value || "").trim().toLocaleLowerCase("ja-JP");
}

function createColumnService() {
  function list({ query = "", category = "all" } = {}) {
    const normalizedQuery = normalizeQuery(query);
    return COLUMN_ARTICLES.filter((article) => category === "all" || article.category === category)
      .filter((article) => {
        if (!normalizedQuery) return true;
        const searchable = [
          article.title,
          article.lead,
          article.summary,
          article.category,
          ...(article.tags || []),
          ...(article.body || []),
          ...(article.practicePoints || []),
        ].join(" ").toLocaleLowerCase("ja-JP");
        return searchable.includes(normalizedQuery);
      });
  }

  function findById(articleId) {
    return COLUMN_ARTICLES.find((article) => article.id === articleId) || null;
  }

  function relatedArticle(article) {
    if (!article) return null;
    return COLUMN_ARTICLES.find((candidate) => (
      candidate.id !== article.id
      && (candidate.category === article.category || candidate.tags?.some((tag) => article.tags?.includes(tag)))
    )) || null;
  }

  function evidenceForArticle(articleId) {
    return getArticleEvidenceGovernance(articleId);
  }

  function evidenceForSource(sourceId) {
    return getSourceEvidenceGovernance(sourceId);
  }

  return Object.freeze({
    categories: COLUMN_CATEGORIES,
    evidenceGovernanceVersion: EVIDENCE_GOVERNANCE_VERSION,
    list,
    findById,
    relatedArticle,
    evidenceForArticle,
    evidenceForSource,
  });
}
__exp["createColumnService"] = createColumnService;
__mods[53] = __exp;
}


// ===== core/dataManagement/dataManagementService.js =====
{
const __exp = Object.create(null);
const { CURRENT_APP_REMOVABLE_STORAGE_KEYS } = __mods[1];

function createDataManagementService(gateway) {
  function clearAllUserData() {
    return gateway.transact(CURRENT_APP_REMOVABLE_STORAGE_KEYS.map((key) => ({ key, remove: true })));
  }
  return Object.freeze({ clearAllUserData });
}
__exp["createDataManagementService"] = createDataManagementService;
__mods[55] = __exp;
}

// ===== core/consultation/consultationReport.js =====
{
const __exp = Object.create(null);
const { PRIMARY_REGIONAL_V2_REGION_DEFS } = __mods[25];
const { PRIMARY_REGIONAL_V2_MODEL_VERSION, buildPrimaryRegionalV2ComparisonSignature, comparePrimaryRegionalV2Signatures } = __mods[26];
const { bodyAreaLateralityLabel } = __mods[28];
const { summarizePersonalContext } = __mods[7];
const { reportedRpeValue } = __mods[8];


const REGIONS = Object.freeze(PRIMARY_REGIONAL_V2_REGION_DEFS.map((region) => Object.freeze({ id: region.displayId, name: region.name })));
const REGION_BY_ID = new Map(REGIONS.map((region) => [region.id, region]));
const DEFAULT_REGION_ID = "BA-DISP-019";

function hasFiniteValue(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function finiteOrNull(value) {
  return hasFiniteValue(value) ? Number(value) : null;
}

function normalizeRegionId(value = "") {
  const requested = String(value || "");
  return REGION_BY_ID.has(requested) ? requested : DEFAULT_REGION_ID;
}

function activitySummary(record = {}) {
  if (record.activityType === "rest") return "休養";
  const parts = [];
  if (Number(record.distanceKm) > 0) parts.push(`${record.distanceKm}km`);
  if (Number(record.durationMinutes) > 0) parts.push(`${record.durationMinutes}分`);
  if (Number(record.steps) > 0) parts.push(`${record.steps}歩`);
  return parts.join("・") || "走行";
}


function normalizeExactObservations(feedback = {}) {
  const observations = Array.isArray(feedback.bodyAreaObservations) ? feedback.bodyAreaObservations : [];
  return observations
    .filter((item) => item && typeof item === "object")
    .map((item) => Object.freeze({
      areaId: String(item.areaId || ""),
      label: String(item.label || "詳細部位"),
      laterality: String(item.laterality || item.side || "UNKNOWN"),
      lateralityLabel: bodyAreaLateralityLabel(item.laterality || item.side),
      intensity: finiteOrNull(item.intensity),
      sensation: String(item.sensation || item.note || ""),
      modelRegionId: String(item.modelRegionId || ""),
    }));
}

function rawFacts(record = {}) {
  return Object.freeze({
    activityType: record.activityType === "rest" ? "rest" : "run",
    distanceKm: record.activityType === "rest" ? null : finiteOrNull(record.distanceKm),
    durationMinutes: record.activityType === "rest" ? null : finiteOrNull(record.durationMinutes),
    steps: record.activityType === "rest" ? null : finiteOrNull(record.steps),
    stepsProvenance: String(record.stepsProvenance || ""),
    rpe: record.activityType === "rest" ? null : reportedRpeValue(record),
    runningFormat: String(record.runningFormat || ""),
    course: record.course && typeof record.course === "object" ? JSON.parse(JSON.stringify(record.course)) : {},
  });
}

function resultRow(experience, regionId) {
  return experience?.regionalV2ResultRecord?.result?.regions?.find((row) => row.regionId === regionId)
    || experience?.regionalV2Result?.regions?.find((row) => row.regionId === regionId)
    || null;
}

function modelDistanceKm(resultRecord = {}, record = {}) {
  const input = resultRecord?.engine_input_snapshot || {};
  const runWalk = String(input.runningFormat || record.runningFormat || "").toUpperCase() === "RUN_WALK";
  const distance = Number(runWalk ? (input.runningDistanceKm ?? record.runWalkRunningDistanceKm) : (input.distanceKm ?? record.distanceKm));
  return Number.isFinite(distance) && distance > 0 ? distance : null;
}

function regionalReference(experience, regionId) {
  const region = REGION_BY_ID.get(regionId);
  const resultRecord = experience?.regionalV2ResultRecord || null;
  const distanceKm = modelDistanceKm(resultRecord || {}, experience?.record || {});
  const referenceValue = 100;
  const base = {
    regionId,
    regionLabel: region?.name || regionId,
    state: "UNAVAILABLE",
    value: null,
    delta: null,
    reference: "基準100",
    referenceDefinitionId: null,
    endpoint: Object.freeze({ label: "部位の目安" }),
    exposure: Object.freeze({
      status: distanceKm == null ? "UNAVAILABLE" : "RECORDED_SEPARATELY",
      basis: "distance_separate_fact",
      label: "走行距離は部位の数値へ掛けず、別の走行事実として扱います",
      shortLabel: "走行距離は別表示",
      unit: "km",
      qEquivalent: distanceKm,
      qReference: distanceKm,
      ratioExact: 1,
      fallbackStatus: "NONE",
    }),
    routeFamilySignature: null,
    primaryRegionalV2: true,
  };
  if (experience?.record?.activityType === "rest") return Object.freeze({ ...base, state: "REST" });
  if (!resultRecord || resultRecord.model_version !== PRIMARY_REGIONAL_V2_MODEL_VERSION) return Object.freeze(base);
  const row = resultRow(experience, regionId);
  if (!row || !hasFiniteValue(row.value)) {
    return Object.freeze({ ...base, state: resultRecord?.result?.state || "UNAVAILABLE" });
  }
  const signature = buildPrimaryRegionalV2ComparisonSignature(resultRecord, row);
  const value = Number(row.value);
  return Object.freeze({
    ...base,
    state: "SUPPORTED_NUMERIC",
    value,
    delta: value - 100,
    referenceDefinitionId: row.referenceId || null,
    routeFamilySignature: signature,
  });
}

function totalReference(experience) {
  const resultRecord = experience?.v27ResultRecord;
  if (!resultRecord || resultRecord.state !== "RUN") return null;
  const total = resultRecord.result?.total;
  return Object.freeze({
    central: finiteOrNull(total?.central_points),
    range: Array.isArray(total?.range_points) ? [...total.range_points] : null,
    showRange: total?.show_range_primary === true,
    gradeCoverage: finiteOrNull(total?.grade_coverage),
    surfaceCoverage: finiteOrNull(total?.surface_coverage),
    pairingState: String(total?.pairing_state || ""),
  });
}

function modelReference(experience, regionId) {
  const isRest = experience?.record?.activityType === "rest";
  const total = totalReference(experience);
  const regional = regionalReference(experience, regionId);
  const rpeWasReported = reportedRpeValue(experience?.record || {}) != null;
  const internal = experience?.v27ResultRecord?.result?.internal;
  return Object.freeze({
    modelVersion: String(experience?.regionalV2ResultRecord?.model_version || experience?.v27ResultRecord?.model_version || ""),
    primaryRegionalV2: experience?.regionalV2ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION,
    state: isRest ? "REST" : total || regional.state === "SUPPORTED_NUMERIC" ? "RUN" : "NO_NUMERIC_RESULT",
    total,
    regional,
    internalResponse: isRest ? null : Object.freeze({
      state: rpeWasReported ? String(internal?.state || "UNKNOWN") : "UNKNOWN",
      srpeAu: rpeWasReported ? finiteOrNull(internal?.srpe_au) : null,
      separateFromRunFactModel: internal?.separate_from_objective_model === true,
    }),
  });
}

function recordChronology(left, right) {
  return String(left?.record?.date || "").localeCompare(String(right?.record?.date || ""))
    || String(left?.record?.createdAt || "").localeCompare(String(right?.record?.createdAt || ""))
    || String(left?.record?.id || "").localeCompare(String(right?.record?.id || ""));
}

function recentFacts(allExperiences, target, regionId) {
  const currentRow = resultRow(target, regionId);
  const currentSignature = currentRow && target?.regionalV2ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION
    ? buildPrimaryRegionalV2ComparisonSignature(target.regionalV2ResultRecord, currentRow)
    : null;
  return [...allExperiences]
    .filter((item) => item?.record?.id && item.record.id !== target?.record?.id)
    .filter((item) => recordChronology(item, target) < 0)
    .sort((left, right) => recordChronology(right, left))
    .slice(0, 6)
    .map((item) => {
      const row = resultRow(item, regionId);
      const signature = row && item?.regionalV2ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION
        ? buildPrimaryRegionalV2ComparisonSignature(item.regionalV2ResultRecord, row)
        : null;
      const compared = currentSignature && signature
        ? comparePrimaryRegionalV2Signatures(currentSignature, signature)
        : { directDeltaAllowed: false, reason: "COMPARISON_SIGNATURE_MISSING" };
      const regional = regionalReference(item, regionId);
      return Object.freeze({
        recordId: item.record.id,
        date: item.record.date,
        activity: activitySummary(item.record),
        activityType: item.record.activityType === "rest" ? "rest" : "run",
        total: totalReference(item)?.central ?? null,
        regionalState: regional.state,
        regionalValue: compared.directDeltaAllowed ? regional.value : null,
        regionalDirectComparable: compared.directDeltaAllowed,
        regionalExclusionReasons: compared.directDeltaAllowed ? [] : [compared.reason || "SEMANTIC_OR_MODEL_MISMATCH"],
        rpe: reportedRpeValue(item.record),
        exactObservations: normalizeExactObservations(item.feedback || {}),
      });
    });
}

function buildConsultationReport(experience, allExperiences = [], options = {}) {
  if (!experience) return null;
  const regionId = normalizeRegionId(options.regionId);
  const feedback = experience.feedback || {};
  const personal = summarizePersonalContext(experience.record.personalContext || {});
  const exactObservations = normalizeExactObservations(feedback);
  const recent = recentFacts(allExperiences, experience, regionId);
  return Object.freeze({
    reportVersion: "runload-consultation-report-v1.0",
    date: experience.record.date,
    activity: activitySummary(experience.record),
    courseName: experience.record.course?.name || "",
    memo: experience.record.memo || "",
    rawFacts: rawFacts(experience.record),
    personalContextItems: personal.hasInput ? personal.items : [],
    subjectiveStatus: feedback.checkStatus || "not_asked",
    exactBodyObservations: Object.freeze(exactObservations),
    consultationNote: feedback.consultationNote || "",
    conditionFlags: Object.entries(feedback.safetyFlags || {}).filter(([, active]) => active).map(([flag]) => flag),
    supportRoute: experience.supportDecision?.route || "normal",
    modelReference: modelReference(experience, regionId),
    recent: Object.freeze(recent),
    comparisonCounts: Object.freeze({
      direct: recent.filter((item) => item.regionalDirectComparable && hasFiniteValue(item.regionalValue)).length,
      excluded: recent.filter((item) => !item.regionalDirectComparable).length,
      nonnumeric: recent.filter((item) => item.regionalDirectComparable && !hasFiniteValue(item.regionalValue)).length,
    }),
    claimBoundary: Object.freeze({
      subjectiveAndModelAreSeparate: true,
      conditionAndExposureAreSeparate: true,
      unsupportedIsNeverReferenceOne: true,
      isDiagnosis: false,
      predictsInjury: false,
      provesCause: false,
      guaranteesSafety: false,
      determinesRunOrNoRun: false,
      isMeasuredPhysicalRegionalLoad: false,
      isAnatomicalShare: false,
    }),
  });
}

function exposureText(exposure = {}) {
  if (!hasFiniteValue(exposure.qEquivalent)) return "走行距離：数値なし";
  return `走行距離：${Number(exposure.qEquivalent)} km（部位の数値とは別の走行事実）`;
}

function regionalText(regional) {
  if (!regional || !hasFiniteValue(regional.value)) {
    const label = regional?.regionLabel || "選択した部位";
    return `部位の目安：${label}／数値なし`;
  }
  const rounded = Math.round(Number(regional.value) * 10) / 10;
  return `部位の目安：${regional.regionLabel} ${rounded}／${regional.reference}`;
}

function bodyObservationLines(report) {
  const exact = report.exactBodyObservations.map((item) => {
    const details = [];
    if (item.lateralityLabel) details.push(item.lateralityLabel);
    if (item.intensity != null) details.push(`程度 ${item.intensity}/5`);
    if (item.sensation) details.push(item.sensation);
    return `- ${item.label}${details.length ? `：${details.join("・")}` : ""}`;
  });
  const saved = (report.subjectiveParts || []).map((item) => {
    const details = [];
    if (item.fatigue > 0) details.push(`疲れ・だるさ ${item.fatigue}/5`);
    if (item.discomfort > 0) details.push(`気になる感じ ${item.discomfort}/5`);
    return `- ${item.label}：${details.join("・") || "確認済み"}`;
  });
  return [...exact, ...saved];
}

function createShortConsultationMemo(report) {
  if (!report) return "";
  const lines = [`${report.date}の${report.activity}について相談したいです。`];
  if (report.personalContextItems.length) lines.push(`今日のシューズ・走り方：${report.personalContextItems.slice(0, 3).join("、")}。`);
  const observations = [...report.exactBodyObservations.map((item) => item.label), ...(report.subjectiveParts || []).map((item) => item.label)];
  if (observations.length) lines.push(`記録した部位：${[...new Set(observations)].join("、")}。`);
  if (report.consultationNote) lines.push(`聞きたいこと：${report.consultationNote}`);
  if (report.modelReference.state === "RUN") {
    const total = report.modelReference.total?.central;
    if (hasFiniteValue(total)) lines.push(`走り全体の目安：${Math.round(total * 10) / 10}ポイント`);
    lines.push(regionalText(report.modelReference.regional));
    lines.push(exposureText(report.modelReference.regional?.exposure));
  }
  lines.push("身体の記録とアプリの目安は別に扱います。走行距離は部位の数値へ掛けず、別の走行事実として扱います。");
  return lines.join("\n");
}

function createStandardConsultationText(report) {
  if (!report) return "";
  const lines = ["相談用レポート", `対象日：${report.date}`, `記録：${report.activity}`];
  if (report.courseName) lines.push(`コース：${report.courseName}`);
  if (report.personalContextItems.length) {
    lines.push("今日のシューズ・走り方：");
    report.personalContextItems.forEach((item) => lines.push(`- ${item}`));
  }
  const observationLines = bodyObservationLines(report);
  lines.push("身体の記録：");
  lines.push(...(observationLines.length ? observationLines : ["- 部位入力なし"]));
  if (report.consultationNote) lines.push(`相談したいこと：${report.consultationNote}`);
  if (report.modelReference.state === "RUN") {
    const total = report.modelReference.total?.central;
    lines.push(hasFiniteValue(total) ? `走り全体の目安：${Math.round(total * 10) / 10}ポイント` : "走り全体の目安：数値なし");
    lines.push(regionalText(report.modelReference.regional));
    lines.push(exposureText(report.modelReference.regional?.exposure));
    lines.push("部位の目安は、その部位自身の固定基準100と比較します。走行距離は数値へ掛けません。安全値・正常値・初心者平均ではなく、別の部位との大小比較にも使いません。");
    if (report.rawFacts.rpe != null) lines.push(`走り全体のきつさ（RPE）：${report.rawFacts.rpe}/10（数値表示とは分けて記載）`);
  } else if (report.modelReference.state === "REST") {
    lines.push("数値表示：休養記録のため走行の目安なし");
  } else {
    lines.push("数値表示：この保存記録では目安を表示できません");
  }
  lines.push("数値表示は走行記録を比べるための参考で、筋肉・腱・関節に加わった実際の力、診断、障害予測、原因、走行可否を示しません。");
  return lines.join("\n");
}

function createDetailedConsultationText(report) {
  const standard = createStandardConsultationText(report);
  if (!report || !report.recent.length) return standard;
  const regionLabel = report.modelReference.regional?.regionLabel || "選択した部位";
  const recent = report.recent.map((item) => {
    const total = item.total == null ? "走行全体 数値なし" : `走行全体 ${Math.round(item.total * 10) / 10}`;
    const regional = item.regionalDirectComparable && hasFiniteValue(item.regionalValue)
      ? `${regionLabel}の部位の目安 ${Math.round(item.regionalValue * 10) / 10}`
      : `${regionLabel}の部位の目安 比較なし`;
    const rpe = item.rpe == null ? "" : `／RPE ${item.rpe}`;
    return `- ${item.date}：${item.activity}／${total}／${regional}${rpe}`;
  });
  return `${standard}\n\n最近の保存記録：\n${recent.join("\n")}\n\n部位の目安の差は、同じ部位・同じ計算方法・同じ基準で比べられる記録だけで扱います。`;
}
__exp["buildConsultationReport"] = buildConsultationReport;
__exp["createShortConsultationMemo"] = createShortConsultationMemo;
__exp["createStandardConsultationText"] = createStandardConsultationText;
__exp["createDetailedConsultationText"] = createDetailedConsultationText;
__mods[56] = __exp;
}

// ===== ui/bodyRegionTerminology.js =====
{
const __exp = Object.create(null);
const BODY_REGION_TERMINOLOGY_VERSION = "runload-body-region-terminology-v1";

const ENTRIES = Object.freeze([
  Object.freeze({ id: "BA-DISP-014", formalJa: "股関節部", familiarJa: "股関節まわり", plainMeaningJa: "股関節部の動きに関する目安", english: "Hip joint region" }),
  Object.freeze({ id: "BA-DISP-015", formalJa: "殿部", familiarJa: "お尻", plainMeaningJa: "殿部の筋肉の使われ方に関する目安", english: "Gluteal region" }),
  Object.freeze({ id: "BA-DISP-016", formalJa: "大腿前面", familiarJa: "太ももの前", plainMeaningJa: "大腿前面の筋肉の使われ方に関する目安", english: "Anterior thigh region" }),
  Object.freeze({ id: "BA-DISP-018", formalJa: "大腿後面", familiarJa: "太ももの後ろ", plainMeaningJa: "大腿後面の筋肉の使われ方に関する目安", english: "Posterior thigh region" }),
  Object.freeze({ id: "BA-DISP-019", formalJa: "膝蓋大腿関節部", familiarJa: "膝の前", plainMeaningJa: "膝蓋大腿関節部の走行条件による変化の目安", english: "Patellofemoral region" }),
  Object.freeze({ id: "BA-DISP-021", formalJa: "脛骨部", familiarJa: "すね", plainMeaningJa: "脛骨部の走行条件による変化の目安", english: "Tibial region" }),
  Object.freeze({ id: "BA-DISP-023", formalJa: "下腿後面", familiarJa: "ふくらはぎ", plainMeaningJa: "下腿後面の筋肉の使われ方に関する目安", english: "Posterior lower-leg region" }),
  Object.freeze({ id: "BA-DISP-024", formalJa: "足関節部", familiarJa: "足首まわり", plainMeaningJa: "足関節部の動きに関する目安", english: "Ankle joint region" }),
  Object.freeze({ id: "BA-DISP-025", formalJa: "アキレス腱部", familiarJa: "足首の後ろ・アキレス腱周辺", plainMeaningJa: "アキレス腱部の走行条件による変化の目安", english: "Achilles tendon region" }),
  Object.freeze({ id: "BA-DISP-027", formalJa: "後足部", familiarJa: "かかと・足裏の後ろ", plainMeaningJa: "後足部の足底圧に関する目安", english: "Rearfoot region" }),
  Object.freeze({ id: "BA-DISP-028", formalJa: "足底中部・内側縦足弓", familiarJa: "土踏まず・足裏の中央", plainMeaningJa: "足底中部・内側縦足弓の足底圧に関する目安", english: "Mid-plantar and medial longitudinal arch region" }),
  Object.freeze({ id: "BA-DISP-029", formalJa: "前足部", familiarJa: "足裏の前・母趾球周辺", plainMeaningJa: "前足部の足底圧に関する目安", english: "Forefoot region" }),
]);

const BODY_REGION_TERMINOLOGY = ENTRIES;
const BY_ID = new Map(ENTRIES.map((item) => [item.id, item]));

function bodyRegionTerminology(regionId) {
  return BY_ID.get(String(regionId || "")) || null;
}

function bodyRegionFormalName(regionId, fallback = "") {
  return bodyRegionTerminology(regionId)?.formalJa || String(fallback || regionId || "");
}

function bodyRegionFamiliarName(regionId, fallback = "") {
  return bodyRegionTerminology(regionId)?.familiarJa || String(fallback || "");
}

function bodyRegionPlainMeaning(regionId, fallback = "") {
  return bodyRegionTerminology(regionId)?.plainMeaningJa || String(fallback || "この部位に関する目安");
}

function bodyRegionDisplayName(regionId, fallback = "", { includeFamiliar = false } = {}) {
  const item = bodyRegionTerminology(regionId);
  if (!item) return String(fallback || regionId || "");
  return includeFamiliar && item.familiarJa && item.familiarJa !== item.formalJa
    ? `${item.formalJa}（${item.familiarJa}）`
    : item.formalJa;
}
__exp["BODY_REGION_TERMINOLOGY_VERSION"] = BODY_REGION_TERMINOLOGY_VERSION;
__exp["BODY_REGION_TERMINOLOGY"] = BODY_REGION_TERMINOLOGY;
__exp["bodyRegionTerminology"] = bodyRegionTerminology;
__exp["bodyRegionFormalName"] = bodyRegionFormalName;
__exp["bodyRegionFamiliarName"] = bodyRegionFamiliarName;
__exp["bodyRegionPlainMeaning"] = bodyRegionPlainMeaning;
__exp["bodyRegionDisplayName"] = bodyRegionDisplayName;
__mods[57] = __exp;
}

// ===== core/consultation/deterministicConsultation.js =====
{
const __exp = Object.create(null);
const { PRIMARY_REGIONAL_V2_REGION_DEFS } = __mods[25];
const { bodyRegionFormalName } = __mods[57];
const { summarizePersonalContext } = __mods[7];
const { PRIMARY_REGIONAL_V2_MODEL_VERSION, buildPrimaryRegionalV2ComparisonSignature, comparePrimaryRegionalV2Signatures } = __mods[26];

const REGIONS = Object.freeze(PRIMARY_REGIONAL_V2_REGION_DEFS.map((region) => Object.freeze({ id: region.displayId, name: region.name })));

const DETERMINISTIC_CONSULTATION_VERSION = "runload-deterministic-consultation-v1";

const CONSULTATION_PURPOSES = Object.freeze([
  Object.freeze({
    id: "body_observation",
    label: "身体の記録を伝える",
    description: "身体の記録を整理します。",
  }),
  Object.freeze({
    id: "run_conditions",
    label: "今回の走りを振り返る",
    description: "走行事実と、身体の使われ方を考えるときに一緒に見たい条件を整理します。",
  }),
  Object.freeze({
    id: "previous_comparison",
    label: "前の記録と比べる",
    description: "同じ部位・同じ基準など、同じ意味で比べられる過去記録がある場合だけ差を表示します。",
  }),
  Object.freeze({
    id: "next_check",
    label: "次回に確認したいことを相談する",
    description: "運動可否や練習内容を決めず、次回に記録・比較したい条件を質問文へ整理します。",
  }),
]);

const PURPOSE_IDS = new Set(CONSULTATION_PURPOSES.map((item) => item.id));
const REGION_BY_ID = new Map(REGIONS.map((region) => [region.id, region]));
const ALLOWED_DATA_SELECTION = new Set(["current-result", "body-record", "course", "personal-note"]);

const DEFAULT_DATA_BY_PURPOSE = Object.freeze({
  body_observation: Object.freeze(["body-record", "course", "personal-note"]),
  run_conditions: Object.freeze(["current-result", "course", "personal-note"]),
  previous_comparison: Object.freeze(["current-result", "course", "personal-note"]),
  next_check: Object.freeze(["current-result", "body-record", "course", "personal-note"]),
});

const SAFETY_FLAG_LABELS = Object.freeze({
  severePain: "強い痛み",
  significantSwelling: "はっきりした腫れ",
  cannotBearWeight: "体重をかけにくい",
  movementDifficulty: "動かしにくい",
  numbnessOrWeakness: "しびれ・力の入りにくさ",
  coldPaleBlueLimb: "手足が冷たい・白い・青い",
  deformityOrMajorTrauma: "変形または大きな外傷",
  painAtRestOrNight: "安静時または夜間の痛み",
  chestPainOrPressure: "胸の痛み・圧迫感",
  breathingDifficulty: "呼吸のしにくさ",
  faintingOrConfusion: "失神・意識の混乱",
  heavyBleeding: "多量の出血",
});

const LATERALITY_LABELS = Object.freeze({
  LEFT: "左",
  RIGHT: "右",
  BILATERAL: "両側",
  MIDLINE: "中央",
  UNKNOWN: "左右不明",
});

const DEFAULT_QUESTION_BY_PURPOSE = Object.freeze({
  body_observation: "今回の身体の記録について、気をつけて見ておく点はありますか？",
  run_conditions: "今回の走りを振り返るとき、次の比較でも揃えて記録する条件を確認したいです。",
  previous_comparison: "前回との違いがあります。何を一緒に確認するとよいですか？",
  next_check: "次回までに記録しておくとよいことはありますか？",
});

function finite(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function normalizePurpose(value = "", supportRoute = "normal") {
  const requested = String(value || "");
  if (PURPOSE_IDS.has(requested)) return requested;
  return ["consult", "urgent"].includes(String(supportRoute || ""))
    ? "body_observation"
    : "run_conditions";
}

function firstObservedRegionId(feedback = {}) {
  const exact = Array.isArray(feedback.bodyAreaObservations) ? feedback.bodyAreaObservations : [];
  return exact.map((item) => String(item?.modelRegionId || "")).find((id) => REGION_BY_ID.has(id)) || "";
}

function normalizeRegionId(value = "", experience = {}) {
  const requested = String(value || "");
  if (REGION_BY_ID.has(requested)) return requested;
  const observed = firstObservedRegionId(experience.feedback || {});
  return observed || REGIONS[0]?.id || "BA-DISP-014";
}

function normalizeDataSelection(value, purpose) {
  const requested = Array.isArray(value)
    ? unique(value).filter((item) => ALLOWED_DATA_SELECTION.has(item))
    : [];
  return Object.freeze(requested.length ? requested : [...(DEFAULT_DATA_BY_PURPOSE[purpose] || [])]);
}

function runningFormatLabel(value = "") {
  return {
    CONTINUOUS_RUN: "途中で歩かず走った",
    RUN_WALK: "走りと歩きを混ぜた",
  }[String(value || "")] || "";
}

function resultStateLabel(value = "") {
  return {
    CALCULATED: "表示あり",
    PARTIAL: "一部の条件で表示",
    NOT_CALCULABLE: "表示なし",
    OUT_OF_SUPPORTED_RANGE: "確認できる範囲外",
    NOT_APPLICABLE: "対象外",
  }[String(value || "")] || "表示状態を確認できません";
}

function comparisonReason(value = "") {
  return {
    COMPARABLE: "前の記録があります",
    NO_COMPARABLE_CONDITION_RECORD: "同じ条件で比べられる過去記録はありません",
    NO_PREVIOUS_CONDITION_RECORD: "前の記録はありません",
    CURRENT_CONDITION_UNAVAILABLE: "今回の目安は表示できません",
  }[String(value || "")] || "比較できる記録を確認できません";
}

function displayNumber(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  const rounded = Number(number.toFixed(digits));
  return String(rounded);
}

function courseSummary(record = {}) {
  if (record.activityType === "rest") return "休養記録";
  const parts = [];
  if (finite(record.distanceKm)) parts.push(`${displayNumber(record.distanceKm, 2)}km`);
  if (finite(record.durationMinutes)) parts.push(`${displayNumber(record.durationMinutes, 1)}分`);
  if (finite(record.steps) && Number(record.steps) > 0) parts.push(`${Math.round(Number(record.steps))}歩`);
  const runningFormat = runningFormatLabel(record.runningFormat);
  if (runningFormat) parts.push(runningFormat);
  if (record.course?.name) parts.push(String(record.course.name));
  else if (record.course?.modelSurfaceClass) parts.push("路面条件の入力あり");
  if (record.course?.gradeKnowledge === "KNOWN_FLAT") parts.push("平坦と把握");
  if (record.course?.gradeKnowledge === "KNOWN_PROFILE") {
    if (Number(record.course.upPercent || 0) > 0) parts.push(`上り区間 ${displayNumber(record.course.upPercent, 1)}%`);
    if (Number(record.course.downPercent || 0) > 0) parts.push(`下り区間 ${displayNumber(record.course.downPercent, 1)}%`);
  }
  if (record.course?.gradeKnowledge === "UNKNOWN") parts.push("勾配不明");
  return parts.join("・") || "走行条件の入力あり";
}

function bodyObservationItems(feedback = {}) {
  const exact = (Array.isArray(feedback.bodyAreaObservations) ? feedback.bodyAreaObservations : [])
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const details = [];
      if (item.laterality) details.push(LATERALITY_LABELS[String(item.laterality)] || String(item.laterality));
      if (finite(item.intensity)) details.push(`程度 ${Number(item.intensity)}/5`);
      if (item.sensation) details.push(String(item.sensation));
      return `${item.label || "詳細部位"}${details.length ? `：${details.join("・")}` : ""}`;
    });
  const summaryNames = new Set([
    ...Object.keys(feedback.fatigueByBodyPart || {}),
    ...Object.keys(feedback.discomfortByBodyPart || {}),
    ...Object.keys(feedback.reviewedBodyParts || {}),
  ]);
  const summary = [...summaryNames].filter((name) => (
    Number(feedback.fatigueByBodyPart?.[name] || 0) > 0
    || Number(feedback.discomfortByBodyPart?.[name] || 0) > 0
    || feedback.reviewedBodyParts?.[name] === true
  )).map((name) => {
    const details = [];
    const fatigue = Number(feedback.fatigueByBodyPart?.[name] || 0);
    const discomfort = Number(feedback.discomfortByBodyPart?.[name] || 0);
    if (fatigue > 0) details.push(`疲れ・だるさ ${fatigue}/5`);
    if (discomfort > 0) details.push(`気になる感じ ${discomfort}/5`);
    return `${name}${details.length ? `：${details.join("・")}` : "：確認済み"}`;
  });
  return Object.freeze(unique([...exact, ...summary]));
}

function activeSafetyFlags(feedback = {}) {
  return Object.entries(feedback.safetyFlags || {})
    .filter(([, active]) => active === true)
    .map(([key]) => SAFETY_FLAG_LABELS[key] || key);
}

function primaryExposureDistanceKm(experience = {}) {
  const input = experience?.regionalV2ResultRecord?.engine_input_snapshot || {};
  const runWalk = String(input.runningFormat || experience?.record?.runningFormat || "").toUpperCase() === "RUN_WALK";
  const value = Number(runWalk ? input.runningDistanceKm : input.distanceKm);
  if (value > 0) return value;
  const record = experience?.record || {};
  const fallback = Number(runWalk ? record.runWalkRunningDistanceKm : record.distanceKm);
  return fallback > 0 ? fallback : null;
}

function primaryPreviousComparable(experience, allExperiences, regionId, currentRow) {
  if (!finite(currentRow?.value)) return Object.freeze({ status: "CURRENT_CONDITION_UNAVAILABLE" });
  const currentSignature = buildPrimaryRegionalV2ComparisonSignature(experience?.regionalV2ResultRecord, currentRow);
  if (!currentSignature) return Object.freeze({ status: "CURRENT_CONDITION_UNAVAILABLE" });
  const currentDate = String(experience?.record?.date || "");
  const currentCreatedAt = String(experience?.record?.createdAt || "");
  const earlier = (allExperiences || []).filter((item) => item?.record?.id && item.record.id !== experience?.record?.id).filter((item) => {
    const date = String(item.record.date || "");
    if (date < currentDate) return true;
    return date === currentDate && String(item.record.createdAt || "") < currentCreatedAt;
  }).sort((a,b)=>String(a.record.date||"").localeCompare(String(b.record.date||"")) || String(a.record.createdAt||"").localeCompare(String(b.record.createdAt||"")));
  let sawRegion = false;
  for (const prior of earlier.reverse()) {
    const priorRecord = prior?.regionalV2ResultRecord;
    const priorRow = prior?.regionalV2Result?.regions?.find((row) => row.regionId === regionId) || null;
    if (!priorRow || !finite(priorRow.value)) continue;
    sawRegion = true;
    if (priorRecord?.model_version !== PRIMARY_REGIONAL_V2_MODEL_VERSION) continue;
    const priorSignature = buildPrimaryRegionalV2ComparisonSignature(priorRecord, priorRow);
    const compatibility = comparePrimaryRegionalV2Signatures(currentSignature, priorSignature);
    if (!compatibility.directDeltaAllowed) continue;
    return Object.freeze({
      status: "COMPARABLE",
      previous: Object.freeze({
        recordId: prior.record.id,
        date: prior.record.date,
        displayConditionIndex: Number(priorRow.value),
        referenceValue: 100,
      }),
      pointDelta: Number(currentRow.value) - Number(priorRow.value),
      compatibility,
    });
  }
  return Object.freeze({ status: sawRegion ? "NO_COMPARABLE_CONDITION_RECORD" : "NO_PREVIOUS_CONDITION_RECORD" });
}

function regionalContext(experience, allExperiences, regionId) {
  const resultRecord = experience?.regionalV2ResultRecord || null;
  const row = resultRecord?.result?.regions?.find((item) => item.regionId === regionId) || null;
  const region = REGION_BY_ID.get(regionId);
  if (experience?.record?.activityType === "rest") {
    return Object.freeze({
      state: "REST", regionId, regionLabel: bodyRegionFormalName(regionId, region?.name || "選択した部位"),
      row: null, displayIndex: null, displayDeltaPoints: null, referenceValue: null, referenceDistanceKm: null,
      endpoint: null, exposure: null, contributors: Object.freeze([]), previousComparable: null, isPrimaryRegionalV2: true,
    });
  }
  if (resultRecord?.model_version !== PRIMARY_REGIONAL_V2_MODEL_VERSION || !row) {
    return Object.freeze({
      state: "UNAVAILABLE", regionId, regionLabel: bodyRegionFormalName(regionId, region?.name || "選択した部位"),
      row: null, displayIndex: null, displayDeltaPoints: null, referenceValue: null, referenceDistanceKm: null,
      endpoint: null, exposure: null, contributors: Object.freeze([]), previousComparable: null, isPrimaryRegionalV2: true,
    });
  }
  const distanceKm = primaryExposureDistanceKm(experience);
  const displayIndex = finite(row.value) ? Number(row.value) : null;
  const referenceValue = 100;
  const displayDeltaPoints = displayIndex !== null ? displayIndex - 100 : null;
  return Object.freeze({
    state: row.calculationState || (displayIndex === null ? "UNAVAILABLE" : "CALCULATED"),
    regionId,
    regionLabel: row.regionName || region?.name || "選択した部位",
    row, displayIndex, displayDeltaPoints, referenceValue, referenceDistanceKm: distanceKm,
    endpoint: Object.freeze({ label: "部位の目安" }),
    exposure: resultRecord?.result?.exposure || null,
    contributors: Object.freeze([]),
    axisEstimates: Object.freeze(Array.isArray(row.axisEstimates) ? row.axisEstimates : []),
    evidenceState: row.evidenceState || row.provenance || "EVIDENCE_INSUFFICIENT",
    combinedConditionState: resultRecord?.result?.combinedConditionState || null,
    previousComparable: primaryPreviousComparable(experience, allExperiences, regionId, row),
    isPrimaryRegionalV2: true,
  });
}

function sourceUseSummary({ purpose, dataSelection, bodyItems, regional, profileItems, question, audience }) {
  const selected = new Set(dataSelection);
  return Object.freeze([
    Object.freeze({ id: "question", label: "相談したい内容", used: Boolean(question), reason: question ? "入力した確認内容" : "確認内容は未入力" }),
    Object.freeze({ id: "audience", label: "相談相手", used: Boolean(audience), reason: audience ? "入力した相談相手" : "相談相手は未入力" }),
    Object.freeze({ id: "body", label: "身体の記録", used: selected.has("body-record") && bodyItems.length > 0, reason: selected.has("body-record") ? (bodyItems.length ? "自分で記録した内容" : "身体記録は未入力") : "共有対象から外しています" }),
    Object.freeze({ id: "course", label: "走行事実・コース", used: selected.has("course"), reason: selected.has("course") ? "今回の保存記録" : "共有対象から外しています" }),
    Object.freeze({ id: "a4", label: "選択した部位の目安", used: selected.has("current-result") && regional.displayIndex !== null, reason: selected.has("current-result") ? (regional.displayIndex !== null ? "今回の部位の目安" : "この記録では数値を表示できません") : "共有対象から外しています" }),
    Object.freeze({ id: "history", label: "前の記録", used: purpose === "previous_comparison" && selected.has("current-result") && regional.previousComparable?.status === "COMPARABLE", reason: purpose === "previous_comparison" ? (selected.has("current-result") ? comparisonReason(regional.previousComparable?.status) : "共有対象から外しています") : "今回の目的には含めません" }),
    Object.freeze({ id: "profile", label: "シューズ・走り方の記録", used: selected.has("personal-note") && profileItems.length > 0, reason: selected.has("personal-note") ? (profileItems.length ? "自分で記録した内容" : "入力はありません") : "共有対象から外しています" }),
  ]);
}

function appendSection(lines, heading, items) {
  const values = (items || []).filter(Boolean);
  if (!values.length) return;
  lines.push(heading);
  values.forEach((item) => lines.push(`- ${item}`));
}

function regionalCurrentLine(regional) {
  if (regional.displayIndex === null) return `${regional.regionLabel}：${regional.isPrimaryRegionalV2 ? "部位の目安" : "部位の目安"}の数値なし`;
  if (regional.isPrimaryRegionalV2) {
    const ref = finite(regional.referenceValue) ? Number(regional.referenceValue) : null;
    const delta = finite(regional.displayDeltaPoints) ? Number(regional.displayDeltaPoints) : null;
    return `${regional.regionLabel}：部位の目安 ${displayNumber(regional.displayIndex, 1)}（基準100${delta === null ? "" : `、差 ${delta >= 0 ? "+" : ""}${displayNumber(delta, 1)}`}）`;
  }
  const delta = regional.displayDeltaPoints == null
    ? ""
    : regional.displayDeltaPoints === 0
      ? "（基準100と同じ）"
      : `（基準100から${regional.displayDeltaPoints > 0 ? "+" : ""}${regional.displayDeltaPoints}ポイント）`;
  return `${regional.regionLabel}：${displayNumber(regional.displayIndex, 1)}${delta}`;
}

function comparisonLines(regional) {
  const comparison = regional.previousComparable;
  if (!comparison) return ["比較情報を作成できませんでした。"]; 
  if (comparison.status === "COMPARABLE") {
    if (regional.isPrimaryRegionalV2) {
      const delta = Number(comparison.pointDelta || 0);
      return [
        `今回：${regionalCurrentLine(regional)}`,
        `前の記録：${comparison.previous.date}／部位の目安 ${displayNumber(comparison.previous.displayConditionIndex, 1)}`,
        `同じ計算方法で比べた差：${delta >= 0 ? "+" : ""}${displayNumber(delta, 1)}ポイント（計算に使った距離は各記録の値に含まれます）`,
      ];
    }
    const sign = comparison.percentChangeRounded > 0 ? "+" : "";
    return [
      `今回：${regionalCurrentLine(regional)}`,
      `前の記録：${comparison.previous.date}／部位の目安 ${displayNumber(comparison.previous.displayConditionIndex, 1)}`,
      `同じ意味で比べた変化：${sign}${comparison.percentChangeRounded}%`,
    ];
  }
  if (comparison.status === "NO_COMPARABLE_CONDITION_RECORD") {
    return ["過去記録はありますが、同じ部位・同じ目安・同じ基準で比べられる記録がないため差を表示しません。"];
  }
  if (comparison.status === "NO_PREVIOUS_CONDITION_RECORD") return ["前の部位の目安記録がないため、自分の過去記録との比較はまだ表示しません。"];
  return ["今回の部位の目安を数値化できないため、自分の過去記録との比較は表示しません。"];
}

function buildMemo({ purpose, record, feedback, audience, question, dataSelection, bodyItems, profileItems, regional }) {
  const selected = new Set(dataSelection);
  const lines = ["相談したいこと：", question];
  if (audience) lines.push(`相談相手：${audience}`);
  lines.push(`記録日：${record.date || "日付未設定"}`);

  if (selected.has("course")) appendSection(lines, "今回の走り：", [courseSummary(record)]);
  if (selected.has("personal-note")) appendSection(lines, "シューズ・走り方のメモ：", profileItems);
  if (selected.has("body-record")) {
    appendSection(lines, "身体の記録：", bodyItems.length ? bodyItems : ["身体の記録なし"]);
    const flags = activeSafetyFlags(feedback);
    if (flags.length) appendSection(lines, "体調の記録：", flags);
  }

  if (selected.has("current-result") && regional.displayIndex !== null) {
    if (regional.isPrimaryRegionalV2) {
      const conditionBoundary = regional.combinedConditionState === "AXES_PRESERVED_NOT_COMBINED"
        ? "複数の条件を同時に計算できない場合は、別々に計算した値を無理に掛け合わせていません。"
        : "計算できる条件だけを使い、扱えない条件は0として加えません。";
      appendSection(lines, "アプリに表示された目安：", [
        regionalCurrentLine(regional),
        "この値の見方：100はこの部位自身のReference-100基準です。走行距離そのものは数値へ掛けず、別の走行事実として扱います。",
        conditionBoundary,
        "100は安全値・正常値・初心者平均ではなく、数値は身体を直接測った値でもありません。",
      ]);
    } else {
      appendSection(lines, "アプリに表示された目安：", [
        regionalCurrentLine(regional),
        "この値の見方：今回の条件から計算できる目安を、この部位自身の基準100と比べます。",
        "走行量はこの部位の目安へ足さず、別の情報として扱います。",
        "100は安全値・正常値・初心者平均ではなく、数値は身体を直接測った値でもありません。",
      ]);
    }
  }

  if (purpose === "run_conditions" && selected.has("current-result")) {
    appendSection(lines, "今回の記録と一緒に確認したい条件：", [
      "坂道、ペース、歩数、路面などを一緒に振り返れます。",
      "目安だけで原因は決めず、走った内容と自分の感じ方を分けて振り返ります。",
    ]);
  }
  if (purpose === "previous_comparison" && selected.has("current-result")) appendSection(lines, "前回との比較：", comparisonLines(regional));
  if (purpose === "previous_comparison" && !selected.has("current-result")) appendSection(lines, "前回との比較：", ["共有する内容に数値結果を含めていないため、目安を記載しません。"]);
  if (purpose === "next_check") {
    const reflection = record.reflectionContext || {};
    appendSection(lines, "次回に残しておきたいメモ：", [
      reflection.nextCheckPoint ? `次回確認したいこと：${reflection.nextCheckPoint}` : "次回確認したいことは未入力",
      reflection.reflectionKeyPoint ? `今回の主な気づき：${reflection.reflectionKeyPoint}` : "",
    ]);
  }

  const boundaryLines = [
    "身体の記録、走った内容、アプリの目安は別の情報です。",
    "このメモは診断や安全の判定をするものではありません。",
  ];
  const boundaryText = boundaryLines.join("\n");
  const bodyText = lines.join("\n");
  const separator = "\n";
  const bodyLimit = Math.max(0, 1200 - boundaryText.length - separator.length);
  const boundedBody = bodyText.length > bodyLimit
    ? `${bodyText.slice(0, Math.max(0, bodyLimit - 12)).trimEnd()}\n（本文を省略）`
    : bodyText;
  return `${boundedBody}${separator}${boundaryText}`.slice(0, 1200);
}

function buildDeterministicConsultation({
  experience,
  allExperiences = [],
  purpose = "",
  regionId = "",
} = {}) {
  if (!experience?.record) return null;
  const supportRoute = experience.supportDecision?.route || "normal";
  const normalizedPurpose = normalizePurpose(purpose, supportRoute);
  const normalizedRegionId = normalizeRegionId(regionId, experience);
  const consultationContext = experience.record.consultationContext || {};
  const dataSelection = normalizeDataSelection(consultationContext.consultationDataSelection, normalizedPurpose);
  const audience = String(consultationContext.consultationTarget || "").trim();
  const question = String(
    consultationContext.consultationQuestion
    || experience.feedback?.consultationNote
    || DEFAULT_QUESTION_BY_PURPOSE[normalizedPurpose]
    || "",
  ).trim();
  const profile = summarizePersonalContext(experience.record.personalContext || {});
  const profileItems = profile.hasInput ? profile.items : [];
  const bodyItems = bodyObservationItems(experience.feedback || {});
  const regional = regionalContext(experience, allExperiences, normalizedRegionId);
  const sources = sourceUseSummary({
    purpose: normalizedPurpose,
    dataSelection,
    bodyItems,
    regional,
    profileItems,
    question,
    audience,
  });
  const memo = buildMemo({
    purpose: normalizedPurpose,
    record: experience.record,
    feedback: experience.feedback || {},
    audience,
    question,
    dataSelection,
    bodyItems,
    profileItems,
    regional,
  });
  return Object.freeze({
    version: DETERMINISTIC_CONSULTATION_VERSION,
    purpose: normalizedPurpose,
    purposeDefinition: CONSULTATION_PURPOSES.find((item) => item.id === normalizedPurpose),
    regionId: normalizedRegionId,
    regionOptions: Object.freeze(REGIONS.map((region) => Object.freeze({ id: region.id, label: bodyRegionFormalName(region.id, region.name) }))),
    supportRoute,
    audience,
    question,
    dataSelection,
    bodyItems,
    profileItems: Object.freeze(profileItems),
    regional,
    sources,
    memo,
    boundaries: Object.freeze({
      deterministicRulesOnly: true,
      modelChangesA4: false,
      usesBodyPartRanking: false,
      diagnosis: false,
      injuryPrediction: false,
      causation: false,
      runPermission: false,
      trainingPrescription: false,
      safetyGuarantee: false,
    }),
  });
}
__exp["DETERMINISTIC_CONSULTATION_VERSION"] = DETERMINISTIC_CONSULTATION_VERSION;
__exp["CONSULTATION_PURPOSES"] = CONSULTATION_PURPOSES;
__exp["buildDeterministicConsultation"] = buildDeterministicConsultation;
__mods[58] = __exp;
}

// ===== core/applicationServices.js =====
{
const __exp = Object.create(null);
const { createStorageGateway } = __mods[2];
const { createRecordRepository } = __mods[11];
const { createModelResultV27Repository } = __mods[13];
const { createModelResultRegionalV2Repository } = __mods[27];
const { createSubjectiveFeedbackRepository } = __mods[31];
const { createPlanRepository } = __mods[32];
const { createProfileRepository, createSettingsRepository, createDraftRepository } = __mods[37];
const { createBackupService } = __mods[42];
const { createCourseRepository } = __mods[40];
const { evaluateSupportDecision, shouldBlockNormalPlanSuggestions, shouldPrioritizeOfficialHelp } = __mods[29];
const { buildPublicHelpGuidance } = __mods[43];
const { normalizeSubjectiveFeedback } = __mods[30];
const { normalizeRunningRecord, validateRunningRecord, validateRunningRecordInput } = __mods[9];
const { createRecordWorkflow } = __mods[47];
const { createHistoryWorkflow } = __mods[48];
const { createPlanWorkflow } = __mods[50];
const { createColumnService } = __mods[53];
const { createDataManagementService } = __mods[55];
const { buildConsultationReport, createShortConsultationMemo, createStandardConsultationText, createDetailedConsultationText } = __mods[56];
const { buildDeterministicConsultation, CONSULTATION_PURPOSES, DETERMINISTIC_CONSULTATION_VERSION } = __mods[58];
const { adaptRecordToV27Session } = __mods[45];
const { assertV27ResultSemantics, calculateV27Session } = __mods[39];
const { createV27ResultRecord } = __mods[46];
const { createPrimaryRegionalV2ResultRecord } = __mods[26];
const { calculateRun: calculatePrimaryRegionalV2 } = __mods[14];

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
__exp["createApplicationServices"] = createApplicationServices;
__mods[59] = __exp;
}


// ===== core/privacy/privacyInventory.js =====
{
const __exp = Object.create(null);
const { CURRENT_APP_REMOVABLE_STORAGE_KEYS, INTERNAL_RECOVERY_STORAGE_KEYS, STORAGE_KEYS, USER_DATA_STORAGE_KEYS } = __mods[1];

const PRIVACY_OVERVIEW_VERSION = "runload-privacy-overview-v2";

const STORAGE_GROUPS = Object.freeze([
  Object.freeze({
    id: "records-results",
    label: "走行・休養記録と保存済み結果",
    keys: Object.freeze([
      STORAGE_KEYS.records,
      STORAGE_KEYS.modelResultsV27,
      STORAGE_KEYS.modelResultsRegionalV2,
    ]),
    description: "入力した走行・休養の事実、保存時点のコースや任意プロフィールの内容、走行全体と12部位の保存済み結果を含みます。",
  }),
  Object.freeze({
    id: "person-input",
    label: "身体の記録と共有範囲",
    keys: Object.freeze([STORAGE_KEYS.subjectiveFeedback]),
    description: "自分で選んだ身体の記録、相談相手・相談内容、共有する範囲を記録ごとに保存します。作成した相談文は自動保存しません。",
  }),
  Object.freeze({
    id: "plans",
    label: "保存した予定",
    keys: Object.freeze([STORAGE_KEYS.plans]),
    description: "保存した予定を端末内に保存します。達成度や評価には変換しません。",
  }),
  Object.freeze({
    id: "reusable-settings",
    label: "再利用する設定",
    keys: Object.freeze([STORAGE_KEYS.profile, STORAGE_KEYS.settings, STORAGE_KEYS.courses]),
    description: "表示設定、任意プロフィール、保存シューズ、保存コースを次回の入力や表示に使うため保存します。変更しても過去記録に保存された内容は自動更新しません。",
  }),
  Object.freeze({
    id: "run-measurements",
    label: "GPS走行軌跡",
    keys: Object.freeze([STORAGE_KEYS.runMeasurements]),
    description: "GPS測定で保存を選んだ走行軌跡を、関連する記録IDとともに端末内へ保存します。",
  }),
  Object.freeze({
    id: "draft",
    label: "入力途中の下書き",
    keys: Object.freeze([STORAGE_KEYS.draft]),
    description: "保存前の入力途中を再開するため、端末内に下書きを保存する場合があります。",
  }),
]);

function countArray(value) {
  return Array.isArray(value) ? value.length : 0;
}

function countProfileFields(profile = {}) {
  return Object.entries(profile || {}).filter(([key, value]) => (
    key !== "updatedAt"
    && value !== ""
    && value !== null
    && value !== undefined
    && (!Array.isArray(value) || value.length > 0)
  )).length;
}

function groupStatus(services, group) {
  const gateway = services.storage.gateway;
  const values = Object.fromEntries(group.keys.map((key) => [key, gateway.readJson(key, null)]));
  if (group.id === "records-results") return `${countArray(values[STORAGE_KEYS.records])}件の記録`;
  if (group.id === "person-input") return `${countArray(values[STORAGE_KEYS.subjectiveFeedback])}件`;
  if (group.id === "plans") return `予定${countArray(values[STORAGE_KEYS.plans])}件`;
  if (group.id === "run-measurements") return `GPS軌跡${countArray(values[STORAGE_KEYS.runMeasurements])}件`;
  if (group.id === "reusable-settings") {
    const profileCount = countProfileFields(values[STORAGE_KEYS.profile]);
    const courses = countArray(values[STORAGE_KEYS.courses]);
    return `任意プロフィール${profileCount ? "あり" : "なし"}・コース${courses}件`;
  }
  return values[STORAGE_KEYS.draft] ? "下書きあり" : "下書きなし";
}

function buildPrivacyOverview(services) {
  const storageGroups = STORAGE_GROUPS.map((group) => Object.freeze({
    ...group,
    status: groupStatus(services, group),
  }));
  return Object.freeze({
    version: PRIVACY_OVERVIEW_VERSION,
    storageMode: "DEVICE_LOCAL_BROWSER_STORAGE",
    automaticExternalTransfer: false,
    automaticExternalTransferScope: "SAVED_RUNLOAD_DATA",
    externalNetworkUses: Object.freeze([
      Object.freeze({
        id: "openstreetmap-standard-tiles",
        trigger: "MAP_DISPLAYED",
        purpose: "MAP_TILE_DISPLAY",
        savedRunloadDataUploaded: false,
        displayedAreaMayBeDisclosedByTileRequests: true,
      }),
    ]),
    storageGroups: Object.freeze(storageGroups),
    backup: Object.freeze({
      format: "JSON_PLAIN_TEXT",
      encryptedByApp: false,
      includedKeys: USER_DATA_STORAGE_KEYS,
      internalRecoveryKeysIncluded: false,
    }),
    deletion: Object.freeze({
      currentAppKeys: CURRENT_APP_REMOVABLE_STORAGE_KEYS,
      internalRecoveryKeys: INTERNAL_RECOVERY_STORAGE_KEYS,
      exportedFilesDeletedByApp: false,
    }),
  });
}

function privacyStorageCoverage() {
  return Object.freeze({
    persistentUserKeys: USER_DATA_STORAGE_KEYS,
    groupedKeys: Object.freeze(STORAGE_GROUPS.flatMap((group) => group.keys)),
    removableKeys: CURRENT_APP_REMOVABLE_STORAGE_KEYS,
  });
}
__exp["PRIVACY_OVERVIEW_VERSION"] = PRIVACY_OVERVIEW_VERSION;
__exp["buildPrivacyOverview"] = buildPrivacyOverview;
__exp["privacyStorageCoverage"] = privacyStorageCoverage;
__mods[61] = __exp;
}