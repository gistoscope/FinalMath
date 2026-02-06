import React from 'react';
import { ChoiceItem } from '../../../store/useChoicesStore';

interface ChoiceProps {
  choice: ChoiceItem;
  onClick: (choice: ChoiceItem) => void;
}

export const ChoiceListItem: React.FC<ChoiceProps> = ({ choice, onClick }) => {
  return (
    <li
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-black/5 bg-white px-6 py-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-blue-500/30 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      onClick={() => onClick(choice)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick(choice);
        }
      }}
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-500 to-violet-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <span className="text-lg font-medium text-gray-800">{choice.label}</span>
    </li>
  );
};
