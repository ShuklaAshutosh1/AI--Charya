import { Router, type Request, type Response } from "express";
import type { LearningService } from "./learningService.js";
import type { Grade, HelpKind } from "../src/domain/types.js";

function asyncRoute(handler: (request: Request, response: Response) => unknown) {
  return async (request: Request, response: Response) => {
    try {
      const result = await handler(request, response);
      if (!response.headersSent) response.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected request failure.";
      response.status(400).json({ error: message });
    }
  };
}

function accessToken(request: Request): string {
  const authorization = request.header("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

export function createApiRouter(service: LearningService): Router {
  const router = Router();

  router.get(
    "/health",
    asyncRoute(() => ({ status: "ok", service: "ai-charya", time: new Date().toISOString() }))
  );

  router.get(
    "/catalog",
    asyncRoute((request) => service.getCatalog(request.query.grade ? Number(request.query.grade) : undefined))
  );

  router.get(
    "/engagement/leaderboard",
    asyncRoute(() => service.getLeaderboard())
  );

  router.post(
    "/learners",
    asyncRoute((request) =>
      service.createLearner({
        name: String(request.body?.name ?? ""),
        grade: Number(request.body?.grade) as Grade
      })
    )
  );

  router.get(
    "/learners/:learnerId",
    asyncRoute((request) => {
      const learnerId = String(request.params.learnerId);
      service.authorizeLearner(accessToken(request), learnerId);
      return service.getLearner(learnerId);
    })
  );

  router.get(
    "/learners/:learnerId/home",
    asyncRoute((request) => {
      const learnerId = String(request.params.learnerId);
      service.authorizeLearner(accessToken(request), learnerId);
      return service.getHome(learnerId);
    })
  );

  router.get(
    "/learners/:learnerId/progress",
    asyncRoute((request) => {
      const learnerId = String(request.params.learnerId);
      service.authorizeLearner(accessToken(request), learnerId);
      return service.getProgress(learnerId);
    })
  );

  router.get(
    "/learners/:learnerId/profile-overview",
    asyncRoute((request) => {
      const learnerId = String(request.params.learnerId);
      service.authorizeLearner(accessToken(request), learnerId);
      return service.getProfileOverview(learnerId);
    })
  );

  router.get(
    "/learners/:learnerId/preferences",
    asyncRoute((request) => {
      const learnerId = String(request.params.learnerId);
      service.authorizeLearner(accessToken(request), learnerId);
      return service.getPreferences(learnerId);
    })
  );

  router.put(
    "/learners/:learnerId/preferences",
    asyncRoute((request) => {
      const learnerId = String(request.params.learnerId);
      service.authorizeLearner(accessToken(request), learnerId);
      return service.updatePreferences(learnerId, {
        interfaceLanguage: request.body?.interfaceLanguage,
        sessionLengthMinutes:
          typeof request.body?.sessionLengthMinutes === "number"
            ? request.body.sessionLengthMinutes
            : undefined,
        reduceMotion:
          typeof request.body?.reduceMotion === "boolean" ? request.body.reduceMotion : undefined,
        largerText:
          typeof request.body?.largerText === "boolean" ? request.body.largerText : undefined,
        privateProfile:
          typeof request.body?.privateProfile === "boolean" ? request.body.privateProfile : undefined
      });
    })
  );

  router.post(
    "/learners/:learnerId/state-disputes",
    asyncRoute((request) => {
      const learnerId = String(request.params.learnerId);
      service.authorizeLearner(accessToken(request), learnerId);
      return service.disputeState(
        learnerId,
        String(request.body?.knowledgeComponentId ?? ""),
        String(request.body?.note ?? "")
      );
    })
  );

  router.post(
    "/goals/:goalId/start",
    asyncRoute((request) => {
      const learnerId = String(request.body?.learnerId ?? "");
      service.authorizeLearner(accessToken(request), learnerId);
      return service.startGoal(
        learnerId,
        String(request.params.goalId),
        request.body?.entryMode === "learn" ? "learn" : "check"
      );
    })
  );

  router.get(
    "/sessions/:sessionId",
    asyncRoute((request) => {
      const sessionId = String(request.params.sessionId);
      service.authorizeSession(accessToken(request), sessionId);
      return service.getSession(sessionId);
    })
  );

  router.post(
    "/sessions/:sessionId/respond",
    asyncRoute((request) => {
      const sessionId = String(request.params.sessionId);
      service.authorizeSession(accessToken(request), sessionId);
      return service.respond(sessionId, {
        selectedOptionId: request.body?.selectedOptionId
          ? String(request.body.selectedOptionId)
          : undefined,
        skipped: Boolean(request.body?.skipped),
        responseTimeMs:
          typeof request.body?.responseTimeMs === "number" ? request.body.responseTimeMs : null
      });
    })
  );

  router.post(
    "/sessions/:sessionId/next",
    asyncRoute((request) => {
      const sessionId = String(request.params.sessionId);
      service.authorizeSession(accessToken(request), sessionId);
      return service.next(sessionId);
    })
  );

  router.post(
    "/sessions/:sessionId/checkpoint",
    asyncRoute((request) => {
      const sessionId = String(request.params.sessionId);
      service.authorizeSession(accessToken(request), sessionId);
      return service.startCheckpoint(sessionId);
    })
  );

  router.post(
    "/sessions/:sessionId/assistance",
    asyncRoute((request) => {
      const sessionId = String(request.params.sessionId);
      service.authorizeSession(accessToken(request), sessionId);
      return service.requestAssistance(
        sessionId,
        String(request.body?.kind ?? "") as HelpKind
      );
    })
  );

  router.post(
    "/challenges",
    asyncRoute((request) => {
      const learnerId = String(request.body?.learnerId ?? "");
      service.authorizeLearner(accessToken(request), learnerId);
      return service.startChallenge({
        learnerId,
        goalId: String(request.body?.goalId ?? ""),
        mode: String(request.body?.mode ?? "") as "one_v_one" | "rapid_fire"
      });
    })
  );

  router.get(
    "/challenges/:matchId",
    asyncRoute((request) => {
      const matchId = String(request.params.matchId);
      const learnerId = String(request.query.learnerId ?? "");
      service.authorizeChallenge(accessToken(request), matchId);
      return service.getChallenge(matchId, learnerId);
    })
  );

  router.post(
    "/challenges/:matchId/respond",
    asyncRoute((request) => {
      const matchId = String(request.params.matchId);
      const learnerId = String(request.body?.learnerId ?? "");
      service.authorizeChallenge(accessToken(request), matchId);
      return service.respondToChallenge(matchId, learnerId, {
        selectedOptionId: request.body?.selectedOptionId
          ? String(request.body.selectedOptionId)
          : undefined,
        responseTimeMs:
          typeof request.body?.responseTimeMs === "number" ? request.body.responseTimeMs : null
      });
    })
  );

  router.post(
    "/challenges/:matchId/next",
    asyncRoute((request) => {
      const matchId = String(request.params.matchId);
      const learnerId = String(request.body?.learnerId ?? "");
      service.authorizeChallenge(accessToken(request), matchId);
      return service.nextChallengeQuestion(matchId, learnerId);
    })
  );

  return router;
}
