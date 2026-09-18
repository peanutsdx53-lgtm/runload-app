# Plan Simulation UI V0.3

Date: 2026-09-18
Status: PROTOTYPE ONLY / FORMAL CURRENT UNCHANGED

User feedback addressed:
- fixed mobile number clipping by removing the custom minute/second pace editor
- aligned primary inputs with Record V0.9: distance + actual moving time
- moved comparison to the main visual role
- default body map mode is now same-region difference vs the previous saved run
- Reference-100 remains available as a mode switch
- course is represented using the same selected-course pattern as Record; full course redesign is deferred to the next course-screen workstream

Semantic boundary:
- "前回より上 / 下" means numeric same-region difference only, not good/bad, safety, injury risk, or recommendation
- current Primary Regional Reference-100 engine remains unchanged
- ROF-J remains outside simulation
- distance is not multiplied into Reference-100

Next intended iteration:
- redesign Course Library / Course Editor together with the simulation course selector
- then return to simulation for another polish pass if needed
