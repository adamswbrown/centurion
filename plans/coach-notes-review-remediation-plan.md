# Coach Notes & Review Queue Remediation Plan

## Summary
Coach notes and the review queue are critical for scalable client oversight and feedback. The current implementation includes the Note model, but the automated review queue, attention scoring, and workflow UI are incomplete. This plan details the steps to achieve full parity with the unified platform spec and CoachFit baseline.

## Steps
1. **Review Queue Backend**
   - Implement WeeklyReviewQueue and AttentionScore models and cron jobs.
   - Build backend logic to populate and update the review queue based on client activity, compliance, and attention scoring.
2. **Review Queue UI**
   - Create dashboard for coaches/admins to view and manage the review queue.
   - Add filters, sorting, and bulk actions for review items.
3. **Coach Notes Workflow**
   - Integrate note-taking and feedback flows into the review queue UI.
   - Add notifications for pending reviews and completed feedback.
4. **Testing**
   - Add unit/integration tests for review queue and attention scoring logic.
   - Add E2E tests for review workflow and coach notes.
5. **Documentation**
   - Update user/admin docs for review queue and coach notes.
   - Add developer notes for attention scoring and queue logic.

## Further Considerations
- Ensure all review and note flows are permission-checked (RBAC).
- Validate UI for accessibility and mobile responsiveness.
- Update WORKLOG.md and STATE.md after each major step.
- The CoachFit codebase has this fully implimentd, exactly as its needed, this should be your base.


---

**This is the third most urgent remediation plan. Begin with backend review queue and attention scoring, then proceed through the steps above.**
