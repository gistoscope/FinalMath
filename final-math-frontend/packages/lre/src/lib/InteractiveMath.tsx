import * as katex from 'katex';
import 'katex/dist/katex.min.css';
import { useEffect, useRef } from 'react';
import { container } from 'tsyringe';
import { ClickEvents } from './lib/events/click';
import { Handlers, setupContainerEvents } from './lib/events/container.event';
import { HoverEvents } from './lib/events/hover';
import { SurfaceNode } from './lib/surface-map';

type InteractiveMathProps = {
  latex: string;
  handlers?: Handlers;
};

export const InteractiveMath = ({ latex, handlers }: InteractiveMathProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    katex.render(latex, containerRef.current, {
      output: 'html',
      displayMode: true,
      trust: (context: katex.TrustContext) => {
        return context.command === '\\htmlData';
      },
      strict: (errorCode) => {
        return errorCode === 'htmlExtension' ? 'ignore' : 'warn';
      },
    });
    return setupContainerEvents(containerRef.current, latex, {
      onClickNode: (node: SurfaceNode, e: PointerEvent) => {
        const clickEvent = container.resolve(ClickEvents);
        clickEvent.onClick(node);
        if (handlers?.onClickNode) handlers.onClickNode?.(node, e);
      },
      onClickOperator: (node: SurfaceNode, e: PointerEvent) => {
        if (handlers?.onClickOperator) handlers.onClickOperator?.(node, e);
      },
      onHover: (node: SurfaceNode, e: PointerEvent) => {
        const hoverEvents = container.resolve(HoverEvents);
        hoverEvents.onHover(node);
        if (handlers?.onHover) handlers.onHover?.(node, e);
      },
      onClickOutside: (e: PointerEvent) => {
        const hoverEvents = container.resolve(HoverEvents);
        hoverEvents.hoverOutSide();
        if (handlers?.onClickOutside) handlers.onClickOutside?.(e);
      },
      onHoverOutside: (e: PointerEvent) => {
        const hoverEvents = container.resolve(HoverEvents);
        hoverEvents.hoverOutSide();
        if (handlers?.onHoverOutside) handlers.onHoverOutside?.(e);
      },
    });
  }, [latex, handlers]);

  return <div ref={containerRef} />;
};
