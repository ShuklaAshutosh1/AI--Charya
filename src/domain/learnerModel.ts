import { updateBkt, type BktUpdate } from "./bkt.js";
import { BKT_CONFIG } from "./config.js";
import type { BktParameters } from "./types.js";

export interface KnowledgeObservation {
  correct: boolean;
  applyLearningTransition: boolean;
}

export interface LearnerModel {
  readonly type: string;
  readonly version: string;
  readonly status: "provisional" | "validated";
  readonly initialProbability: number;
  readonly configuration: BktParameters;
  update(prior: number, observation: KnowledgeObservation): BktUpdate;
}

export class BktLearnerModel implements LearnerModel {
  readonly type = "Bayesian Knowledge Tracing";
  readonly version = BKT_CONFIG.version;
  readonly status = BKT_CONFIG.status;
  readonly initialProbability = BKT_CONFIG.pInit;
  readonly configuration = BKT_CONFIG;

  update(prior: number, observation: KnowledgeObservation): BktUpdate {
    return updateBkt(
      prior,
      observation.correct,
      BKT_CONFIG,
      observation.applyLearningTransition
    );
  }
}

export const BKT_LEARNER_MODEL: LearnerModel = new BktLearnerModel();
