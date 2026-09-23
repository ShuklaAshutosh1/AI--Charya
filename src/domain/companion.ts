import type { ActivityMode, ContentItem, HelpKind } from "./types.js";

export interface CompanionRequest {
  mode: ActivityMode;
  helpKind: HelpKind;
  contentItem: ContentItem;
}

export interface CompanionReply {
  message: string;
  provider: string;
  groundedInContentVersion: string;
}

export interface CompanionProvider {
  provide(request: CompanionRequest): Promise<CompanionReply>;
}
