# Implementation Tasks: Dependency Updates Loop

**Change ID:** `add-dependency-updates-loop`

---

## Phase 1: Detection Logic

- [x] 1.1 Implement minimal semver (parse range/version, compare, updateType, formatRange)
- [x] 1.2 Implement registry client (injectable fetch) returning latest versions
- [x] 1.3 Implement update computation (apply non-major; collect skipped majors)
- [x] 1.4 Unit tests for semver + update computation

**Quality Gate:** typecheck + lint + tests

---

## Phase 2: Loop & Manifest

- [x] 2.1 Create `loops/dep-updates/loop.yaml` (trigger, allowlist, config)
- [x] 2.2 Implement loop factory (detect + act producing bumped package.json)
- [x] 2.3 `playbook.md` documenting the (deterministic) behavior + AI-optional notes
- [x] 2.4 Unit tests for detect/act (outdated, up-to-date, major-excluded)

**Quality Gate:** drift + no-drift cases pass

---

## Phase 3: Integration

- [x] 3.1 Export the loop; verify it runs through the shared runner + GitHub adapter
- [x] 3.2 Loop README + example notes

**Quality Gate:** full typecheck + lint + tests + build

---

## Completion Checklist

- [x] All phases complete
- [x] Success criteria verified
- [x] Ready for `/openspec-archive`
