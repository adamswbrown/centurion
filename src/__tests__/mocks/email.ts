/**
 * Email Mock for Testing
 *
 * Mocks email sending functionality to prevent actual emails
 * from being sent during tests.
 */

import { vi } from "vitest"

export const mockSendSystemEmail = vi.fn().mockResolvedValue({
  success: true,
  messageId: "mock-message-id",
})

export const mockSendEmail = vi.fn().mockResolvedValue({
  success: true,
  messageId: "mock-message-id",
})

// Track sent emails for assertion
export const sentEmails: Array<{
  to: string
  templateKey: string
  variables: Record<string, string>
}> = []

// Enhanced mock that tracks sent emails
mockSendSystemEmail.mockImplementation(async (params) => {
  sentEmails.push({
    to: params.to,
    templateKey: params.templateKey,
    variables: params.variables,
  })
  return { success: true, messageId: "mock-message-id" }
})

// Reset email mocks and clear sent emails
export function resetEmailMocks() {
  mockSendSystemEmail.mockReset()
  mockSendEmail.mockReset()
  sentEmails.length = 0

  // Restore default implementation
  mockSendSystemEmail.mockImplementation(async (params) => {
    sentEmails.push({
      to: params.to,
      templateKey: params.templateKey,
      variables: params.variables,
    })
    return { success: true, messageId: "mock-message-id" }
  })
  mockSendEmail.mockResolvedValue({
    success: true,
    messageId: "mock-message-id",
  })
}

// Setup module mock
vi.mock("@/lib/email", () => ({
  sendSystemEmail: mockSendSystemEmail,
  sendEmail: mockSendEmail,
}))
