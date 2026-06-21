# OpenSpec Tutorial

OpenSpec is a Spec-Driven Development (SDD) framework that makes AI-assisted development more reliable and traceable.

## Quick Start

### 1. Create a New Feature Proposal

```
/openspec-proposal add user search feature
```

This generates:
```
openspec/changes/add-user-search/
├── proposal.md    ← Problem, solution, scope
├── tasks.md       ← Implementation checklist
└── specs/
    └── user-search_delta.md  ← Specification changes
```

### 2. Implement the Change

```
/openspec-apply add-user-search
```

AI will:
- Read proposal.md to understand the goal
- Follow tasks.md step by step
- Mark completed tasks with `[x]`

### 3. Archive the Change

```
/openspec-archive add-user-search
```

Result:
- Delta specs merged into `openspec/specs/`
- Change moved to `openspec/archive/`
- Complete history preserved

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenSpec Workflow                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   /openspec-proposal "feature description"                   │
│              │                                               │
│              ▼                                               │
│   ┌──────────────────────┐                                  │
│   │ changes/{id}/        │                                  │
│   │ ├── proposal.md      │  ← Review this proposal          │
│   │ ├── tasks.md         │                                  │
│   │ └── specs/delta.md   │                                  │
│   └──────────────────────┘                                  │
│              │                                               │
│              ▼  (Proposal approved)                          │
│                                                              │
│   /openspec-apply {id}                                       │
│              │                                               │
│              ▼                                               │
│   ┌──────────────────────┐                                  │
│   │ Implement code       │  ← AI follows tasks.md           │
│   │ Mark [x] completed   │                                  │
│   │ Run quality checks   │                                  │
│   └──────────────────────┘                                  │
│              │                                               │
│              ▼  (All tasks complete)                         │
│                                                              │
│   /openspec-archive {id}                                     │
│              │                                               │
│              ▼                                               │
│   ┌──────────────────────┐   ┌──────────────────────┐       │
│   │ specs/               │   │ archive/{id}/        │       │
│   │ └── merged specs     │   │ └── history          │       │
│   └──────────────────────┘   └──────────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## When to Use OpenSpec

| Scenario | Use OpenSpec | Use Regular Dev |
|----------|--------------|-----------------|
| New major feature | ✓ | |
| Cross-team collaboration | ✓ | |
| Complex multi-phase changes | ✓ | |
| Spec history tracking | ✓ | |
| Bug fixes | | ✓ |
| Small enhancements | | ✓ |
| Rapid prototyping | | ✓ |

**Recommendation:** Use OpenSpec for significant features, skip for small changes.

---

## FAQ

### Q: What's in the specs/ directory?

**A:** The `openspec/specs/` directory contains your "source of truth" specifications. They're updated through the archive process when delta specs are merged in.

### Q: Can I modify tasks.md during implementation?

**A:** Yes! If you discover new tasks or need to adjust the plan, update tasks.md. The key is keeping it as an accurate record of what needs to be done.

### Q: What if I need to abandon a proposal?

**A:** You can either:
1. Delete the change directory if it was never started
2. Archive it with a "Cancelled" status if you want to preserve the history

### Q: How do delta specs work?

**A:** Delta specs describe changes (ADDED/MODIFIED/REMOVED) relative to existing specifications. When archived, these changes are merged into the main specs.
