# Activation / Result Use Prototype V0.2

Date: 2026-09-18
Status: PROTOTYPE ONLY / FORMAL CURRENT UNCHANGED

Correction:
- Simulation is a major RunLoad function and must not be discoverable only inside Plan.
- Activation V0.2 restores a direct Result -> Result Use -> Simulation route.

Activation V0.2 order:
1. 条件を比べる -> Simulation V0.12
2. 相談用にまとめる -> Consultation placeholder
3. 次の予定を作る -> Plan V0.6
4. 読みものを確認する -> Reading placeholder

Simulation V0.12:
- Supports ?from=activation.
- Returns directly to Activation V0.2.
- Existing calculation engine and semantics are unchanged.

Result V0.16:
- Routes "この結果を次に使う" to Activation V0.2.

Home V0.8:
- Routes "結果の活用" to Activation V0.2.
- Candidate only; active root is not changed here.

Boundary:
- No recommendation/prescription.
- No safety/readiness/injury-risk judgment.
- No Notebook.
- No session-RPE.
- Formal Current V1.16 / App V1.5R2 unchanged.
