import React from 'react';
import { BoardContext } from '../store/BoardContext';

export function useBoard() {
  const context = React.useContext(BoardContext);
  if (!context) throw new Error('useBoard must be used within BoardProvider');
  return context;
}
