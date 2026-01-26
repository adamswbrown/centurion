import { ITheme } from "survey-core"

/**
 * SurveyJS theme configuration matching Centurion design system
 * Based on Tailwind CSS classes and color palette
 */
export const surveyTheme: ITheme = {
  cssVariables: {
    // Primary colors (matching Tailwind primary/blue)
    "--sjs-primary-backcolor": "hsl(221.2 83.2% 53.3%)",
    "--sjs-primary-backcolor-dark": "hsl(217.2 91.2% 59.8%)",
    "--sjs-primary-backcolor-light": "hsl(214.3 31.8% 91.4%)",
    "--sjs-primary-forecolor": "hsl(0 0% 100%)",
    "--sjs-primary-forecolor-light": "hsl(221.2 83.2% 53.3%)",

    // Secondary/accent colors
    "--sjs-secondary-backcolor": "hsl(215.4 16.3% 46.9%)",
    "--sjs-secondary-backcolor-light": "hsl(210 40% 96.1%)",
    "--sjs-secondary-backcolor-semi-light": "hsl(214.3 31.8% 91.4%)",
    "--sjs-secondary-forecolor": "hsl(222.2 47.4% 11.2%)",
    "--sjs-secondary-forecolor-light": "hsl(215.4 16.3% 46.9%)",

    // Background and surface colors
    "--sjs-general-backcolor": "hsl(0 0% 100%)",
    "--sjs-general-backcolor-dark": "hsl(210 40% 98%)",
    "--sjs-general-backcolor-dim": "hsl(214.3 31.8% 91.4%)",
    "--sjs-general-backcolor-dim-light": "hsl(210 40% 96.1%)",
    "--sjs-general-backcolor-dim-dark": "hsl(217.2 32.6% 17.5%)",
    "--sjs-general-forecolor": "hsl(222.2 47.4% 11.2%)",
    "--sjs-general-forecolor-light": "hsl(215.4 16.3% 46.9%)",
    "--sjs-general-dim-forecolor": "hsl(220 8.9% 46.1%)",
    "--sjs-general-dim-forecolor-light": "hsl(220 8.9% 46.1%)",

    // Border colors
    "--sjs-border-default": "hsl(214.3 31.8% 91.4%)",
    "--sjs-border-light": "hsl(210 40% 96.1%)",
    "--sjs-border-inside": "hsl(214.3 31.8% 91.4%)",

    // Special colors
    "--sjs-special-red": "hsl(0 84.2% 60.2%)",
    "--sjs-special-red-light": "hsl(0 84.2% 60.2% / 0.1)",
    "--sjs-special-red-forecolor": "hsl(0 0% 100%)",
    "--sjs-special-green": "hsl(142.1 76.2% 36.3%)",
    "--sjs-special-green-light": "hsl(142.1 76.2% 36.3% / 0.1)",
    "--sjs-special-green-forecolor": "hsl(0 0% 100%)",
    "--sjs-special-blue": "hsl(221.2 83.2% 53.3%)",
    "--sjs-special-blue-light": "hsl(221.2 83.2% 53.3% / 0.1)",
    "--sjs-special-blue-forecolor": "hsl(0 0% 100%)",
    "--sjs-special-yellow": "hsl(47.9 95.8% 53.1%)",
    "--sjs-special-yellow-light": "hsl(47.9 95.8% 53.1% / 0.1)",
    "--sjs-special-yellow-forecolor": "hsl(222.2 47.4% 11.2%)",

    // Font
    "--sjs-font-family": "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    "--sjs-font-size": "14px",

    // Spacing and borders
    "--sjs-corner-radius": "6px",
    "--sjs-base-unit": "8px",
  },
}

/**
 * Default SurveyJS configuration options
 */
export const defaultSurveyOptions = {
  // Show progress bar
  showProgressBar: "top" as const,
  progressBarType: "pages" as const,

  // Question numbering
  showQuestionNumbers: "on" as const,
  questionErrorLocation: "bottom" as const,

  // Navigation
  showNavigationButtons: true,
  showPrevButton: true,
  showCompleteButton: true,

  // Completion
  completedHtml: "<h3>Thank you for completing this questionnaire!</h3>",
  completedHtmlOnCondition: [],

  // Validation
  checkErrorsMode: "onValueChanged" as const,
  textUpdateMode: "onBlur" as const,

  // Misc
  focusFirstQuestionAutomatic: true,
  requiredText: "*",
  questionStartIndex: "1",
}
