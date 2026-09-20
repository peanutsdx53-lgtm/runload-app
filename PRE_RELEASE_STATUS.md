# RunLoad Pre-release Status

Date: 2026-09-20
Status: PRE-RELEASE REGULAR APP / USER LANGUAGE V1.29

Verification:
- final syntax audit for all modified JavaScript: 27 / 27 PASS
- user-facing legacy-term residual audit: PASS
- balanced line-replacement diff audit: PASS
- protected Primary core unchanged
- protected ROF-J core unchanged
- storage implementation unchanged
- exact-branch retained 251-test regression was not rerun; prior release regression evidence is not claimed as V1.29 evidence

Audited wording refinements:
- Research/implementation terms are no longer primary user-facing labels.
- ROF-J is presented as 疲労感, with the formal scale name retained only in explanatory text.
- Reference-100 is presented as 部位ごとの目安, with its research name retained only in detailed explanation.
- RUN_WALK, simulation, slope, GPX, time, risk, and comparison terminology are rewritten in direct user-facing language.
- Help, tutorials, consultation/report output, validation messages, History, Result, Course, Privacy, and Condition Compare use the same terminology.
- No calculation, storage, model, source, routing, or interaction behavior is changed.
- PWA cache is bumped for deployment.

The app remains a development-stage research application. Scientific interpretation boundaries in the README and Current research package remain controlling.
