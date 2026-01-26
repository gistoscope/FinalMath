import { inject, singleton } from "tsyringe";
import { Tokens } from "../../di/tokens";
import type { IStoreService } from "../../store/interfaces/IStoreService";
import { SurfaceNode } from "../surface-map/models/SurfaceNode";

@singleton()
export class SelectionService {
  private store: IStoreService;

  constructor(@inject(Tokens.IStoreService) store: IStoreService) {
    this.store = store;
  }

  public selectNode(node: SurfaceNode, isMulti: boolean = false) {
    const { selectedIds } = this.store.getSelection();
    const newSet = new Set(selectedIds);

    if (isMulti) {
      if (newSet.has(node.id)) {
        newSet.delete(node.id);
      } else {
        newSet.add(node.id);
      }
    } else {
      newSet.clear();
      newSet.add(node.id);
    }

    this.store.updateSelection({
      selectedIds: newSet,
      mode: newSet.size === 0 ? "none" : newSet.size === 1 ? "single" : "multi",
      primaryId: newSet.size > 0 ? node.id : null,
    });
  }

  public selectMultiple(nodes: SurfaceNode[], isToggle: boolean = false) {
    const { selectedIds } = this.store.getSelection();
    const newSet = isToggle ? new Set(selectedIds) : new Set<string>();

    for (const node of nodes) {
      if (isToggle && newSet.has(node.id)) {
        newSet.delete(node.id);
      } else {
        newSet.add(node.id);
      }
    }

    this.store.updateSelection({
      selectedIds: newSet,
      mode: newSet.size > 0 ? "rect" : "none",
      primaryId: nodes.length > 0 ? nodes[nodes.length - 1].id : null,
    });
  }

  public clearSelection() {
    this.store.updateSelection({
      selectedIds: new Set(),
      mode: "none",
      primaryId: null,
    });
  }
}
