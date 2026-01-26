import { TimerShell } from "@/features/timer/TimerShell"
import { TimerSwRegister } from "@/app/timer/TimerSwRegister"

export default function TimerPage() {
  return (
    <>
      <TimerSwRegister />
      <TimerShell />
    </>
  )
}
