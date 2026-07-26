# Labo photo / Carnet de Bord

Carnet de bord numérique pour la photographie argentique : développement de films et tirage en chambre noire. Application 100% locale — aucune donnée n'est envoyée à un serveur, tout est stocké dans le navigateur (IndexedDB), avec une fonction de sauvegarde/restauration complète pour changer d'appareil sans rien perdre.

## Fonctionnalités

- Suivi des développements de films (chimie, agitation, négatifs liés)
- Suivi des tirages en chambre noire : matériel, papier, chimie, exposition (bande test ou sonde ZoneMaster)
- Dessin des zones de dodge & burn directement sur la photo, avec séquence d'action calculée (temps réels, grade, ordre dodge → burn)
- Split grading (grade doux / grade dur) en deux passes indépendantes
- Suivi des stocks de chimie (capacité disponible, épuisement)
- Calculateur de dilution pour bain d'arrêt au vinaigre (degré du stock → dilution pour un bain à 2%)
- Export PDF d'un tirage (fiche complète, mise en page imprimable pour la chambre noire)
- Sauvegarde et restauration complètes des données (JSON, changement d'appareil)
- Installable en PWA et fonctionne hors ligne (utile en chambre noire, sans wifi)

## Stack technique

React + TypeScript + Vite, IndexedDB (via `idb`), `vite-plugin-pwa`. Déployé sur Netlify.

## Développement

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview   # prévisualiser le build de production
```

## Lint

```bash
npm run lint
```
