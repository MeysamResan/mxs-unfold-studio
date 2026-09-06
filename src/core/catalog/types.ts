export type Vec3 = readonly [number, number, number];
export type Capability = 'explode' | 'animation' | 'section' | 'audio';

export interface CatalogCategory {
  readonly label: string;
  readonly subcategories: readonly string[];
}

export interface ShowcasePart {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  /** Asset node names are content, never hard-coded in the viewer. */
  readonly nodes: readonly string[];
  readonly separation: Vec3;
}

export interface ShowcaseAction {
  readonly id: string;
  readonly label: string;
  readonly animation?:
    | { readonly kind: 'clip'; readonly clip: string; readonly speed?: number }
    | { readonly kind: 'recoil'; readonly duration: number; readonly offset: Vec3 };
  readonly sound?: 'shot' | 'cycle';
  readonly unavailable?: string;
}

export interface ShowcaseDefinition {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly category: string;
  readonly subcategory?: string;
  readonly thumbnail?: {
    readonly path: string;
    readonly alt: string;
    readonly width: number;
    readonly height: number;
  };
  readonly wikipedia?: {
    readonly title: string;
    readonly url: string;
  };
  readonly description: string;
  readonly asset: { readonly path: string; readonly bytes: number };
  readonly capabilities: readonly Capability[];
  readonly actions?: readonly ShowcaseAction[];
  readonly parts: readonly ShowcasePart[];
  readonly camera: { readonly position: Vec3; readonly target: Vec3; readonly fit: number };
  readonly presentation: { readonly rotation: Vec3; readonly extent: number };
  readonly animation?: {
    readonly clip: string;
    readonly label: string;
    readonly speed?: number;
    readonly displayNodes?: readonly string[];
  };
  readonly sectionNodes?: readonly string[];
  readonly credits: { readonly author: string; readonly license: string; readonly url: string };
}

export function defineShowcase(definition: ShowcaseDefinition): ShowcaseDefinition {
  const ids = definition.parts.map((part) => part.id);
  if (new Set(ids).size !== ids.length) throw new Error('Part identifiers must be unique.');
  if (!definition.id || !definition.asset.path)
    throw new Error('A showcase needs an ID and an asset.');
  if (definition.capabilities.includes('animation') && !definition.animation) {
    throw new Error('Animation capability requires a clip definition.');
  }
  if (definition.capabilities.includes('section') && !definition.sectionNodes?.length) {
    throw new Error('Section capability requires modeled surfaces to reveal.');
  }
  return definition;
}
