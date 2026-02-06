import { InteractiveMath } from './InteractiveMath';
import { buildASTFromLatex } from './lib/ast-parser';
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
  const ast = buildASTFromLatex(latex);
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
      <pre>{JSON.stringify(ast, null, 2)}</pre>
    </div>
  );
}

export default LatexRenderingEngine;
