"use client"

import { Component, ReactNode } from "react"

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Optionally log error
    // console.error(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-destructive">
          <h2 className="font-bold mb-2">Something went wrong.</h2>
          <pre className="text-xs whitespace-pre-wrap">{this.state.error?.message}</pre>
        </div>
      )
    }
    return this.props.children
  }
}
