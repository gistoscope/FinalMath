/**
 * Orchestrator Core Module Index
 *
 * Central coordinator for step execution.
 */

import { container } from 'tsyringe';
import { HistoryProvider } from '../interfaces';
import { StepOrchestrator } from './step.orchestrator';

export * from './orchestrator.types';
export * from './step.orchestrator';

export function createStepOrchestrator(historyProvider: HistoryProvider) {
  container.register('HistoryProvider', { useValue: historyProvider });
  return container.resolve(StepOrchestrator);
}
