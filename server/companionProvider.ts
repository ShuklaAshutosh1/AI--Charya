import type {
  CompanionProvider,
  CompanionReply,
  CompanionRequest
} from "../src/domain/companion.js";

/**
 * The first release uses reviewed, item-grounded support. An external model can
 * replace this provider later without gaining authority over learner state or planning.
 */
export class ReviewedContentCompanion implements CompanionProvider {
  async provide(request: CompanionRequest): Promise<CompanionReply> {
    return {
      message: request.contentItem.help[request.helpKind],
      provider: "reviewed-content-companion-v1",
      groundedInContentVersion: request.contentItem.provenance.version
    };
  }
}
