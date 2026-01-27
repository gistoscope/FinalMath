import { singleton } from "tsyringe";
import { SurfaceNode } from "../models/SurfaceNode";

@singleton()
export class SurfaceNodeFactory {
  private idCounter = 0;

  public nextId(prefix: string): string {
    return `${prefix}-${(++this.idCounter).toString(36)}`;
  }

  public createRoot(
    container: HTMLElement,
    width: number,
    height: number,
  ): SurfaceNode {
    return new SurfaceNode({
      id: "root",
      kind: "Root",
      role: "root",
      bbox: { left: 0, top: 0, right: width, bottom: height },
      dom: container,
      latexFragment: "",
    });
  }
}
