import { IntervalPreset } from "./types"

export const defaultPresets: IntervalPreset[] = [
  {
    id: "tabata",
    name: "Tabata 4x",
    steps: [
      { id: "warmup", label: "Warmup", durationMs: 60_000, phase: "warmup" },
      { id: "work-1", label: "Work", durationMs: 20_000, phase: "work" },
      { id: "rest-1", label: "Rest", durationMs: 10_000, phase: "rest" },
      { id: "work-2", label: "Work", durationMs: 20_000, phase: "work" },
      { id: "rest-2", label: "Rest", durationMs: 10_000, phase: "rest" },
      { id: "work-3", label: "Work", durationMs: 20_000, phase: "work" },
      { id: "rest-3", label: "Rest", durationMs: 10_000, phase: "rest" },
      { id: "work-4", label: "Work", durationMs: 20_000, phase: "work" },
      { id: "cooldown", label: "Cooldown", durationMs: 60_000, phase: "cooldown" },
    ],
  },
  {
    id: "emom-10",
    name: "EMOM 10",
    steps: Array.from({ length: 10 }).flatMap((_, index) => [
      {
        id: `emom-work-${index}`,
        label: `Minute ${index + 1}`,
        durationMs: 45_000,
        phase: "work",
      },
      {
        id: `emom-rest-${index}`,
        label: "Recover",
        durationMs: 15_000,
        phase: "rest",
      },
    ]),
  },
]
