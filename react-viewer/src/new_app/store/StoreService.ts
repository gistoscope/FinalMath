/* eslint-disable @typescript-eslint/no-explicit-any */
import { singleton } from "tsyringe";
import { useViewerStore } from "../../store/useViewerStore";
import type { IStoreService } from "./interfaces/IStoreService";

/**
 * StoreService
 * Bridges the class-based DI world with the Zustand reactive state.
 */
@singleton()
export class StoreService implements IStoreService {
  // Formula
  public getLatex(): string {
    return useViewerStore.getState().formula.latex;
  }

  public setLatex(latex: string): void {
    useViewerStore.getState().actions.setLatex(latex);
  }

  public setIsRendering(isRendering: boolean): void {
    useViewerStore.getState().actions.setIsRendering(isRendering);
  }

  // Selection
  public getSelection() {
    return useViewerStore.getState().selection;
  }

  public updateSelection(selection: any): void {
    useViewerStore.getState().actions.updateSelection(selection);
  }

  // Drag
  public getDrag() {
    return useViewerStore.getState().drag;
  }

  public updateDrag(drag: any): void {
    useViewerStore.getState().actions.updateDrag(drag);
  }

  // Surface Map
  public setSurfaceMap(mapJson: any): void {
    useViewerStore.getState().actions.setSurfaceMap(mapJson);
  }

  // Hover
  public updateHover(hover: any): void {
    useViewerStore.getState().actions.updateHover(hover);
  }

  // Interaction State
  public updateOperatorSelection(operatorSelection: any): void {
    useViewerStore
      .getState()
      .actions.updateOperatorSelection(operatorSelection);
  }

  public getOperatorSelection(): any {
    return useViewerStore.getState().operatorSelection;
  }

  // System
  public addLog(message: string): void {
    useViewerStore.getState().actions.addLog(message);
  }
}
