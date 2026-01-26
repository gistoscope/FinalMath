/* eslint-disable @typescript-eslint/no-explicit-any */

import { singleton } from "tsyringe";
import { BaseApiClient } from "../base/BaseApiClient";

@singleton()
export class IntrospectClient extends BaseApiClient {
  constructor() {
    super();
    this.baseUrl =
      import.meta.env.VITE_INTROSPECT_URL ||
      "http://localhost:4201/api/introspect";
  }

  async getMetadata(id: string): Promise<any> {
    return this.get(`/${id}`);
  }

  async getAllMetadata(): Promise<any[]> {
    return this.get("/");
  }

  async instrumentLatex(latex: string): Promise<any> {
    return this.post("/instrument", { latex });
  }
}
