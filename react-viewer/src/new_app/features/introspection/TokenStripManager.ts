import { singleton } from "tsyringe";

@singleton()
export class TokenStripManager {
  private selection: Set<string> = new Set();

  public toggle(tokenId: string) {
    if (this.selection.has(tokenId)) {
      this.selection.delete(tokenId);
    } else {
      this.selection.add(tokenId);
    }
  }

  public getSelection(): string[] {
    return Array.from(this.selection);
  }

  public clear() {
    this.selection.clear();
  }
}
