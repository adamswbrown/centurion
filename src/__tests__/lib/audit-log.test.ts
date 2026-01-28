import { describe, it, expect, vi, beforeEach } from "vitest"
vi.mock("@/lib/prisma")
import { mockPrisma } from "../mocks/prisma"
import { logAuditEvent } from "@/lib/audit-log"

describe("logAuditEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates audit log with all fields", async () => {
    const params = {
      action: "UPDATE_USER",
      actorId: 1,
      targetId: 5,
      targetType: "User",
      details: { field: "email", oldValue: "old@test.com", newValue: "new@test.com" },
    }

    await logAuditEvent(params)

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "UPDATE_USER",
        userId: 1,
        target: "User:5",
        metadata: { field: "email", oldValue: "old@test.com", newValue: "new@test.com" },
      },
    })
  })

  it("creates without optional fields", async () => {
    const params = {
      action: "LOGIN",
      actorId: 2,
    }

    await logAuditEvent(params)

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "LOGIN",
        userId: 2,
        target: undefined,
        metadata: undefined,
      },
    })
  })

  it("maps actorId to userId field", async () => {
    await logAuditEvent({ action: "TEST", actorId: 42 })

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 42 }),
      })
    )
  })

  it("constructs target string from targetType and targetId", async () => {
    await logAuditEvent({
      action: "DELETE",
      actorId: 1,
      targetId: 99,
      targetType: "Appointment",
    })

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ target: "Appointment:99" }),
      })
    )
  })

  it("sets target undefined when only targetType provided", async () => {
    await logAuditEvent({
      action: "CREATE",
      actorId: 1,
      targetType: "User",
    })

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ target: undefined }),
      })
    )
  })

  it("sets target undefined when only targetId provided", async () => {
    await logAuditEvent({
      action: "UPDATE",
      actorId: 1,
      targetId: 10,
    })

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ target: undefined }),
      })
    )
  })

  it("sets metadata to undefined when details is null", async () => {
    await logAuditEvent({
      action: "ACTION",
      actorId: 1,
      details: null,
    })

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ metadata: undefined }),
      })
    )
  })

  it("sets metadata to undefined when details is undefined", async () => {
    await logAuditEvent({
      action: "ACTION",
      actorId: 1,
      details: undefined,
    })

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ metadata: undefined }),
      })
    )
  })

  it("passes details as metadata when provided", async () => {
    const details = {
      ip: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      changes: ["field1", "field2"],
    }

    await logAuditEvent({
      action: "UPDATE",
      actorId: 1,
      details,
    })

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ metadata: details }),
      })
    )
  })
})
