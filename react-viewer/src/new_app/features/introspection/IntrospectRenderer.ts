import { inject, singleton } from "tsyringe";
import { IntrospectClient } from "../../core/api/clients/IntrospectClient";
import type { ILogger } from "../../core/logging/ILogger";
import { Tokens } from "../../di/tokens";

@singleton()
export class IntrospectRenderer {
  private logger: ILogger;
  private client: IntrospectClient;

  constructor(
    @inject(Tokens.ILogger) logger: ILogger,
    client: IntrospectClient,
  ) {
    this.logger = logger;
    this.client = client;
  }

  public async fetchAndRender(expressionId: string) {
    this.logger.info(`[Introspect] Fetching metadata for ${expressionId}`);
    try {
      const metadata = await this.client.getMetadata(expressionId);
      // In a real app, we might update a specific IntrospectStore
      this.logger.debug("[Introspect] Metadata received", metadata);
      return metadata;
    } catch (err) {
      this.logger.error("[Introspect] Failed to fetch metadata", err);
      return null;
    }
  }
}
