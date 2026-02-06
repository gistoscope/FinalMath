import { LatexRenderingEngine, type SurfaceNode } from '@acme/lre';
import { useChoicesActions } from '../store/useChoicesStore';
import { useStoreAction, useStoreLatex } from '../store/useViewerStore';
import { generateV5PayloadFromNode } from './client/generatePayload';
import { runV5Step } from './client/orchestratorV5Client';
import { Actions } from './components/actions';
import Choices from './components/choices/choice';

export function App() {
  const latex = useStoreLatex();
  const { setLatex } = useStoreAction();
  const { setIsOpen, setChoices } = useChoicesActions();
  const onClickNodeHandler = async (node: SurfaceNode) => {
    try {
      const payload = generateV5PayloadFromNode(node, latex);
      const result = await runV5Step(payload);
      if (result?.choices?.length > 0) {
        setChoices(result.choices);
        setIsOpen(true);
      }
      if (result.engineResult?.newExpressionLatex) {
        setLatex(result.engineResult.newExpressionLatex);
      }
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div>
      <div className="container mx-auto mt-32">
        <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-50">
          <div className="flex-1">
            <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800">Display Map</h2>
              </div>
              <div className="p-4">
                <LatexRenderingEngine
                  latex={latex}
                  onClickOperator={onClickNodeHandler}
                  onClickNode={onClickNodeHandler}
                  onClickOutside={(e) => {
                    console.log(e);
                  }}
                />
              </div>
            </div>
          </div>

          <Actions />
        </div>
      </div>
      <Choices />
    </div>
  );
}

export default App;
