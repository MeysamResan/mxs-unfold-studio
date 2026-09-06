import { defineShowcase } from '../core/catalog/types';
import manifest from './asset-manifest.json';

export const lightning = defineShowcase({
  id: 'lightning',
  title: 'Lightning',
  subtitle: 'Pump-action rifle',
  category: 'Firearms',
  subcategory: 'Rifles',
  description:
    'A textured 3D study inspired by the Colt Lightning, with six selectable visual groups and an animated motion study.',
  wikipedia: {
    title: 'Colt Lightning rifle',
    url: 'https://en.wikipedia.org/wiki/Colt_Lightning_rifle',
  },
  asset: manifest.lightning,
  thumbnail: {
    path: '/media/thumbnails/lightning-f78c68582d73.webp',
    alt: 'The Lightning rifle in profile, showing its wooden stock and polished metal surfaces',
    width: 960,
    height: 540,
  },
  capabilities: ['explode', 'animation'],
  actions: [
    {
      id: 'shoot',
      label: 'Shoot',
      animation: { kind: 'recoil', duration: 0.32, offset: [-0.14, 0.025, 0] },
      sound: 'shot',
    },
    {
      id: 'reload',
      label: 'Reload',
      unavailable: 'A reload animation is not available for this model yet.',
    },
    {
      id: 'chamber',
      label: 'Chamber',
      animation: { kind: 'clip', clip: 'Pump', speed: 0.8 },
      sound: 'cycle',
    },
  ],
  camera: { position: [3.4, 1.9, 9], target: [0, 0, 0], fit: 7.8 },
  presentation: { rotation: [0, Math.PI / 2, -0.045], extent: 6.8 },
  animation: { clip: 'Pump', label: 'Motion study', speed: 0.45, displayNodes: ['animated-model'] },
  credits: {
    author: 'LonesomeDucky',
    license: 'CC0',
    url: 'https://opengameart.org/content/lightning-pump-action-rifle',
  },
  parts: [
    {
      id: 'stock',
      label: 'Wooden stock',
      nodes: ['part-stock'],
      separation: [0, 0.04, -0.19],
      description:
        'The warm timber surface gives the rear silhouette its distinctive shape. Rotate the view to explore the grain and curved contours.',
    },
    {
      id: 'body',
      label: 'Central body',
      nodes: ['part-body'],
      separation: [0.1, 0.03, 0],
      description:
        'The central metal surfaces connect the visual composition. Contrast the satin finish with the warmer wooden elements.',
    },
    {
      id: 'barrel',
      label: 'Front assembly',
      nodes: ['part-barrel'],
      separation: [0, 0.09, 0.2],
      description:
        'Long parallel forms define the front profile. The restrained surface detail catches the studio light as you move around the model.',
    },
    {
      id: 'fore-end',
      label: 'Wooden fore-end',
      nodes: ['part-fore-end'],
      separation: [0.06, -0.15, 0.02],
      description:
        'Repeated grooves break up the wooden surface. This visual group is featured in the model artist’s motion study.',
    },
    {
      id: 'details',
      label: 'Moving details',
      nodes: ['part-details'],
      separation: [-0.12, 0.21, -0.02],
      description:
        'A collection of small animated details from the original artwork. Isolate their shape by separating the model.',
    },
    {
      id: 'guard',
      label: 'Lower details',
      nodes: ['part-guard'],
      separation: [0, -0.2, -0.06],
      description:
        'The small curved forms beneath the central body. Select this group to distinguish it from the surrounding surfaces.',
    },
  ],
});
