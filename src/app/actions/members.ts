"use server"

import { prisma } from "@/lib/prisma"
import { requireCoach } from "@/lib/auth"
import { z } from "zod"

const createClientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  image: z.string().optional(),
})

const updateClientSchema = createClientSchema.partial()

export async function getClients() {
  await requireCoach()

  return await prisma.user.findMany({
    where: { role: "CLIENT" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      _count: {
        select: {
          appointments: true,
          cohortMemberships: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getClientById(id: number) {
  await requireCoach()

  return await prisma.user.findUnique({
    where: { id, role: "CLIENT" },
    include: {
      appointments: {
        orderBy: { startTime: "desc" },
        take: 5,
      },
      cohortMemberships: {
        include: { cohort: true },
      },
      invoices: {
        orderBy: { month: "desc" },
        take: 5,
      },
    },
  })
}

export async function createClient(formData: FormData) {
  await requireCoach()

  const result = createClientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    image: formData.get("image"),
  })

  if (!result.success) {
    return {
      error: result.error.errors[0].message,
    }
  }

  const { name, email, image } = result.data

  const existing = await prisma.user.findUnique({
    where: { email },
  })

  if (existing) {
    return {
      error: "User with this email already exists",
    }
  }

  const client = await prisma.user.create({
    data: {
      name,
      email,
      image,
      role: "CLIENT",
      emailVerified: false,
    },
  })

  return { success: true, client }
}

export async function updateClient(id: number, formData: FormData) {
  await requireCoach()

  const result = updateClientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    image: formData.get("image"),
  })

  if (!result.success) {
    return {
      error: result.error.errors[0].message,
    }
  }

  const client = await prisma.user.findUnique({
    where: { id },
  })

  if (!client || client.role !== "CLIENT") {
    return {
      error: "Client not found",
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: result.data,
  })

  return { success: true, client: updated }
}

export async function deleteClient(id: number) {
  await requireCoach()

  const client = await prisma.user.findUnique({
    where: { id },
  })

  if (!client || client.role !== "CLIENT") {
    return {
      error: "Client not found",
    }
  }

  await prisma.user.delete({
    where: { id },
  })

  return { success: true }
}
