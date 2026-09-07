import { create } from 'zustand';

// Valid statuses: idle, preparing, checking, fetching, buffering, generating, processing, reasoning, optimizing, finalizing, success, error
export const useOperationStore = create((set) => ({
  status: 'idle',
  operation: null, // e.g. 'store_generation', 'checkout', 'product_generation'
  step: null, // Current step ID
  steps: [], // Array of step IDs if applicable
  progress: 0, // 0-100
  message: '',
  error: null,
  estimatedRemaining: null,

  start: (config) => set({
    status: config.status || 'preparing',
    operation: config.operation,
    step: config.step || (config.steps ? config.steps[0] : null),
    steps: config.steps || [],
    progress: config.progress || 0,
    message: config.message || 'Preparing operation...',
    error: null,
    estimatedRemaining: config.estimatedRemaining || null,
  }),

  update: (updates) => set((state) => ({
    ...state,
    ...updates,
  })),

  complete: (message = 'Operation complete') => set({
    status: 'success',
    progress: 100,
    message,
    estimatedRemaining: null,
  }),

  fail: (errorMsg) => set({
    status: 'error',
    error: errorMsg,
    message: 'Operation failed',
    estimatedRemaining: null,
  }),

  cancel: (message = 'Operation cancelled') => set({
    status: 'error',
    error: message,
    message: 'Operation cancelled',
    estimatedRemaining: null,
  }),

  reset: () => set({
    status: 'idle',
    operation: null,
    step: null,
    steps: [],
    progress: 0,
    message: '',
    error: null,
    estimatedRemaining: null,
  })
}));
