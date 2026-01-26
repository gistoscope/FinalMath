import { inject, singleton } from "tsyringe";
import { Tokens } from "../../di/tokens";
import type { IStoreService } from "../../store/interfaces/IStoreService";
import { SelectionService } from "../selection/SelectionService";
import type { IMapEngine } from "../surface-map/interfaces/IMapEngine";
import { SurfaceNode } from "../surface-map/models/SurfaceNode";

@singleton()
export class InteractionService {
  private mapEngine: IMapEngine;
  private store: IStoreService;
  private selectionService: SelectionService;

  constructor(
    @inject(Tokens.IMapEngine) mapEngine: IMapEngine,
    @inject(Tokens.IStoreService) store: IStoreService,
    selectionService: SelectionService,
  ) {
    this.mapEngine = mapEngine;
    this.store = store;
    this.selectionService = selectionService;
  }

  public handleHover(x: number, y: number, container: HTMLElement) {
    const node = this.mapEngine.hitTest(x, y, container);

    if (node) {
      this.store.updateHover({ target: this._formatNodeInfo(node) });
    } else {
      this.store.updateHover({ target: "—" });
    }
  }

  public handleClick(
    x: number,
    y: number,
    container: HTMLElement,
    ctrlKey: boolean = false,
  ) {
    const node = this.mapEngine.hitTest(x, y, container);
    if (!node) return;

    this.selectionService.selectNode(node, ctrlKey);
    this.store.updateHover({ lastClick: this._formatNodeInfo(node) });
  }

  private _formatNodeInfo(node: SurfaceNode): string {
    return `${node.kind} (${node.id})`;
  }
}
