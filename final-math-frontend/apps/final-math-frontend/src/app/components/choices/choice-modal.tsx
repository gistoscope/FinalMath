import React from 'react';
import {
  useChoiceIsOpen,
  useChoicesActions,
} from '../../../store/useChoicesStore';
import { ChoiceList } from './choice-list';

export const ChoiceModal: React.FC = () => {
  const isOpen = useChoiceIsOpen();
  const { setIsOpen } = useChoicesActions();

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-2xl bg-white/95 p-6 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl animate-in slide-in-from-right-8 fade-in duration-300"
      role="dialog"
      aria-modal="false" // Changed to false as it's non-blocking
    >
      <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
        <h2 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Select Option
        </h2>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto pr-1">
        <ChoiceList />
      </div>
    </div>
  );
};
