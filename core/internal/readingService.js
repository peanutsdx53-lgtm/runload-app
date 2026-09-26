import "./readingCatalog.js";
import { internalModules } from "./modules.js";

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
