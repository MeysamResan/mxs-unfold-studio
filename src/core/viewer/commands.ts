import type { ShowcaseDefinition } from '../catalog/types';
import type { ViewerAction, ViewerState } from './state';

/** Validate the complete command before dispatching any state changes. */
export function viewCommands(
  input: unknown,
  state: ViewerState,
  model: ShowcaseDefinition,
): ViewerAction[] {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Expected a view configuration.');
  const config = input as Record<string, unknown>;
  const allowed = ['partId', 'separation', 'playing', 'labels', 'reset'];
  if (Object.keys(config).some((key) => !allowed.includes(key)))
    throw new Error('Unknown view option.');
  if (
    config.partId !== undefined &&
    config.partId !== null &&
    (typeof config.partId !== 'string' || !model.parts.some((part) => part.id === config.partId))
  ) {
    throw new Error('Unknown component.');
  }
  if (
    config.separation !== undefined &&
    (typeof config.separation !== 'number' ||
      !Number.isFinite(config.separation) ||
      config.separation < 0 ||
      config.separation > 1)
  ) {
    throw new Error('Separation must be between zero and one.');
  }
  for (const key of ['playing', 'labels', 'reset']) {
    if (config[key] !== undefined && typeof config[key] !== 'boolean')
      throw new Error(`${key} must be a boolean.`);
  }
  if (config.separation !== undefined && !model.capabilities.includes('explode'))
    throw new Error('This object does not support separation.');
  if (config.playing !== undefined && !model.capabilities.includes('animation'))
    throw new Error('This object has no animation.');
  if (config.playing === true && typeof config.separation === 'number' && config.separation > 0) {
    throw new Error('Assemble the object before playing an animation.');
  }
  const actions: ViewerAction[] = [];
  if (config.reset === true) actions.push({ type: 'reset' });
  if (config.partId !== undefined)
    actions.push({ type: 'select', part: config.partId as string | null });
  if (typeof config.separation === 'number')
    actions.push({ type: 'separate', value: config.separation });
  if (typeof config.playing === 'boolean') actions.push({ type: 'play', value: config.playing });
  if (
    typeof config.labels === 'boolean' &&
    config.labels !== (config.reset === true ? false : state.labels)
  )
    actions.push({ type: 'labels' });
  return actions;
}
