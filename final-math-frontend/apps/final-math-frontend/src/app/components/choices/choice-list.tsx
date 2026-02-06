import React from 'react';

import { OrchestratorStepRequest } from '@acme/math-engine';
import {
  ChoiceItem,
  useChoices,
  useChoicesActions,
} from '../../../store/useChoicesStore';
import { useStoreAction, useStoreLatex } from '../../../store/useViewerStore';
import { runV5Step, SESSION_ID } from '../../client/orchestratorV5Client';
import { ChoiceListItem } from './choice-list-item';

export const ChoiceList: React.FC = () => {
  const choices = useChoices();
  const latex = useStoreLatex();
  const { setLatex } = useStoreAction();
  const { setChoices, setIsOpen } = useChoicesActions();

  const handleChoiceClick = async (choice: ChoiceItem) => {
    const payload: OrchestratorStepRequest = {
      sessionId: SESSION_ID,
      expressionLatex: latex,
      selectionPath: choice.targetNodeId,
      preferredPrimitiveId: choice.primitiveId,
      courseId: 'default',
      userRole: 'student',
    };

    // Send the request to the backend
    const result = await runV5Step(payload);

    if (result.status === 'step-applied') {
      setLatex(result.engineResult.newExpressionLatex);
      setIsOpen(false);
      setChoices([]);
    }
  };

  if (!choices || choices.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">No choices available</div>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {choices.map((choice) => (
        <ChoiceListItem
          key={choice.id}
          choice={choice}
          onClick={handleChoiceClick}
        />
      ))}
    </ul>
  );
};
