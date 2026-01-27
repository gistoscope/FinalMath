import { useCallback, type RefObject } from "react";
import { Tokens } from "../di/tokens";
import type { InteractionService } from "../domain/interaction/InteractionService";
import { useService } from "../useService";

export function useInteraction(containerRef: RefObject<HTMLDivElement | null>) {
  const interaction = useService<InteractionService>(
    Tokens.IInteractionService,
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      interaction.handlePointerDown(e.clientX, e.clientY);
    },
    [interaction],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      interaction.handlePointerMove(
        e.clientX,
        e.clientY,
        container,
        e.target as HTMLElement,
      );
    },
    [interaction, containerRef],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      interaction.handlePointerUp(
        e.clientX,
        e.clientY,
        container,
        e.ctrlKey,
        e.target as HTMLElement,
      );
    },
    [interaction, containerRef],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
