import "./workflows.js";
import { internalModules } from "./modules.js";

// ===== data/evidenceGovernanceData.js =====
{
const moduleExports = Object.create(null);
const EVIDENCE_GOVERNANCE_VERSION = "evidence-governed-columns-v5";
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
    sourceId: "APP-SPEC-CURRENT",
    sourceRole: "CURRENT_INTERNAL_SPECIFICATION",
    title: "Application model, output, and claim-boundary specifications",
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
    prohibitedClaim: "このアプリの傷害予防効果、診断精度、相談結果の有効性を主張しない。",
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
    prohibitedClaim: "このアプリによる行動変容の効果、継続効果、初心者ランナーへの個別効果を主張しない。",
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
    prohibitedClaim: "4類型をアプリ利用者の分類や自動判定へ使わず、初心者固有の結果としない。",
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
    prohibitedClaim: "観察された関連を個人の因果関係、傷害予測、アプリ独自の係数へ変換しない。",
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
    prohibitedClaim: "限定された傷害関連の質的研究から、全初心者の問題、因果関係、このアプリの有効性を証明しない。",
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
    articleId: "model-total-v27", claimId: "COL-CLM-001", sourceIds: ["APP-SPEC-CURRENT", "APP-COL-MINETTI"],
    relatedInputs: ["距離", "代表勾配", "上り・下り割合", "路面性質"], relatedRoutes: ["V2.7 total-load route", "coverage route"], relatedRegions: ["なし（総合推定負荷）"],
    allowedClaim: "距離を土台に、対応資料がある坂と路面だけを比較用推定へ反映する設計を説明する。",
    prohibitedClaim: "実測した身体負荷、消費エネルギー、疲労、傷害リスクとして説明しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "regional-three-views", claimId: "COL-CLM-002", sourceIds: ["APP-SPEC-CURRENT", "APP-COL-VAN-HOOREN", "APP-COL-NUCKOLS"],
    relatedInputs: ["速度", "勾配", "cadence", "路面", "足部接地ほかA4 route入力"], relatedRoutes: ["Regional A4 endpoint-family routes", "coverage/status route"], relatedRegions: ["12部位"],
    allowedClaim: "各部位固有Reference 100、endpoint、算出状態、反映理由の読み方を説明する。",
    prohibitedClaim: "部位間順位、共通物理単位、傷害確率、危険度として読ませない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "regional-six-eight-28", claimId: "COL-CLM-003", sourceIds: ["APP-SPEC-CURRENT"],
    relatedInputs: ["詳細身体記録", "左右", "程度", "気づいた時点"], relatedRoutes: ["self-report route", "Regional A4 separate display route"], relatedRegions: ["本人入力28領域", "Regional A4 12部位"],
    allowedClaim: "本人申告と走行条件モデルが異なる情報層であることを説明する。",
    prohibitedClaim: "一致・不一致から原因、診断、走行起因性を推定しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "rpe-separated", claimId: "COL-CLM-004", sourceIds: ["APP-SPEC-CURRENT", "APP-COL-HADDAD"],
    relatedInputs: ["実走時間", "RPE"], relatedRoutes: ["session-RPE subjective route", "A4/V2.7 separation"], relatedRegions: ["なし（走行全体）"],
    allowedClaim: "RPEを本人の走行全体の感じ方として、走行事実モデルとは別に保存・表示する理由を説明する。",
    prohibitedClaim: "RPEを部位係数、健康判定、傷害予測へ変換しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "grade-and-coverage", claimId: "COL-CLM-005", sourceIds: ["APP-SPEC-CURRENT", "APP-COL-MINETTI", "APP-COL-VAN-HOOREN", "APP-COL-NUCKOLS"],
    relatedInputs: ["上り割合", "下り割合", "代表勾配", "勾配把握状態"], relatedRoutes: ["V2.7 grade route", "Regional A4 grade routes", "supported-domain route"], relatedRegions: ["routeごとの対応部位"],
    allowedClaim: "区間割合、代表勾配、資料範囲、反映率を分けて扱う設計を説明する。",
    prohibitedClaim: "範囲外を端値へ丸めず、コース全変化や実測組織負荷として扱わない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "surface-missingness", claimId: "COL-CLM-006", sourceIds: ["APP-SPEC-CURRENT", "APP-COL-YAMIN", "APP-COL-VOLOSHINA", "APP-COL-HORIGUCHI"],
    relatedInputs: ["路面性質", "路面の凹凸", "勾配", "足部接地"], relatedRoutes: ["surface and foot-strike explanatory route", "unknown route"], relatedRegions: ["足底部と下肢"],
    allowedClaim: "路面の硬さや凹凸、坂、足部接地により足底圧や身体の反応が異なるという研究知見を一般的に説明する。",
    prohibitedClaim: "路面名だけで個人の反応を決めず、障害原因や最適条件、走行可否を示さない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "personal-reference", claimId: "COL-CLM-007", sourceIds: ["APP-SPEC-CURRENT"],
    relatedInputs: ["比較signature", "過去の同一部位結果", "coverage", "model version"], relatedRoutes: ["directly comparable history route"], relatedRegions: ["本人が選択した同一部位"],
    allowedClaim: "適格な過去記録だけを用いる本人内比較の表示条件を説明する。",
    prohibitedClaim: "正常値、適応、危険な変化、因果関係として扱わない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "history-compatible", claimId: "COL-CLM-008", sourceIds: ["APP-SPEC-CURRENT"],
    relatedInputs: ["活動種別", "model version", "result state", "比較基準"], relatedRoutes: ["history compatibility route"], relatedRegions: ["選択した同一部位"],
    allowedClaim: "同一モデル版・同一比較条件だけを系列化し、空白や休養を0へ補完しないルールを説明する。",
    prohibitedClaim: "異なるモデル・部位・比較基準を同じ系列として比較しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "plan-facts-current", claimId: "COL-CLM-009", sourceIds: ["APP-SPEC-CURRENT"],
    relatedInputs: ["予定距離", "予定コース条件"], relatedRoutes: ["plan preview route separated from completed records"], relatedRegions: ["予定表示で選択した部位"],
    allowedClaim: "予定の入力事実が完了記録とは別に保存され、後から条件差を見返せることを説明する。",
    prohibitedClaim: "結果予測、練習処方、実施の推奨、安全保証として扱わない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "consultation-prep-v27", claimId: "COL-CLM-010", sourceIds: ["APP-SPEC-CURRENT", "APP-COL-LINTON"],
    relatedInputs: ["本人申告", "走行事実", "選択部位", "共有範囲"], relatedRoutes: ["deterministic consultation route"], relatedRegions: ["本人が明示選択した1部位"],
    allowedClaim: "本人入力、走行事実、モデル表示を分け、共有前に整理する方法を説明する。",
    prohibitedClaim: "診断、原因特定、走行可否、治療・練習処方を行わない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "slope-endpoints", claimId: "COL-CLM-011", sourceIds: ["APP-SPEC-CURRENT", "APP-COL-VAN-HOOREN", "APP-COL-NUCKOLS"],
    relatedInputs: ["勾配", "速度", "cadence", "選択部位"], relatedRoutes: ["Regional A4 grade/speed/cadence endpoint routes"], relatedRegions: ["routeとendpointが対応する部位"],
    allowedClaim: "部位ごとに異なるendpointと資料条件を使うため、方向が一致しない場合があることを説明する。",
    prohibitedClaim: "endpoint間を共通単位で順位付けせず、直接測定された身体負荷と呼ばない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
  }),
  articleRecord({
    articleId: "model-limits-v27", claimId: "COL-CLM-012", sourceIds: ["APP-SPEC-CURRENT", "APP-COL-LINTON", "APP-COL-VAN-HOOREN"],
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
    prohibitedClaim: "記録継続、特定目標、利用者分類、このアプリによる行動変容の効果を保証しない。", reviewDate: EVIDENCE_GOVERNANCE_REVIEW_DATE,
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
moduleExports["EVIDENCE_GOVERNANCE_VERSION"] = EVIDENCE_GOVERNANCE_VERSION;
moduleExports["EVIDENCE_GOVERNANCE_REVIEW_DATE"] = EVIDENCE_GOVERNANCE_REVIEW_DATE;
moduleExports["SOURCE_EVIDENCE_REGISTRY"] = SOURCE_EVIDENCE_REGISTRY;
moduleExports["ARTICLE_EVIDENCE_REGISTRY"] = ARTICLE_EVIDENCE_REGISTRY;
moduleExports["getSourceEvidenceGovernance"] = getSourceEvidenceGovernance;
moduleExports["getArticleEvidenceGovernance"] = getArticleEvidenceGovernance;
moduleExports["buildArticleEvidenceGovernance"] = buildArticleEvidenceGovernance;
internalModules.evidenceGovernanceData = moduleExports;
}

// ===== data/columnData.js =====
{
const moduleExports = Object.create(null);
const { buildArticleEvidenceGovernance } = internalModules.evidenceGovernanceData;

// 利用者向け読みもの。
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
  sourceId: "APP-SPEC-CURRENT",
  title: "表示と比較の考え方",
  organization: "アプリ内資料",
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
      "このアプリには天候や食事・水分の自己記録を残せますが、必要な水分量や身体の水分状態を計算していません。何をどのくらい飲んだかは事実として残し、量の多さだけを安心や不足の判定に変えないことが大切です。",
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
      "このレビューでは、一日の食事全体や運動内容が土台にあり、その上で食事の時機を考えるという見方が示されています。このアプリの食事・水分メモは自分の記録であり、栄養状態や回復を評価するものではありません。",
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
      "このアプリの睡眠メモは、自分が覚えている事実や感じ方を残す欄です。睡眠の質や回復を計算するものではありません。『短かった』『途中で目が覚めた』『いつもと違った』のように分けて残すと、後から普段との違いを見返しやすくなります。",
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
      "このアプリには気温や天候のメモを残せますが、WBGTや暑さによる体調不良の可能性を計算していません。気温、天候、時間帯、日差しなどを分けて残すと、その日の環境を後から思い出しやすくなります。",
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
      "このアプリは、距離、時間、坂、路面、歩数など、自分が入力した走行記録を振り返るための表示です。似た意味の記録どうしを比べる手掛かりになります。",
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
moduleExports["COLUMN_CATEGORIES"] = COLUMN_CATEGORIES;
moduleExports["COLUMN_ARTICLES"] = COLUMN_ARTICLES;
internalModules.columnData = moduleExports;
}

// ===== core/column/columnService.js =====
{
const moduleExports = Object.create(null);
const { COLUMN_ARTICLES, COLUMN_CATEGORIES } = internalModules.columnData;
const { EVIDENCE_GOVERNANCE_VERSION, getArticleEvidenceGovernance, getSourceEvidenceGovernance } = internalModules.evidenceGovernanceData;

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
moduleExports["createColumnService"] = createColumnService;
internalModules.columnService = moduleExports;
}
