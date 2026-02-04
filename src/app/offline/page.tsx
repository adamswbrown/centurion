import { WifiOff } from "lucide-react"

export const metadata = {
  title: "Offline - Centurion",
}

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="text-center">
        <WifiOff className="mx-auto h-16 w-16 text-muted-foreground" />
        <h1 className="mt-6 text-2xl font-bold">You&apos;re Offline</h1>
        <p className="mt-2 text-muted-foreground">
          It looks like you&apos;ve lost your internet connection.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Some features may be limited until you&apos;re back online.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
