import { useEffect, useLayoutEffect, useRef, type Dispatch } from 'react';
import { flushSync } from 'react-dom';
import type { ShowcaseDefinition } from '../../core/catalog/types';
import type { ViewerAction, ViewerState } from '../../core/viewer/state';
import { viewCommands } from '../../core/viewer/commands';

interface ModelContext {
  registerTool(
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ): void | Promise<void>;
}

/** Optional browser bridge. Unsupported browsers incur no registry or polling work. */
export function useViewerTools(
  model: ShowcaseDefinition,
  state: ViewerState,
  dispatch: Dispatch<ViewerAction>,
): void {
  const latest = useRef({ model, state, dispatch });
  useLayoutEffect(() => {
    latest.current = { model, state, dispatch };
  }, [model, state, dispatch]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const read = () => ({
      modelId: latest.current.model.id,
      title: latest.current.model.title,
      parts: latest.current.model.parts.map(({ id, label }) => ({ id, label })),
      capabilities: latest.current.model.capabilities,
      view: latest.current.state,
    });
    const register = (tool: Parameters<ModelContext['registerTool']>[0]) => {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {
          if (import.meta.env.DEV) console.warn('Optional viewer tool registration unavailable.');
        });
      } catch {
        if (import.meta.env.DEV) console.warn('Optional viewer tool registration unavailable.');
      }
    };
    register({
      name: 'unfold_read_view',
      description: 'Read the current object, available components, and viewer settings.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: read,
    });
    register({
      name: 'unfold_configure_view',
      description:
        'Configure the current object view using the same controls as the interface. Commits the view target; separation eases into position.',
      inputSchema: {
        type: 'object',
        properties: {
          partId: { type: ['string', 'null'] },
          separation: { type: 'number', minimum: 0, maximum: 1 },
          playing: { type: 'boolean' },
          labels: { type: 'boolean' },
          reset: { type: 'boolean' },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: (input) => {
        const actions = viewCommands(input, latest.current.state, latest.current.model);
        flushSync(() => {
          for (const action of actions) latest.current.dispatch(action);
        });
        return read();
      },
    });
    return () => lifecycle.abort();
  }, []);
}
