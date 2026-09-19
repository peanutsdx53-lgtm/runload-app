import {
  renderEmptyState,
  renderPageHeading,
  renderStatusLabel,
} from "../ui/commonComponents.js";
import { formatLocalDate } from "../ui/recordPresentation.js";
import { renderResultWorkspaceNavigation } from "../ui/screenArchitecture.js";
import { renderBodyRegionResultDetail } from "../ui/bodyRegionResultPresentation.js";
import { PRIMARY_REGIONAL_V2_MODEL_VERSION } from "../core/runloadCore.js";

export function renderBodyPartDetailScreen({ services, context }) {
  const recordId = String(context.parameters.get("recordId") || "");
  const regionId = String(context.parameters.get("regionId") || "");
  const experience = services.workflows.records.loadExperience(recordId);
  if (!experience) {
    return `<section class="screen">${renderPageHeading({ eyebrow: "結果の詳細", title: "部位の結果を詳しく見る", description: "結果画面から確認する部位を選びます。" })}${renderEmptyState({ title: "記録を確認できません", description: "結果画面から部位を選び直してください。", actionLabel: "今回の結果へ戻る", actionScreen: recordId ? `result?recordId=${encodeURIComponent(recordId)}` : "result" })}</section>`;
  }

  if (experience?.regionalV2ResultRecord?.model_version === PRIMARY_REGIONAL_V2_MODEL_VERSION) {
    const experiences = services.workflows.records.loadAllExperiences();
    const rendered = renderBodyRegionResultDetail({ experience, regionId, experiences });
    if (rendered) return rendered;
  }

  return `<section class="screen screen--body-part-detail">
    ${renderPageHeading({ eyebrow: "結果の詳細", title: "部位の目安", description: `${formatLocalDate(experience.record.date)}の保存記録です。` })}
    ${renderResultWorkspaceNavigation({ recordId: experience.record.id, date: experience.record.date, regionId, active: "region" })}
    <section class="result-card"><div class="result-card__heading"><div><p>今回の記録</p><h2>この部位の目安は表示できません</h2></div>${renderStatusLabel("数値なし", "neutral")}</div><p>今回の条件では、この部位に数値を表示できません。不足する条件を0や100で補いません。</p><p class="source-boundary">身体の記録や走行距離を、この部位のReference-100へ読み替えません。</p></section>
    <div class="screen-actions"><a class="button button--primary" href="#/result?recordId=${encodeURIComponent(experience.record.id)}">今回の結果へ戻る</a></div>
  </section>`;
}
