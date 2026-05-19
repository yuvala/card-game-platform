import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('lobby-root')!;
createRoot(root).render(<App />);
