// Simple deterministic pricing calculator: base fare + weight surcharge +
// fragile handling fee. Kept isolated so it's easy to unit test / extend.
export function calculatePrice(weightKg: number, isFragile = false): number {
  const BASE_FARE = 60; // flat base rate
  const PER_KG_RATE = 15;
  const FRAGILE_SURCHARGE = 25;

  let price = BASE_FARE + weightKg * PER_KG_RATE;
  if (isFragile) price += FRAGILE_SURCHARGE;
  return Math.round(price * 100) / 100;
}
