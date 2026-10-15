# E-07 large GPX profile rendering — v2026.10.16.123

Baseline is the current product main commit `6780633eddf83609c1d55cb702b0c75ea8d83679` (v2026.10.15.122). No legacy application, G1/G2, or research Current code is incorporated.

## Failure and repair

`profileSvg()` previously called `Math.min(...heights)` and `Math.max(...heights)`. Native GPX limits permit up to 100,000 points while JavaScript engines have finite variadic argument limits. A large but valid elevation profile could be rejected even after parsing succeeded.

A bounded failure test with 20,000 valid points and a simulated 512-argument cap fails on v122, passes after replacing the variadic calls with iterative min/max scanning. Elevation validity conditions, rendering semantics, route segmentation, content validation, approved-candidate gate, and all scientific model calculations remain unchanged.

## Acceptance boundaries

This is a code-layer repair verified in Node and CI; it is not a physical iOS/Android acceptance test. Owner-verified iPhone VoiceOver, text-size persistence and color-independent region labels are retained as observations. Android TalkBack and Safari 200% remain owner-deferred; do not mark G-04 PASS. D-05 GPS and E-07 OS-specific file/storage conditions remain PARTIAL. App audit A-10 stays deferred. Formal research Current is independent and not modified.
