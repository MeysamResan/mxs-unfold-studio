import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { ArrowUpRight, Box, Info, Mouse, X } from 'lucide-react';
import { catalog, findShowcase } from '../content/catalog';
import { getCatalogCategories } from '../content/categories';
import {
  initialViewerState,
  reduceViewer,
  type Quality,
  type ViewerAction,
} from '../core/viewer/state';
import { AudioEngine } from '../core/audio/audio-engine';
import { CatalogSidebar } from '../features/catalog/CatalogSidebar';
import { ViewerControls } from '../features/controls/ViewerControls';
import { BackgroundOptions, useStudioBackground } from '../features/controls/BackgroundOptions';
import { projectLinks } from '../content/project';
import { GitHubIcon } from '../shared/GitHubIcon';
import { Inspector } from '../features/inspector/Inspector';
import { Modal } from '../shared/Modal';
import { ScrollArea } from '../shared/ScrollArea';
import { useMediaQuery } from '../shared/use-media-query';
import { PanelControls } from '../features/layout/PanelControls';
import { ThemeToggle } from '../features/theme/ThemeToggle';
import { useTheme } from '../features/theme/use-theme';
import { useViewerTools } from '../features/integrations/use-viewer-tools';

const categories = getCatalogCategories(catalog);
const ViewerCanvas = lazy(() => import('../features/viewer/ViewerCanvas'));
type Dialog = 'catalog' | 'information' | 'about' | 'settings' | 'background' | 'assembly' | null;

export function App() {
  const [modelId, setModelId] = useState(catalog[0].id);
  const definition = findShowcase(modelId) ?? catalog[0];
  const [state, rawDispatch] = useReducer(
    (current: typeof initialViewerState, action: ViewerAction) =>
      reduceViewer(current, action, definition),
    initialViewerState,
  );
  const [dialog, setDialog] = useState<Dialog>(null);
  const [sound, setSound] = useState(true);
  const [background, setBackground] = useStudioBackground();
  const audioAllowed = useRef(true);
  audioAllowed.current = dialog === null;
  const soundEnabled = useRef(true);
  const mobilePanels = useMediaQuery('(max-width: 760px)');
  const [leftVisible, setLeftVisible] = useState(true);
  const [bottomVisible, setBottomVisible] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const [rightVisible, setRightVisible] = useState(true);
  const [notice, setNotice] = useState('');
  const audio = useRef<AudioEngine | null>(null);
  const soundReady = useRef<Promise<void> | null>(null);
  const studio = useRef<HTMLElement>(null);

  const dispatch = rawDispatch;
  useViewerTools(definition, state, dispatch);
  const onSelect = useCallback(
    (part: string | null) => {
      dispatch({ type: 'select', part });
    },
    [dispatch],
  );

  useEffect(() => {
    const engine = new AudioEngine();
    audio.current = engine;
    const onVisibility = () => {
      if (document.hidden) engine.stop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      void engine.dispose();
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const toggleSound = async () => {
    const next = !soundEnabled.current;
    soundEnabled.current = next;
    setSound(next);
    try {
      await audio.current?.setEnabled(next);
    } catch {
      soundEnabled.current = false;
      setSound(false);
      setNotice('Sound is unavailable in this browser.');
    }
  };
  const startSeparationSound = useCallback(() => {
    if (!soundEnabled.current) return;
    soundReady.current =
      audio.current?.setEnabled(true).catch(() => {
        soundEnabled.current = false;
        setSound(false);
        setNotice('Sound is unavailable in this browser.');
      }) ?? null;
  }, []);
  const playSeparationDetent = useCallback((value: number) => {
    const engine = audio.current;
    void soundReady.current?.then(() => {
      if (
        soundEnabled.current &&
        audioAllowed.current &&
        !document.hidden &&
        audio.current === engine
      )
        engine?.detent(value);
    });
  }, []);

  useEffect(() => {
    if (dialog) audio.current?.stop();
  }, [dialog]);

  const performAction = (id: string) => {
    const action = definition.actions?.find((item) => item.id === id);
    if (!action?.animation || action.unavailable || state.actionId) return;
    if (state.separation !== 0) {
      setNotice('');
      setDialog('assembly');
      return;
    }
    setNotice('');
    startSeparationSound();
    dispatch({ type: 'perform', id });
  };
  const actionStarted = useCallback(
    (id: string) => {
      const cue = definition.actions?.find((item) => item.id === id)?.sound;
      const engine = audio.current;
      void soundReady.current?.then(() => {
        if (
          cue &&
          soundEnabled.current &&
          audioAllowed.current &&
          !document.hidden &&
          engine === audio.current
        )
          engine?.firearm(cue);
      });
    },
    [definition.actions],
  );
  const actionFinished = useCallback((revision: number) => {
    rawDispatch({ type: 'action-finished', revision });
  }, []);

  useEffect(() => {
    if (!mobilePanels && (dialog === 'catalog' || dialog === 'information')) setDialog(null);
  }, [mobilePanels, dialog]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await studio.current?.requestFullscreen();
    } catch {
      setNotice('Fullscreen is unavailable in this browser.');
    }
  };

  const openModel = useCallback(
    (id: string) => {
      setModelId(id);
      dispatch({ type: 'reset' });
      setDialog(null);
    },
    [dispatch],
  );

  return (
    <ScrollArea className="page-scroll" aria-label="Unfold Studio page">
      <div className="app-shell">
        <a className="skip-link" href="#viewer-controls" onClick={() => setBottomVisible(true)}>
          Skip to viewer controls
        </a>
        <header className="app-header">
          <a
            className="brand"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              dispatch({ type: 'reset' });
            }}
            aria-label="Unfold Studio home"
          >
            <span className="brand-mark">
              <Box size={20} strokeWidth={1.4} />
            </span>
            <span>Unfold Studio</span>
          </a>

          <nav className="header-nav" aria-label="Main navigation">
            <span className="creator-signature">by MaXoS</span>
            <PanelControls
              leftTarget={mobilePanels ? undefined : 'collection-panel'}
              rightTarget={mobilePanels ? undefined : 'information-panel'}
              bottomOpen={bottomVisible}
              onBottom={() => setBottomVisible((visible) => !visible)}
              leftOpen={mobilePanels ? dialog === 'catalog' : leftVisible}
              rightOpen={mobilePanels ? dialog === 'information' : rightVisible}
              onLeft={() =>
                mobilePanels
                  ? setDialog(dialog === 'catalog' ? null : 'catalog')
                  : setLeftVisible((visible) => !visible)
              }
              onRight={() =>
                mobilePanels
                  ? setDialog(dialog === 'information' ? null : 'information')
                  : setRightVisible((visible) => !visible)
              }
            />
            {projectLinks.github ? (
              <a
                className="icon-button"
                href={projectLinks.github}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub repository"
                title="GitHub repository"
              >
                <GitHubIcon />
              </a>
            ) : (
              <button
                className="icon-button github-button"
                disabled
                aria-label="GitHub repository"
                title="GitHub repository link will be added soon"
              >
                <GitHubIcon />
              </button>
            )}
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <button
              className="icon-button"
              onClick={() => setDialog('about')}
              aria-label="About Unfold Studio"
              title="About Unfold Studio"
            >
              <Info size={20} strokeWidth={1.5} />
            </button>
          </nav>
        </header>

        <main
          ref={studio}
          className={`studio-layout ${leftVisible ? '' : 'left-panel-hidden'} ${rightVisible ? '' : 'right-panel-hidden'}`}
        >
          <div
            id="collection-panel"
            className="studio-panel left-panel"
            inert={!leftVisible || mobilePanels}
            aria-hidden={!leftVisible || mobilePanels}
          >
            <CatalogSidebar
              categories={categories}
              key={definition.id}
              items={catalog}
              activeId={definition.id}
              onOpen={openModel}
            />
          </div>
          <section
            className="workspace"
            aria-label="Object studio"
            style={
              background ? ({ '--studio-background': background } as CSSProperties) : undefined
            }
          >
            <div className="stage">
              <div className="stage-floor" aria-hidden="true" />
              <Suspense
                fallback={
                  <div className="viewer-message">
                    <div className="loader-mark" />
                    <p>Opening the studio…</p>
                  </div>
                }
              >
                <ViewerCanvas
                  obscured={dialog !== null}
                  key={definition.id}
                  definition={definition}
                  state={state}
                  onSelect={onSelect}
                  onActionStart={actionStarted}
                  onActionEnd={actionFinished}
                />
              </Suspense>
              <div className="stage-corner top-left" aria-hidden="true" />
              <div className="stage-corner top-right" aria-hidden="true" />
              <div className="stage-caption">
                <span>
                  <Mouse size={14} /> Drag to rotate <i>·</i> Scroll to zoom
                </span>
              </div>
            </div>
            <div
              className={`controller-region ${bottomVisible ? '' : 'is-hidden'}`}
              inert={!bottomVisible}
              aria-hidden={!bottomVisible}
            >
              <div className="controller-content">
                <div className="dock-region" id="viewer-controls">
                  <ViewerControls
                    definition={definition}
                    state={state}
                    dispatch={dispatch}
                    sound={sound}
                    onSeparationStart={startSeparationSound}
                    onSeparationDetent={playSeparationDetent}
                    onSound={() => void toggleSound()}
                    onFullscreen={() => void toggleFullscreen()}
                    onSettings={() => setDialog('settings')}
                    onBackground={() => setDialog('background')}
                    onPerform={performAction}
                  />
                </div>
              </div>
            </div>
          </section>
          {!mobilePanels && (
            <div
              id="information-panel"
              className="studio-panel right-panel"
              inert={!rightVisible}
              aria-hidden={!rightVisible}
            >
              <Inspector
                definition={definition}
                selectedPart={state.selectedPart}
                onSelect={onSelect}
              />
            </div>
          )}
        </main>

        {dialog === 'assembly' && (
          <Modal title="Nice try, mate!" onClose={() => setDialog(null)} dismissLabel="Got it">
            <p className="modal-intro">
              Assemble the gun first — it's feeling a little scattered. Set separation to 0% and
              give it another go.
            </p>
          </Modal>
        )}
        {dialog === 'catalog' && (
          <Modal title="Browse collection" onClose={() => setDialog(null)}>
            <CatalogSidebar
              categories={categories}
              embedded
              items={catalog}
              activeId={definition.id}
              onOpen={openModel}
            />
          </Modal>
        )}
        {dialog === 'information' && (
          <Modal title="Object information" onClose={() => setDialog(null)}>
            <div className="embedded-information">
              <Inspector
                definition={definition}
                selectedPart={state.selectedPart}
                onSelect={onSelect}
              />
            </div>
          </Modal>
        )}
        {dialog === 'about' && (
          <Modal title="An inside perspective." onClose={() => setDialog(null)}>
            <div className="about-copy">
              <span className="about-logo">Unfold Studio</span>
              <p>
                A growing collection of objects, explored in three dimensions. Made for curiosity,
                by <strong>MaXoS</strong>.
              </p>
              <p>
                Rotate an object. Separate its visual groups. Discover details that a single
                perspective can hide.
              </p>
              <div className="about-note">
                <Info size={18} />
                <p>
                  This first study uses a visual artwork by {definition.credits.author}. Its
                  presentation groups are arranged for exploration. They are not a technical
                  disassembly sequence.
                </p>
              </div>
              <a
                className="text-link"
                href={definition.credits.url}
                target="_blank"
                rel="noreferrer"
              >
                View the original CC0 artwork <ArrowUpRight size={16} />
              </a>
            </div>
          </Modal>
        )}
        {dialog === 'background' && (
          <Modal title="Studio background" onClose={() => setDialog(null)}>
            <BackgroundOptions value={background} onChange={setBackground} />
          </Modal>
        )}
        {dialog === 'settings' && (
          <Modal title="Make it your view." onClose={() => setDialog(null)}>
            <div className="settings-section">
              <h3>Display quality</h3>
              <p>Balance detail and smoothness for your device.</p>
              <div className="quality-options">
                {(
                  [
                    ['auto', 'Automatic', 'Adapts resolution to rendering performance'],
                    ['high', 'High', 'Sharper detail on larger displays'],
                    ['balanced', 'Balanced', 'Lower resolution, lighter rendering'],
                  ] as const
                ).map(([value, label, help]) => (
                  <label key={value} className={state.quality === value ? 'checked' : ''}>
                    <input
                      type="radio"
                      name="quality"
                      value={value}
                      checked={state.quality === value}
                      onChange={() => dispatch({ type: 'quality', value: value as Quality })}
                    />
                    <span>
                      <strong>{label}</strong>
                      <small>{help}</small>
                    </span>
                  </label>
                ))}
              </div>
              <h3>Motion speed</h3>
              <div className="speed-options">
                {[0.5, 1, 1.5].map((speed) => (
                  <button
                    key={speed}
                    className={state.speed === speed ? 'active' : ''}
                    aria-pressed={state.speed === speed}
                    onClick={() => dispatch({ type: 'speed', value: speed })}
                  >
                    {speed}×
                  </button>
                ))}
              </div>
            </div>
          </Modal>
        )}
        {notice && (
          <div className="toast" role="status">
            {notice}
            <button onClick={() => setNotice('')} aria-label="Dismiss notification">
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
