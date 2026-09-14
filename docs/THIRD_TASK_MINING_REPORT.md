# PortFlow third-pass task mining report

## Architecture and readiness

Terminal planning exception desk adds a board-oriented operational workbench. It coordinates berth windows and demurrage clocks, role-scoped authority, deterministic derived yard headroom, optimistic rollback, partial bulk recovery, route restoration, and before/after audit evidence. Task-readiness score: **95/100**. The 25 candidates include 18 medium-difficulty directions and 13 explicit multi-boundary directions.

## 25 vetted candidates

### 1. Recalculate hazardous block conflicts with reefer lane

- Product area: planning workbench
- Observable behavior: Visible yard headroom and affected rows update together
- Why medium difficulty: Requires coordination across temporal behavior, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: temporal behavior, derived calculations, audit projection
- Hidden-test observables: derived metric changes; affected status changes; audit event appears
- Similarity risk: medium: compare with adjacent recovery candidate
- Estimated scope: large

### 2. Recover customs hold arrived during commit

- Product area: exception queue
- Observable behavior: A failed vessel call visibly rolls back while unaffected records remain committed
- Why medium difficulty: Requires coordination across permissions, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: permissions, bulk operations, URL state
- Hidden-test observables: warning appears; rollback restores state; retry becomes available
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: small

### 3. Authorize crane and berth plan reconciled

- Product area: history inspector
- Observable behavior: The action, field access, and audit evidence change for hazmat supervisor
- Why medium difficulty: Requires coordination across hierarchy, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: hierarchy, lifecycle, audit projection
- Hidden-test observables: URL restores; field authority changes; related record remains visible
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: small

### 4. Compare yard headroom across berth windows and demurrage clocks

- Product area: bulk recovery panel
- Observable behavior: A direct URL restores the same berth windows and demurrage clocks decision context
- Why medium difficulty: Requires coordination across async mutation, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: async mutation, route state, URL state
- Hidden-test observables: derived metric changes; affected status changes; audit event appears
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: medium

### 5. Propagate vessel call lifecycle dependencies

- Product area: effective-date projection
- Observable behavior: Visible yard headroom and affected rows update together
- Why medium difficulty: Requires coordination across rollback, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: rollback, audit, audit projection
- Hidden-test observables: warning appears; rollback restores state; retry becomes available
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: small

### 6. Reconcile hazardous block conflicts with reefer lane

- Product area: planning workbench
- Observable behavior: A failed vessel call visibly rolls back while unaffected records remain committed
- Why medium difficulty: Requires coordination across derived calculations, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: derived calculations, conflict detection, URL state
- Hidden-test observables: URL restores; field authority changes; related record remains visible
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: small

### 7. Reschedule customs hold arrived during commit

- Product area: exception queue
- Observable behavior: The action, field access, and audit evidence change for gate observer
- Why medium difficulty: Requires coordination across bulk operations, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: bulk operations, scheduling, audit projection
- Hidden-test observables: derived metric changes; affected status changes; audit event appears
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: large

### 8. Explain crane and berth plan reconciled

- Product area: history inspector
- Observable behavior: A direct URL restores the same berth windows and demurrage clocks decision context
- Why medium difficulty: Requires coordination across lifecycle, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: lifecycle, validation, URL state
- Hidden-test observables: warning appears; rollback restores state; retry becomes available
- Similarity risk: medium: compare with adjacent recovery candidate
- Estimated scope: small

### 9. Restore yard headroom across berth windows and demurrage clocks

- Product area: bulk recovery panel
- Observable behavior: Visible yard headroom and affected rows update together
- Why medium difficulty: Requires coordination across route state, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: route state, recovery, audit projection
- Hidden-test observables: URL restores; field authority changes; related record remains visible
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: small

### 10. Prevent vessel call lifecycle dependencies

- Product area: effective-date projection
- Observable behavior: A failed vessel call visibly rolls back while unaffected records remain committed
- Why medium difficulty: Requires coordination across audit, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: audit, accessibility, URL state
- Hidden-test observables: derived metric changes; affected status changes; audit event appears
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: medium

### 11. Project hazardous block conflicts with reefer lane

- Product area: planning workbench
- Observable behavior: The action, field access, and audit evidence change for terminal planner
- Why medium difficulty: Requires coordination across conflict detection, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: conflict detection, concurrency, audit projection
- Hidden-test observables: warning appears; rollback restores state; retry becomes available
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: small

### 12. Audit customs hold arrived during commit

- Product area: exception queue
- Observable behavior: A direct URL restores the same berth windows and demurrage clocks decision context
- Why medium difficulty: Requires coordination across scheduling, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: scheduling, cross-page interactions, URL state
- Hidden-test observables: URL restores; field authority changes; related record remains visible
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: small

### 13. Reassign crane and berth plan reconciled

- Product area: history inspector
- Observable behavior: Visible yard headroom and affected rows update together
- Why medium difficulty: Requires coordination across validation, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: validation, temporal behavior, audit projection
- Hidden-test observables: derived metric changes; affected status changes; audit event appears
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: large

### 14. Invalidate yard headroom across berth windows and demurrage clocks

- Product area: bulk recovery panel
- Observable behavior: A failed vessel call visibly rolls back while unaffected records remain committed
- Why medium difficulty: Requires coordination across recovery, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: recovery, permissions, URL state
- Hidden-test observables: warning appears; rollback restores state; retry becomes available
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: small

### 15. Deep-link vessel call lifecycle dependencies

- Product area: effective-date projection
- Observable behavior: The action, field access, and audit evidence change for hazmat supervisor
- Why medium difficulty: Requires coordination across accessibility, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: accessibility, hierarchy, audit projection
- Hidden-test observables: URL restores; field authority changes; related record remains visible
- Similarity risk: medium: compare with adjacent recovery candidate
- Estimated scope: small

### 16. Retry hazardous block conflicts with reefer lane

- Product area: planning workbench
- Observable behavior: A direct URL restores the same berth windows and demurrage clocks decision context
- Why medium difficulty: Requires coordination across concurrency, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: concurrency, async mutation, URL state
- Hidden-test observables: derived metric changes; affected status changes; audit event appears
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: medium

### 17. Split customs hold arrived during commit

- Product area: exception queue
- Observable behavior: Visible yard headroom and affected rows update together
- Why medium difficulty: Requires coordination across cross-page interactions, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: cross-page interactions, rollback, audit projection
- Hidden-test observables: warning appears; rollback restores state; retry becomes available
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: small

### 18. Merge crane and berth plan reconciled

- Product area: history inspector
- Observable behavior: A failed vessel call visibly rolls back while unaffected records remain committed
- Why medium difficulty: Requires coordination across temporal behavior, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: temporal behavior, derived calculations, URL state
- Hidden-test observables: URL restores; field authority changes; related record remains visible
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: small

### 19. Retire yard headroom across berth windows and demurrage clocks

- Product area: bulk recovery panel
- Observable behavior: The action, field access, and audit evidence change for gate observer
- Why medium difficulty: Requires coordination across permissions, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: permissions, bulk operations, audit projection
- Hidden-test observables: derived metric changes; affected status changes; audit event appears
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: large

### 20. Override vessel call lifecycle dependencies

- Product area: effective-date projection
- Observable behavior: A direct URL restores the same berth windows and demurrage clocks decision context
- Why medium difficulty: Requires coordination across hierarchy, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: hierarchy, lifecycle, URL state
- Hidden-test observables: warning appears; rollback restores state; retry becomes available
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: small

### 21. Escalate hazardous block conflicts with reefer lane

- Product area: planning workbench
- Observable behavior: Visible yard headroom and affected rows update together
- Why medium difficulty: Requires coordination across async mutation, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: async mutation, route state, audit projection
- Hidden-test observables: URL restores; field authority changes; related record remains visible
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: small

### 22. Release customs hold arrived during commit

- Product area: exception queue
- Observable behavior: A failed vessel call visibly rolls back while unaffected records remain committed
- Why medium difficulty: Requires coordination across rollback, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: rollback, audit, URL state
- Hidden-test observables: derived metric changes; affected status changes; audit event appears
- Similarity risk: medium: compare with adjacent recovery candidate
- Estimated scope: medium

### 23. Inspect crane and berth plan reconciled

- Product area: history inspector
- Observable behavior: The action, field access, and audit evidence change for terminal planner
- Why medium difficulty: Requires coordination across derived calculations, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: derived calculations, conflict detection, audit projection
- Hidden-test observables: warning appears; rollback restores state; retry becomes available
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: small

### 24. Coordinate yard headroom across berth windows and demurrage clocks

- Product area: bulk recovery panel
- Observable behavior: A direct URL restores the same berth windows and demurrage clocks decision context
- Why medium difficulty: Requires coordination across bulk operations, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: bulk operations, scheduling, URL state
- Hidden-test observables: URL restores; field authority changes; related record remains visible
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: small

### 25. Preserve vessel call lifecycle dependencies

- Product area: effective-date projection
- Observable behavior: Visible yard headroom and affected rows update together
- Why medium difficulty: Requires coordination across lifecycle, domain policy, and React state while preserving adjacent vessel call behavior.
- State boundaries: lifecycle, validation, audit projection
- Hidden-test observables: derived metric changes; affected status changes; audit event appears
- Similarity risk: low: domain-specific rule and observable
- Estimated scope: large
