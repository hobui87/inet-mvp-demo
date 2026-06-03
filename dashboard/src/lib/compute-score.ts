// compute-score.ts — Weighted scoring formula for MVP evaluation
// Formula: weighted = 0.3*BP + 0.3*SF + 0.25*UX + 0.15*TF
// BP = business_potential, SF = strategic_fit, UX = ux_quality, TF = tech_fit

export interface ScoreInputs {
  business_potential: number;
  strategic_fit: number;
  ux_quality: number;
  tech_fit: number;
}

/** Round to 2 decimal places */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compute weighted MVP score from raw rubric inputs.
 * All inputs expected in range 0–10 (or 0–100, formula is scale-agnostic).
 */
export function computeWeightedScore(inputs: ScoreInputs): number {
  const { business_potential, strategic_fit, ux_quality, tech_fit } = inputs;
  const weighted =
    0.3 * business_potential +
    0.3 * strategic_fit +
    0.25 * ux_quality +
    0.15 * tech_fit;
  return round2(weighted);
}
