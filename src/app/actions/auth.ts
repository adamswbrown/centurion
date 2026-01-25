"use server"

import { signIn } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { AuthError } from "next-auth"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
})

export async function registerUser(formData: FormData) {
  const result = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!result.success) {
    return {
      error: result.error.errors[0].message,
    }
  }

  const { name, email, password } = result.data

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    return {
      error: "User with this email already exists",
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12)

  // Create user with CLIENT role by default
  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "CLIENT",
    },
  })

  // Auto sign in after registration
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "Failed to sign in after registration",
      }
    }
    throw error
  }
}

export async function signInWithCredentials(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    })

    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password" }
        default:
          return { error: "Something went wrong" }
      }
    }
    throw error
  }
}

export async function signInWithGoogle() {
  await signIn("google", {
    redirectTo: "/dashboard",
  })
}
