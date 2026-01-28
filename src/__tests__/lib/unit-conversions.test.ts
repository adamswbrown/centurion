import { describe, it, expect } from "vitest"
import fc from "fast-check"
import {
  lbsToKg,
  kgToLbs,
  inchesToCm,
  cmToInches,
  formatWeight,
  formatHeight,
  toKg,
  fromKg,
  toCm,
  fromCm,
  formatDate,
  calculateBMI,
  calculateBMIMetric,
  getBMICategory,
  fahrenheitToCelsius,
  celsiusToFahrenheit,
  milesToKm,
  kmToMiles,
  metersToFeet,
  feetToMeters,
} from "@/lib/unit-conversions"

describe("unit-conversions", () => {
  describe("lbsToKg", () => {
    it("converts pounds to kilograms correctly", () => {
      expect(lbsToKg(100)).toBeCloseTo(45.3592, 4)
      expect(lbsToKg(150)).toBeCloseTo(68.0388, 4)
      expect(lbsToKg(0)).toBe(0)
    })

    it("handles decimal values", () => {
      expect(lbsToKg(1.5)).toBeCloseTo(0.680388, 5)
    })
  })

  describe("kgToLbs", () => {
    it("converts kilograms to pounds correctly", () => {
      expect(kgToLbs(45.3592)).toBeCloseTo(100, 4)
      expect(kgToLbs(68.0388)).toBeCloseTo(150, 4)
      expect(kgToLbs(0)).toBe(0)
    })

    it("handles decimal values", () => {
      expect(kgToLbs(1.5)).toBeCloseTo(3.30693, 4)
    })
  })

  describe("inchesToCm", () => {
    it("converts inches to centimeters correctly", () => {
      expect(inchesToCm(12)).toBeCloseTo(30.48, 4)
      expect(inchesToCm(70)).toBeCloseTo(177.8, 4)
      expect(inchesToCm(0)).toBe(0)
    })

    it("handles decimal values", () => {
      expect(inchesToCm(5.5)).toBeCloseTo(13.97, 4)
    })
  })

  describe("cmToInches", () => {
    it("converts centimeters to inches correctly", () => {
      expect(cmToInches(30.48)).toBeCloseTo(12, 4)
      expect(cmToInches(177.8)).toBeCloseTo(70, 4)
      expect(cmToInches(0)).toBe(0)
    })

    it("handles decimal values", () => {
      expect(cmToInches(13.97)).toBeCloseTo(5.5, 4)
    })
  })

  describe("formatWeight", () => {
    it("formats weight in lbs correctly", () => {
      expect(formatWeight(45.3592, "lbs")).toBe("100.0 lbs")
      expect(formatWeight(68.0388, "lbs")).toBe("150.0 lbs")
    })

    it("formats weight in kg correctly", () => {
      expect(formatWeight(45.3592, "kg")).toBe("45.4 kg")
      expect(formatWeight(68.0388, "kg")).toBe("68.0 kg")
    })

    it("handles zero values", () => {
      expect(formatWeight(0, "lbs")).toBe("0.0 lbs")
      expect(formatWeight(0, "kg")).toBe("0.0 kg")
    })

    it("rounds to one decimal place", () => {
      expect(formatWeight(45.3592, "kg")).toBe("45.4 kg")
      expect(formatWeight(45.35, "kg")).toBe("45.4 kg")
      expect(formatWeight(45.34, "kg")).toBe("45.3 kg")
    })
  })

  describe("formatHeight", () => {
    it("formats height in inches correctly", () => {
      expect(formatHeight(177.8, "inches")).toBe("70.0 in")
      expect(formatHeight(152.4, "inches")).toBe("60.0 in")
    })

    it("formats height in cm correctly", () => {
      expect(formatHeight(177.8, "cm")).toBe("177.8 cm")
      expect(formatHeight(152.4, "cm")).toBe("152.4 cm")
    })

    it("handles zero values", () => {
      expect(formatHeight(0, "inches")).toBe("0.0 in")
      expect(formatHeight(0, "cm")).toBe("0.0 cm")
    })

    it("rounds to one decimal place", () => {
      expect(formatHeight(177.8, "cm")).toBe("177.8 cm")
      expect(formatHeight(177.85, "cm")).toBe("177.8 cm") // JS toFixed uses banker's rounding
      expect(formatHeight(177.84, "cm")).toBe("177.8 cm")
    })
  })

  describe("toKg", () => {
    it("converts lbs to kg", () => {
      expect(toKg(100, "lbs")).toBeCloseTo(45.3592, 4)
    })

    it("returns same value for kg to kg", () => {
      expect(toKg(50, "kg")).toBe(50)
    })
  })

  describe("fromKg", () => {
    it("converts kg to lbs", () => {
      expect(fromKg(45.3592, "lbs")).toBeCloseTo(100, 4)
    })

    it("returns same value for kg to kg", () => {
      expect(fromKg(50, "kg")).toBe(50)
    })
  })

  describe("toCm", () => {
    it("converts inches to cm", () => {
      expect(toCm(70, "inches")).toBeCloseTo(177.8, 4)
    })

    it("returns same value for cm to cm", () => {
      expect(toCm(180, "cm")).toBe(180)
    })
  })

  describe("fromCm", () => {
    it("converts cm to inches", () => {
      expect(fromCm(177.8, "inches")).toBeCloseTo(70, 4)
    })

    it("returns same value for cm to cm", () => {
      expect(fromCm(180, "cm")).toBe(180)
    })
  })

  describe("formatDate", () => {
    it("formats Date object correctly", () => {
      const date = new Date("2025-01-15T12:00:00Z")
      expect(formatDate(date, "yyyy-MM-dd")).toBe("2025-01-15")
      expect(formatDate(date, "MM/dd/yyyy")).toBe("01/15/2025")
    })

    it("formats string date correctly", () => {
      expect(formatDate("2025-01-15", "yyyy-MM-dd")).toBe("2025-01-15")
      expect(formatDate("2025-01-15", "MM/dd/yyyy")).toBe("01/15/2025")
    })

    it("handles different format patterns", () => {
      const date = new Date("2025-01-15T12:00:00Z")
      expect(formatDate(date, "PPP")).toBeTruthy()
      expect(formatDate(date, "MMMM d, yyyy")).toBe("January 15, 2025")
    })
  })

  describe("calculateBMI", () => {
    it("calculates BMI correctly for imperial units", () => {
      expect(calculateBMI(150, 70)).toBeCloseTo(21.52, 2)
      expect(calculateBMI(200, 72)).toBeCloseTo(27.12, 1)
    })

    it("returns 0 for invalid inputs", () => {
      expect(calculateBMI(0, 70)).toBe(0)
      expect(calculateBMI(150, 0)).toBe(0)
      expect(calculateBMI(-10, 70)).toBe(0)
      expect(calculateBMI(150, -10)).toBe(0)
    })

    it("handles edge cases", () => {
      expect(calculateBMI(1, 1)).toBeCloseTo(703, 0)
    })
  })

  describe("calculateBMIMetric", () => {
    it("calculates BMI correctly for metric units", () => {
      expect(calculateBMIMetric(68, 177.8)).toBeCloseTo(21.51, 2)
      expect(calculateBMIMetric(90.7, 182.88)).toBeCloseTo(27.12, 1)
    })

    it("returns 0 for invalid inputs", () => {
      expect(calculateBMIMetric(0, 180)).toBe(0)
      expect(calculateBMIMetric(70, 0)).toBe(0)
      expect(calculateBMIMetric(-10, 180)).toBe(0)
      expect(calculateBMIMetric(70, -10)).toBe(0)
    })

    it("handles edge cases", () => {
      expect(calculateBMIMetric(1, 100)).toBeCloseTo(1.0, 2)
    })
  })

  describe("getBMICategory", () => {
    it("returns correct category for underweight", () => {
      expect(getBMICategory(17)).toBe("Underweight")
      expect(getBMICategory(18.4)).toBe("Underweight")
    })

    it("returns correct category for normal weight", () => {
      expect(getBMICategory(18.5)).toBe("Normal")
      expect(getBMICategory(22)).toBe("Normal")
      expect(getBMICategory(24.9)).toBe("Normal")
    })

    it("returns correct category for overweight", () => {
      expect(getBMICategory(25)).toBe("Overweight")
      expect(getBMICategory(27)).toBe("Overweight")
      expect(getBMICategory(29.9)).toBe("Overweight")
    })

    it("returns correct category for obese", () => {
      expect(getBMICategory(30)).toBe("Obese")
      expect(getBMICategory(35)).toBe("Obese")
      expect(getBMICategory(40)).toBe("Obese")
    })

    it("returns N/A for invalid BMI", () => {
      expect(getBMICategory(0)).toBe("N/A")
      expect(getBMICategory(-5)).toBe("N/A")
    })
  })

  describe("fahrenheitToCelsius", () => {
    it("converts fahrenheit to celsius correctly", () => {
      expect(fahrenheitToCelsius(32)).toBeCloseTo(0, 4)
      expect(fahrenheitToCelsius(212)).toBeCloseTo(100, 4)
      expect(fahrenheitToCelsius(98.6)).toBeCloseTo(37, 1)
    })

    it("handles negative values", () => {
      expect(fahrenheitToCelsius(-40)).toBeCloseTo(-40, 4)
    })
  })

  describe("celsiusToFahrenheit", () => {
    it("converts celsius to fahrenheit correctly", () => {
      expect(celsiusToFahrenheit(0)).toBeCloseTo(32, 4)
      expect(celsiusToFahrenheit(100)).toBeCloseTo(212, 4)
      expect(celsiusToFahrenheit(37)).toBeCloseTo(98.6, 1)
    })

    it("handles negative values", () => {
      expect(celsiusToFahrenheit(-40)).toBeCloseTo(-40, 4)
    })
  })

  describe("milesToKm", () => {
    it("converts miles to kilometers correctly", () => {
      expect(milesToKm(1)).toBeCloseTo(1.60934, 4)
      expect(milesToKm(10)).toBeCloseTo(16.0934, 4)
      expect(milesToKm(0)).toBe(0)
    })

    it("handles decimal values", () => {
      expect(milesToKm(5.5)).toBeCloseTo(8.85137, 4)
    })
  })

  describe("kmToMiles", () => {
    it("converts kilometers to miles correctly", () => {
      expect(kmToMiles(1.60934)).toBeCloseTo(1, 4)
      expect(kmToMiles(16.0934)).toBeCloseTo(10, 4)
      expect(kmToMiles(0)).toBe(0)
    })

    it("handles decimal values", () => {
      expect(kmToMiles(8.85137)).toBeCloseTo(5.5, 4)
    })
  })

  describe("metersToFeet", () => {
    it("converts meters to feet correctly", () => {
      expect(metersToFeet(1)).toBeCloseTo(3.28084, 4)
      expect(metersToFeet(10)).toBeCloseTo(32.8084, 4)
      expect(metersToFeet(0)).toBe(0)
    })

    it("handles decimal values", () => {
      expect(metersToFeet(1.5)).toBeCloseTo(4.92126, 4)
    })
  })

  describe("feetToMeters", () => {
    it("converts feet to meters correctly", () => {
      expect(feetToMeters(3.28084)).toBeCloseTo(1, 4)
      expect(feetToMeters(32.8084)).toBeCloseTo(10, 4)
      expect(feetToMeters(0)).toBe(0)
    })

    it("handles decimal values", () => {
      expect(feetToMeters(4.92126)).toBeCloseTo(1.5, 4)
    })
  })

  describe("property-based roundtrip tests", () => {
    const posDouble = fc.double({ min: 0.01, max: 1000, noNaN: true, noDefaultInfinity: true })

    it("lbs -> kg -> lbs roundtrip preserves value", () => {
      fc.assert(fc.property(posDouble, (lbs) => {
        expect(kgToLbs(lbsToKg(lbs))).toBeCloseTo(lbs, 4)
      }))
    })

    it("kg -> lbs -> kg roundtrip preserves value", () => {
      fc.assert(fc.property(fc.double({ min: 0.01, max: 500, noNaN: true, noDefaultInfinity: true }), (kg) => {
        expect(lbsToKg(kgToLbs(kg))).toBeCloseTo(kg, 4)
      }))
    })

    it("inches -> cm -> inches roundtrip preserves value", () => {
      fc.assert(fc.property(fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true }), (inches) => {
        expect(cmToInches(inchesToCm(inches))).toBeCloseTo(inches, 4)
      }))
    })

    it("cm -> inches -> cm roundtrip preserves value", () => {
      fc.assert(fc.property(fc.double({ min: 0.01, max: 250, noNaN: true, noDefaultInfinity: true }), (cm) => {
        expect(inchesToCm(cmToInches(cm))).toBeCloseTo(cm, 4)
      }))
    })

    it("fahrenheit -> celsius -> fahrenheit roundtrip preserves value", () => {
      fc.assert(fc.property(fc.double({ min: -100, max: 200, noNaN: true, noDefaultInfinity: true }), (f) => {
        expect(celsiusToFahrenheit(fahrenheitToCelsius(f))).toBeCloseTo(f, 4)
      }))
    })

    it("celsius -> fahrenheit -> celsius roundtrip preserves value", () => {
      fc.assert(fc.property(fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }), (c) => {
        expect(fahrenheitToCelsius(celsiusToFahrenheit(c))).toBeCloseTo(c, 4)
      }))
    })

    it("miles -> km -> miles roundtrip preserves value", () => {
      fc.assert(fc.property(posDouble, (miles) => {
        expect(kmToMiles(milesToKm(miles))).toBeCloseTo(miles, 4)
      }))
    })

    it("km -> miles -> km roundtrip preserves value", () => {
      fc.assert(fc.property(posDouble, (km) => {
        expect(milesToKm(kmToMiles(km))).toBeCloseTo(km, 4)
      }))
    })

    it("meters -> feet -> meters roundtrip preserves value", () => {
      fc.assert(fc.property(posDouble, (meters) => {
        expect(feetToMeters(metersToFeet(meters))).toBeCloseTo(meters, 4)
      }))
    })

    it("feet -> meters -> feet roundtrip preserves value", () => {
      fc.assert(fc.property(fc.double({ min: 0.01, max: 3000, noNaN: true, noDefaultInfinity: true }), (feet) => {
        expect(metersToFeet(feetToMeters(feet))).toBeCloseTo(feet, 4)
      }))
    })

    it("toKg/fromKg roundtrip with lbs preserves value", () => {
      fc.assert(fc.property(posDouble, (lbs) => {
        expect(fromKg(toKg(lbs, "lbs"), "lbs")).toBeCloseTo(lbs, 4)
      }))
    })

    it("toCm/fromCm roundtrip with inches preserves value", () => {
      fc.assert(fc.property(fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true }), (inches) => {
        expect(fromCm(toCm(inches, "inches"), "inches")).toBeCloseTo(inches, 4)
      }))
    })
  })

  describe("edge cases and boundary conditions", () => {
    it("handles very small positive numbers", () => {
      expect(lbsToKg(0.001)).toBeCloseTo(0.000453592, 6)
      expect(inchesToCm(0.001)).toBeCloseTo(0.00254, 6)
    })

    it("handles very large numbers", () => {
      expect(lbsToKg(10000)).toBeCloseTo(4535.92, 2)
      expect(inchesToCm(10000)).toBeCloseTo(25400, 0)
    })

    it("handles negative numbers in temperature conversions", () => {
      expect(fahrenheitToCelsius(-459.67)).toBeCloseTo(-273.15, 2)
      expect(celsiusToFahrenheit(-273.15)).toBeCloseTo(-459.67, 2)
    })

    it("formatWeight handles edge cases", () => {
      expect(formatWeight(0.001, "kg")).toBe("0.0 kg")
      expect(formatWeight(0.001, "lbs")).toBe("0.0 lbs")
      expect(formatWeight(9999.9, "kg")).toBe("9999.9 kg")
    })

    it("formatHeight handles edge cases", () => {
      expect(formatHeight(0.001, "cm")).toBe("0.0 cm")
      expect(formatHeight(0.001, "inches")).toBe("0.0 in")
      expect(formatHeight(9999.9, "cm")).toBe("9999.9 cm")
    })

    it("BMI calculation handles extreme values", () => {
      expect(calculateBMI(1000, 48)).toBeCloseTo(305.12, 1)
      expect(calculateBMIMetric(500, 100)).toBeCloseTo(500, 0)
    })

    it("getBMICategory handles boundary values precisely", () => {
      expect(getBMICategory(0.01)).toBe("Underweight")
      expect(getBMICategory(18.49999)).toBe("Underweight")
      expect(getBMICategory(18.5)).toBe("Normal")
      expect(getBMICategory(24.99999)).toBe("Normal")
      expect(getBMICategory(25)).toBe("Overweight")
      expect(getBMICategory(29.99999)).toBe("Overweight")
      expect(getBMICategory(30)).toBe("Obese")
    })
  })
})
