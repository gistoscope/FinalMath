// features/events/container-events.js
// Container event handlers (pointer events, drag selection)
import { container as tContainer } from 'tsyringe';
import { SurfaceMapService, SurfaceNode } from '../surface-map';
/**
 * Find node by element using hit testing
 * @param {HTMLElement} containerElement - Target element
 * @param {PointerEvent} e - Pointer event
 * @returns {SurfaceNode |null} Surface node or null
 */
export function findNodeByElement(
  containerElement: HTMLElement,
  e: PointerEvent,
  latex: string,
): SurfaceNode | null {
  const surfaceMapService = tContainer.resolve(SurfaceMapService);
  surfaceMapService.buildMap(containerElement, latex);

  return surfaceMapService.hitTest(e.clientX, e.clientY);
}

export interface Handlers {
  onClickOperator?: (node: SurfaceNode, e: PointerEvent) => void;
  onClickNode?: (node: SurfaceNode, e: PointerEvent) => void;
  onHover?: (node: SurfaceNode, e: PointerEvent) => void;
  onClickOutside?: (e: PointerEvent) => void;
  onHoverOutside?: (e: PointerEvent) => void;
}

/**
 * Setup container event handlers
 * @param {HTMLElement} container - Formula container
 */
export function setupContainerEvents(
  container: HTMLDivElement,
  latex: string,
  handlers?: Handlers,
) {
  if (!container) return () => undefined;
  console.log(latex);
  const onHover = (e: PointerEvent) => {
    const node = findNodeByElement(container, e, latex);
    if (node) handlers?.onHover?.(node, e);
    if (!node) handlers?.onHoverOutside?.(e);
  };

  const onClick = (e: PointerEvent) => {
    if (e.button !== 0) return;

    const node = findNodeByElement(container, e, latex);

    if (node) {
      if (['BinaryOp', 'MinusBinary'].includes(node.kind)) {
        handlers?.onClickOperator?.(node, e);
      } else {
        handlers?.onClickNode?.(node, e);
      }
    }
    if (!node) handlers?.onClickOutside?.(e);
  };

  // Hover
  container.addEventListener('pointermove', onHover);

  // Click
  container.addEventListener('pointerup', onClick);

  return () => {
    container.removeEventListener('pointermove', onHover);
    container.removeEventListener('pointerup', onClick);
  };
}
