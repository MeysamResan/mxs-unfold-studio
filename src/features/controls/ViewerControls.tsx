import {
  ArrowLeftRight,
  Crosshair,
  Maximize,
  Palette,
  Puzzle,
  RotateCcw,
  RotateCw,
  ScanLine,
  SlidersHorizontal,
  Tags,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import type { Dispatch } from 'react';
import { MechanicalSlider } from './MechanicalSlider';
import type { ShowcaseDefinition } from '../../core/catalog/types';
import type { ViewerAction, ViewerState } from '../../core/viewer/state';

const actionIcons = { shoot: Crosshair, reload: RotateCw, chamber: ArrowLeftRight };

export function ViewerControls({
  definition,
  state,
  dispatch,
  sound,
  onSound,
  onFullscreen,
  onSettings,
  onBackground,
  onPerform,
  onSeparationStart,
  onSeparationDetent,
}: {
  definition: ShowcaseDefinition;
  state: ViewerState;
  dispatch: Dispatch<ViewerAction>;
  sound: boolean;
  onSound: () => void;
  onFullscreen: () => void;
  onSettings: () => void;
  onBackground: () => void;
  onPerform: (id: string) => void;
  onSeparationStart?: () => void;
  onSeparationDetent?: (value: number) => void;
}) {
  return (
    <div className="controls-dock" aria-label="3D viewer controls">
      <div className="object-actions" role="group" aria-label="Object actions">
        {definition.actions?.map((action) => {
          const Icon = actionIcons[action.id as keyof typeof actionIcons] ?? Zap;
          return (
            <button
              key={action.id}
              className={`action-button ${state.actionId === action.id ? 'active' : ''}`}
              disabled={Boolean(action.unavailable || state.actionId)}
              aria-busy={state.actionId === action.id}
              aria-label={action.label}
              title={action.unavailable ?? action.label}
              onClick={() => onPerform(action.id)}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
      <div className="controls-tools" role="group" aria-label="Viewer tools">
        <button
          className={`icon-button ${state.labels ? 'active' : ''}`}
          aria-label="Labels"
          aria-pressed={state.labels}
          onClick={() => dispatch({ type: 'labels' })}
          title="Toggle labels"
        >
          <Tags size={18} aria-hidden="true" />
        </button>
        {definition.capabilities.includes('section') && (
          <button
            className={`icon-button ${state.section ? 'active' : ''}`}
            aria-label="Inside"
            aria-pressed={state.section}
            onClick={() => dispatch({ type: 'section' })}
            title="Show inside"
          >
            <ScanLine size={18} aria-hidden="true" />
          </button>
        )}
        <button
          className="icon-button"
          onClick={() => dispatch({ type: 'reset' })}
          aria-label="Reset"
          title="Reset view"
        >
          <RotateCcw size={18} aria-hidden="true" />
        </button>
        <button
          className={`icon-button ${sound ? 'active' : ''}`}
          aria-label={sound ? 'Mute sounds' : 'Enable sounds'}
          aria-pressed={sound}
          onClick={onSound}
          title={sound ? 'Mute sounds' : 'Enable sounds'}
        >
          {sound ? (
            <Volume2 size={18} aria-hidden="true" />
          ) : (
            <VolumeX size={18} aria-hidden="true" />
          )}
        </button>
        <button
          className="icon-button"
          onClick={onBackground}
          aria-label="Studio background"
          title="Studio background"
        >
          <Palette size={18} aria-hidden="true" />
        </button>
        <button
          className="icon-button"
          disabled
          aria-label="Attachments"
          title="Attachments are coming in a future update"
        >
          <Puzzle size={18} aria-hidden="true" />
        </button>
        <button
          className="icon-button"
          onClick={onSettings}
          aria-label="Viewer settings"
          title="Viewer settings"
        >
          <SlidersHorizontal size={18} aria-hidden="true" />
        </button>
        <button
          className="icon-button fullscreen-button"
          onClick={onFullscreen}
          aria-label="Toggle fullscreen"
          title="Fullscreen"
        >
          <Maximize size={18} aria-hidden="true" />
        </button>
      </div>
      {definition.capabilities.includes('explode') && (
        <MechanicalSlider
          value={Math.round(state.separation * 100)}
          onChange={(value) => dispatch({ type: 'separate', value: value / 100 })}
          onInteractionStart={onSeparationStart}
          onDetent={onSeparationDetent}
        />
      )}
    </div>
  );
}
