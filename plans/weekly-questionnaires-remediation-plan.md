# Weekly Questionnaires Remediation Plan

## Summary
Weekly questionnaires are essential for tracking client progress and engagement. The current implementation includes basic structure, but SurveyJS integration, week-based logic, and analytics/reporting are incomplete. This plan details the steps to achieve full parity with the unified platform spec and CoachFit baseline.

## Steps
1. **SurveyJS Integration**
   - Integrate SurveyJS for questionnaire rendering and response capture.
   - Support dynamic question sets per week (using QuestionnaireBundle).
   - Add validation and error handling for responses.
2. **Week-Based Logic**
   - Implement logic to assign the correct questionnaire per week/cohort.
   - Ensure UI displays the correct week and handles late/missed responses.
3. **Analytics & Reporting**
   - Build backend aggregation for questionnaire completion, trends, and insights.
   - Implement UI for questionnaire analytics (charts, tables, export).
4. **Testing**
   - Add unit/integration tests for questionnaire logic and analytics.
   - Add E2E tests for questionnaire flows.
5. **Documentation**
   - Update user/admin docs for questionnaire features and analytics.
   - Add developer notes for SurveyJS integration and week logic.

## Further Considerations
- Ensure all questionnaire flows are permission-checked (RBAC).
- Validate UI for accessibility and mobile responsiveness.
- Update WORKLOG.md and STATE.md after each major step.

---

**This is the second most urgent remediation plan. Begin with SurveyJS integration and week logic, then proceed through the steps above.**
