import { inject, singleton } from "tsyringe";
import { OrchestratorClient } from "../../core/api/clients/OrchestratorClient";
import { Tokens } from "../../di/tokens";
import type { IStoreService } from "../../store/interfaces/IStoreService";
import { SelectionService } from "../selection/SelectionService";
import { OperatorSelectionContext } from "../selection/models/OperatorSelectionContext";
import type { IMapEngine } from "../surface-map/interfaces/IMapEngine";
import { SurfaceNode } from "../surface-map/models/SurfaceNode";
import { GestureProcessor, type Point } from "./GestureProcessor";

import { P1Service } from "../../features/p1/P1Service";

@singleton()
export class InteractionService {
  private mapEngine: IMapEngine;
  private store: IStoreService;
  private selectionService: SelectionService;
  private gesture: GestureProcessor;
  private orchestrator: OrchestratorClient;
  private p1Service: P1Service;

  constructor(
    @inject(Tokens.IMapEngine) mapEngine: IMapEngine,
    @inject(Tokens.IStoreService) store: IStoreService,
    @inject(OrchestratorClient) orchestrator: OrchestratorClient,
    @inject(SelectionService) selectionService: SelectionService,
    @inject(GestureProcessor) gesture: GestureProcessor,
    @inject(P1Service) p1Service: P1Service,
  ) {
    this.mapEngine = mapEngine;
    this.store = store;
    this.orchestrator = orchestrator;
    this.selectionService = selectionService;
    this.gesture = gesture;
    this.p1Service = p1Service;
  }

  public handlePointerDown(x: number, y: number) {
    this.store.updateDrag({
      isDragging: true,
      dragStart: { x, y },
      dragEnd: { x, y },
    });
  }

  public handlePointerMove(
    x: number,
    y: number,
    container: HTMLElement,
    target?: HTMLElement,
  ) {
    const { isDragging, dragStart } = this.store.getDrag();
    const node = this.mapEngine.hitTest(x, y, container, target);

    // console.log("[InteractionService] move", { x, y, node: node?.id });

    // Update Hover
    if (node) {
      this.store.updateHover({ target: this._formatNodeInfo(node) });
    } else {
      this.store.updateHover({ target: "—" });
    }

    // Update Drag
    if (isDragging && dragStart) {
      this.store.updateDrag({ dragEnd: { x, y } });
    }
  }

  public handlePointerUp(
    x: number,
    y: number,
    container: HTMLElement,
    ctrlKey: boolean = false,
    target?: HTMLElement,
  ) {
    console.log("[InteractionService] up", { x, y });
    const { dragStart } = this.store.getDrag();
    const end = { x, y };

    if (dragStart && this.gesture.isDragDistance(dragStart, end)) {
      this._handleRectSelection(dragStart, end, container, ctrlKey);
    } else {
      this._handleClick(x, y, container, ctrlKey, target);
    }

    this.store.updateDrag({
      isDragging: false,
      dragStart: null,
      dragEnd: null,
    });
  }

  private async _handleClick(
    x: number,
    y: number,
    container: HTMLElement,
    ctrlKey: boolean,
    target?: HTMLElement,
  ) {
    const node = this.mapEngine.hitTest(x, y, container, target);
    console.log("[InteractionService] _handleClick", {
      x,
      y,
      target: target?.tagName,
      nodeId: node?.id,
      nodeKind: node?.kind,
      nodeAstId: node?.astNodeId,
    });
    if (!node) return;

    this.selectionService.selectNode(node, ctrlKey);
    this.store.updateHover({ lastClick: this._formatNodeInfo(node) });

    // P1: Smart Operator Selection
    if (
      node.role === "operator" ||
      node.kind === "BinaryOp" ||
      node.kind === "MinusBinary"
    ) {
      await this._handleOperatorClick(node);
    } else if (node.kind === "Num") {
      this.store.updateOperatorSelection({
        active: false,
        context: null,
        boxes: [],
      });
      await this.p1Service.ensureP1IntegerContext(node.id, node.astNodeId);
    } else {
      // Clear operator context if clicking other things
      this.store.updateOperatorSelection({
        active: false,
        context: null,
        boxes: [],
      });
    }
  }

  private async _handleOperatorClick(node: SurfaceNode) {
    const map = this.mapEngine.getCurrentMap();
    const context = OperatorSelectionContext.create(node, map);

    if (context && context.isComplete()) {
      const boxes = context.getBoundingBoxes();

      this.store.updateOperatorSelection({
        active: true,
        context: context,
        boxes: boxes,
        validationType: "requires-prep", // Loading state
      });

      // todo need use run step api
      try {
        const latex = this.store.getLatex();
        const response = await this.orchestrator.validateOperator(
          latex,
          node.astNodeId || "",
        );

        let validationType = "requires-prep";
        if (response && response.validationType) {
          validationType = response.validationType;
        }

        // Update with result
        this.store.updateOperatorSelection({
          validationType,
        });
      } catch (err) {
        console.warn("[InteractionService] Operator validation failed", err);
        // Fallback or keep requires-prep
      }
    }
  }

  private _handleRectSelection(
    start: Point,
    end: Point,
    container: HTMLElement,
    ctrlKey: boolean,
  ) {
    const containerRect = container.getBoundingClientRect();
    const box = this.gesture.calculateBox(start, end, containerRect);

    const nodes = this.mapEngine.hitTestRect(box);
    if (nodes.length > 0) {
      this.selectionService.selectMultiple(nodes, ctrlKey);
    }
  }

  private _formatNodeInfo(node: SurfaceNode): string {
    return `${node.kind} (${node.id})`;
  }
}
