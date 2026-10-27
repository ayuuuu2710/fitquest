export type RestingEnergyInput = {
  age: number | null | undefined
  heightCm: number | null | undefined
  weightKg: number | null | undefined
  sexForCalculation: 'female' | 'male' | null | undefined
}

// Mifflin–St Jeor estimate. The original study was in adults aged 19–78;
// outside that range (or without a selected equation option), show no estimate.
export function estimateRestingEnergyKcal(profile: RestingEnergyInput): number | null {
  const { age, heightCm, weightKg, sexForCalculation } = profile
  if (age === null || age === undefined || age < 19 || age > 78 || !heightCm || !weightKg || !sexForCalculation) return null
  const sexConstant = sexForCalculation === 'male' ? 5 : -161
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant)
}
