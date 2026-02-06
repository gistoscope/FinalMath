import { InteractiveMath } from './InteractiveMath';
import { SurfaceNode } from './lib/surface-map';
import './styles.css';

type LatexRenderingEngineProps = {
  latex: string;
  onClickOperator?: (node: SurfaceNode, e: PointerEvent) => void;
  onClickNode?: (node: SurfaceNode, e: PointerEvent) => void;
  onHover?: (node: SurfaceNode, e: PointerEvent) => void;
  onClickOutside?: (e: PointerEvent) => void;
  onHoverOutside?: (e: PointerEvent) => void;
};

export function LatexRenderingEngine(props: LatexRenderingEngineProps) {
  const {
    latex,
    onClickOperator,
    onClickNode,
    onHover,
    onClickOutside,
    onHoverOutside,
  } = props;

  return (
    <div className="w-full">
      <InteractiveMath
        latex={latex}
        handlers={{
          onClickOperator,
          onClickNode,
          onHover,
          onClickOutside,
          onHoverOutside,
        }}
      />
    </div>
  );
}

export default LatexRenderingEngine;
