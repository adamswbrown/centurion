"use client"

import { useEffect, useState } from "react"
import { Model } from "survey-core"
import { Survey } from "survey-react-ui"
import { surveyTheme, defaultSurveyOptions } from "@/lib/surveyjs-config"

// Import SurveyJS CSS - using main stylesheet
import "survey-core/survey-core.css"

interface SurveyContainerProps {
  /**
   * SurveyJS JSON schema defining the questionnaire structure
   */
  surveyJson: object

  /**
   * Initial data to populate the survey (for editing existing responses)
   */
  initialData?: Record<string, any>

  /**
   * Whether the survey is in read-only mode (for completed/locked questionnaires)
   */
  readOnly?: boolean

  /**
   * Callback when survey completes
   */
  onComplete?: (sender: Model) => void

  /**
   * Callback when any value changes (for auto-save functionality)
   */
  onValueChanged?: (sender: Model, options: any) => void
}

/**
 * SurveyContainer wraps SurveyJS with theme configuration and event handlers
 *
 * This component:
 * - Applies Centurion theme to SurveyJS
 * - Manages survey state and lifecycle
 * - Handles completion and auto-save events
 * - Supports read-only mode for locked questionnaires
 */
export function SurveyContainer({
  surveyJson,
  initialData,
  readOnly = false,
  onComplete,
  onValueChanged,
}: SurveyContainerProps) {
  const [survey, setSurvey] = useState<Model | null>(null)

  useEffect(() => {
    // Create survey model
    const surveyModel = new Model(surveyJson)

    // Apply theme
    surveyModel.applyTheme(surveyTheme)

    // Apply default options
    Object.assign(surveyModel, defaultSurveyOptions)

    // Set read-only mode if specified
    if (readOnly) {
      surveyModel.mode = "display"
    }

    // Load initial data if provided
    if (initialData) {
      surveyModel.data = initialData
    }

    // Register event handlers
    if (onComplete) {
      surveyModel.onComplete.add(onComplete)
    }

    if (onValueChanged) {
      surveyModel.onValueChanged.add(onValueChanged)
    }

    setSurvey(surveyModel)

    // Cleanup
    return () => {
      if (onComplete) {
        surveyModel.onComplete.remove(onComplete)
      }
      if (onValueChanged) {
        surveyModel.onValueChanged.remove(onValueChanged)
      }
    }
  }, [surveyJson, initialData, readOnly, onComplete, onValueChanged])

  if (!survey) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <p className="text-muted-foreground">Loading survey...</p>
      </div>
    )
  }

  return (
    <div className="surveyjs-container">
      <Survey model={survey} />
    </div>
  )
}
