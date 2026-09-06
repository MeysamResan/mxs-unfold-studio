import type { ShowcaseDefinition } from '../catalog/types';

export type Quality = 'auto' | 'high' | 'balanced';
export interface ViewerState {
  selectedPart: string | null;
  separation: number;
  playing: boolean;
  animationActive: boolean;
  section: boolean;
  labels: boolean;
  quality: Quality;
  speed: number;
  resetRevision: number;
  actionId: string | null;
  actionRevision: number;
}
export type ViewerAction =
  | { type: 'select'; part: string | null }
  | { type: 'separate'; value: number }
  | { type: 'play'; value: boolean }
  | { type: 'section' }
  | { type: 'labels' }
  | { type: 'quality'; value: Quality }
  | { type: 'speed'; value: number }
  | { type: 'reset' }
  | { type: 'perform'; id: string }
  | { type: 'action-finished'; revision: number };

export const initialViewerState: ViewerState = {
  selectedPart: null,
  separation: 0,
  playing: false,
  animationActive: false,
  section: false,
  labels: false,
  quality: 'auto',
  speed: 1,
  resetRevision: 0,
  actionId: null,
  actionRevision: 0,
};

export function reduceViewer(
  state: ViewerState,
  action: ViewerAction,
  model: ShowcaseDefinition,
): ViewerState {
  switch (action.type) {
    case 'select':
      return action.part === null || model.parts.some((part) => part.id === action.part)
        ? {
            ...state,
            selectedPart: action.part,
            ...(action.part ? { playing: false, animationActive: false, actionId: null } : {}),
          }
        : state;
    case 'separate':
      return model.capabilities.includes('explode') && Number.isFinite(action.value)
        ? {
            ...state,
            separation: Math.max(0, Math.min(1, action.value)),
            playing: false,
            animationActive: false,
            actionId: null,
          }
        : state;
    case 'play':
      return model.capabilities.includes('animation')
        ? {
            ...state,
            playing: action.value,
            actionId: null,
            animationActive: action.value || state.animationActive,
            separation: action.value ? 0 : state.separation,
          }
        : state;
    case 'perform': {
      const selected = model.actions?.find((item) => item.id === action.id);
      if (!selected?.animation || selected.unavailable || state.actionId || state.separation !== 0)
        return state;
      return {
        ...state,
        selectedPart: null,
        playing: true,
        animationActive: selected.animation.kind === 'clip',
        actionId: selected.id,
        actionRevision: state.actionRevision + 1,
      };
    }
    case 'action-finished':
      return action.revision === state.actionRevision && state.actionId
        ? { ...state, actionId: null, playing: false, animationActive: false }
        : state;
    case 'section':
      return model.capabilities.includes('section') ? { ...state, section: !state.section } : state;
    case 'labels':
      return { ...state, labels: !state.labels };
    case 'quality':
      return { ...state, quality: action.value };
    case 'speed':
      return Number.isFinite(action.value)
        ? { ...state, speed: Math.max(0.25, Math.min(2, action.value)) }
        : state;
    case 'reset':
      return {
        ...initialViewerState,
        quality: state.quality,
        resetRevision: state.resetRevision + 1,
        actionRevision: state.actionRevision + 1,
      };
  }
}
