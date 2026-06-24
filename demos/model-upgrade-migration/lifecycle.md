# model-upgrade-migration — lifecycle transcript

Spec: `z-ai/glm-5.2` → `z-ai/glm-6`, config `loopy.model.json`.

1. advance → **blocked** at gate `glm6:approve` (Δscore +20 pts, 0 regressions)
2. human **approves** the gate
3. advance → **completed**, decision `approved` — model bump emitted to `loopy.model.json`
