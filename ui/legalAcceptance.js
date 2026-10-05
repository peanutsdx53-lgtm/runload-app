export const TERMS_VERSION = "terms-20260930-v1";

export function hasAcceptedCurrentTerms(settings = {}) {
  return settings?.termsAcceptedVersion === TERMS_VERSION;
}

export function withCurrentTermsAccepted(settings = {}, { acceptedAt = new Date().toISOString() } = {}) {
  const source = settings && typeof settings === "object" ? settings : {};
  return Object.freeze({
    ...source,
    termsAcceptedVersion: TERMS_VERSION,
    termsAcceptedAt: source.termsAcceptedVersion === TERMS_VERSION && source.termsAcceptedAt
      ? source.termsAcceptedAt
      : acceptedAt,
  });
}
