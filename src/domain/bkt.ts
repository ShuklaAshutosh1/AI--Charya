import type { BktParameters } from "./types.js";

export interface BktUpdate {
  prior: number;
  posteriorAfterObservation: number;
  posteriorAfterLearning: number;
}

export function updateBkt(
  prior: number,
  correct: boolean,
  parameters: BktParameters,
  applyLearningTransition = true
): BktUpdate {
  const boundedPrior = Math.min(0.999, Math.max(0.001, prior));
  const likelihood = correct
    ? boundedPrior * (1 - parameters.pSlip)
    : boundedPrior * parameters.pSlip;
  const alternative = correct
    ? (1 - boundedPrior) * parameters.pGuess
    : (1 - boundedPrior) * (1 - parameters.pGuess);
  const posteriorAfterObservation = likelihood / (likelihood + alternative);
  const posteriorAfterLearning = applyLearningTransition
    ? posteriorAfterObservation + (1 - posteriorAfterObservation) * parameters.pLearn
    : posteriorAfterObservation;

  return {
    prior: boundedPrior,
    posteriorAfterObservation,
    posteriorAfterLearning: Math.min(0.999, Math.max(0.001, posteriorAfterLearning))
  };
}
