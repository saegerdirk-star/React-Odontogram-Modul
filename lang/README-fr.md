# 🦷 React Advanced Odontogram

[![Download](https://img.shields.io/badge/Download-React--Odontogram--Modul-blue?style=for-the-badge&logo=github)](https://github.com/ZoliQua/React-Odontogram-Modul/releases)
[![Version](https://img.shields.io/badge/version-2.4.0-green?style=for-the-badge)](https://github.com/ZoliQua/React-Odontogram-Modul)
[![npm](https://img.shields.io/npm/v/react-advanced-odontogram?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/react-advanced-odontogram)
[![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)](https://github.com/ZoliQua/React-Odontogram-Modul/blob/main/LICENSE)
[![DOI](../src/assets/zenodo.21156787.svg)](https://doi.org/10.5281/zenodo.21156787)

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

---

> 🌐 **Langues :**  🇬🇧 [English](README-en.md) | 🇪🇸 [Español](README-es.md) | 🇩🇪 [Deutsch](README-de.md) | 🇭🇺 [Magyar](README-hu.md) | 🇮🇹 [Italiano](README-it.md) | 🇸🇰 [Slovenčina](README-sk.md) | 🇵🇱 [Polski](README-pl.md) | 🇷🇺 [Русский](README-ru.md) | 🇧🇷 [Português (BR)](README-pt-br.md) | 🇸🇦 [العربية](README-ar.md) | 🇨🇳 [简体中文](README-zh.md) | 🇫🇷 [Français](README-fr.md)

---

## 🇫🇷 Français

### 📋 Aperçu général
Ce projet est un éditeur d'odontogramme dentaire interactif basé sur un navigateur Web, conçu pour une saisie rapide du schéma dentaire avec une interface claire. Il génère des modèles de dents SVG superposés pour représenter les restaurations, les caries, le statut endodontique, la mobilité et d'autres détails cliniques, tout en offrant la sélection multiple, des filtres de sélection et des préréglages d'état prédéfinis.

---
![Aperçu du module odontogramme en français](screenshot_en_odontogram.png)

🔗 **URL de démonstration :** https://react-odontogram-modul.vercel.app/

---

### 📦 Utilisation comme paquet npm

L'odontogramme est fourni sous forme de bibliothèque de composants React autonome sur npm :
[`react-advanced-odontogram`](https://www.npmjs.com/package/react-advanced-odontogram).

#### Prérequis
- **React 18 ou 19** (déclaré comme dépendance de pair).
- Un **bundler** prenant en charge le champ `exports` et ESM : Vite, webpack 5, Next.js, Rollup, esbuild, Parcel. Le paquet est **ESM uniquement**.
- Node **≥ 18** pour les outils de développement.

#### Installation

```bash
npm install react-advanced-odontogram react react-dom
```

#### Utilisation de base

Rendrez `OdontogramShell` et importez la feuille de style **une seule fois** n'importe où dans votre application :

```tsx
import { OdontogramShell } from "react-advanced-odontogram";
import "react-advanced-odontogram/style.css";

export function Chart() {
  return (
    <OdontogramShell
      language="fr"          // hu | en | de | es | it | sk | pl | ru | pt-br | ar | zh | fr
      numberingSystem="FDI"  // FDI | Universal | Palmer
      darkMode={false}
    />
  );
}
```

#### Props du composant

`OdontogramShell` est un composant contrôlé. Les props les plus courantes sont :

| Prop | Type | Par défaut | Description |
|------|------|---------|-------------|
| `language` | `Language` | `"hu"` | Langue de l'interface (`hu`/`en`/`de`/`es`/`it`/`sk`/`pl`/`ru`/`pt-br`/`ar`/`zh`/`fr`). |
| `numberingSystem` | `"FDI" \| "Universal" \| "Palmer"` | `"FDI"` | Système de numérotation dentaire. |
| `darkMode` | `boolean` | `false` | Activation du mode sombre. |
| `readOnly` | `boolean` | `false` | Désactive toute modification (lecture seule). |
| `themeConfig` | `OdontogramThemeConfig` | — | Surcharge des variables CSS du thème (`--odon-*`). |
| `plugins` | `OdontogramPlugin[]` | — | Enregistrement de plugins personnalisés d'état / calques. |
| `enableNotes` | `boolean` | `false` | Active les notes par dent. |
| `enableIcdas` | `boolean` | `false` | Active le système d'évaluation des caries ICDAS II. |
| `onLanguageChange` / `onNumberingChange` / `onDarkModeChange` | `(value) => void` | — | Déclenché lorsque l'utilisateur modifie un paramètre dans l'UI. |

#### API publique (exports nommés)

`OdontogramShell` est à la fois l'exportation par défaut et une exportation nommée. L'API d'état impératif, le composant `PerioChart` autonome, la visite guidée et tous les types publics sont exportés depuis le même point d'entrée :

```ts
import {
  OdontogramShell,           // également l'export par défaut
  PerioChart,                // composant de bilan parodontal autonome
  getOdontogramSummary,
  getToothStateSummary,
  onStateChange,             // s'abonner aux changements d'état
  exportFhir,                // bundle HL7 FHIR R4
  exportSvg, exportImage,    // exportation vectorielle / image du schéma
  setImportFormat,
  setReadOnly, getReadOnly,
  clearSelection,
  registerPlugins, setPluginState, getPluginState,
  startIntroTour,            // lancer la visite guidée
} from "react-advanced-odontogram";
```

#### Utilisation avec Next.js (App Router)

Le composant est côté client uniquement (lit le DOM au montage) :

```tsx
"use client";
import { OdontogramShell } from "react-advanced-odontogram";
import "react-advanced-odontogram/style.css";

export default function OdontogramClient() {
  return <OdontogramShell language="fr" numberingSystem="FDI" />;
}
```

---

### 🔗 Intégration contrôlée

**Le document du domaine de l'interface (depuis 2.3.0) :**

L'état clinique du composant est un **document du domaine de l'interface** : le même JSON
versionné qu'`exportStatus()` écrit et qu'`importStatus()` lit. C'est ce document — et non
FHIR — que l'état React conserve et que l'application hôte possède.

Reliez une instance à une **session** isolée pour l'initialiser et l'observer, et pour que
deux odontogrammes montés restent indépendants :

```tsx
import App, {
  createOdontogramSession,
  type OdontogramDocument, type OdontogramSession,
} from "./App";

const upper: OdontogramSession = createOdontogramSession(savedUpperDocument);
const lower: OdontogramSession = createOdontogramSession(savedLowerDocument);

<App session={upper} onDocumentChange={(doc: OdontogramDocument) => save("upper", doc)} />
<App session={lower} onDocumentChange={(doc: OdontogramDocument) => save("lower", doc)} />
```

- `session.getDocument()` / `setDocument(doc)` / `subscribe(listener)` constitue tout le
  contrat ; `createOdontogramSession(initial?)` en crée une.
- Une simple prop `document` à la place de `session` fait créer à l'instance une session
  privée initialisée à partir de ce document.
- N'en passer **aucune des deux** conserve le comportement autonome historique : le
  composant s'exécute sur la session par défaut du processus
  (`getDefaultOdontogramSession()`) et tous les points d'entrée du module s'y appliquent
  exactement comme avant. **Aucune migration n'est nécessaire.**
- Une seule session est *active* dans le moteur DOM à la fois (c'est un moteur global
  unique lié à une grille dentaire) ; les autres conservent leur propre document et restent
  entièrement lisibles et modifiables via leur API de session.

**Dialectes FHIR — une projection pure et facultative :**

La conversion FHIR est un adaptateur pur au-dessus du document : pas de DOM, pas de réseau,
pas d'horloge système, pas d'aléatoire, et aucune préoccupation de transport,
d'authentification ou de persistance à l'intérieur du composant.

```ts
import { buildFhirBundle, parseFhirBundle, buildDentalDeBundle } from "./App";

const legacy = buildFhirBundle(session.getDocument());

const canonical = buildFhirBundle(session.getDocument(), {
  dialect: "dental-de", subject: "Patient/123", effectiveDateTime: "2026-08-08",
});

const { bundle, report } = buildDentalDeBundle(session.getDocument(), {
  effectiveDateTime: "2026-08-08",
});
```

Le dialecte `dental-de` émet `OdontogramObservationDE`, `CariesObservationDE` et
`DentalFindingDE` avec les tranches de composants d'`OdontogramComponentCS`, l'identité
dentaire FDI (`ToothIdentificationFDICS`), les scores ICDAS (`ICDASCariesScoreCS`) et
l'extension répétable `ToothSurfacesExt` sur `FDI-surface` de HL7. Le codage des faces
dépend de la dent : la face de mastication est `I` (incisive) sur une dent antérieure et
`O` (occlusale) sur une postérieure ; à l'import, `I` revient à la clé `occlusal` du moteur,
`V` à `buccal`, et les codes combinés `MO`/`DO`/`DI`/`MOD` sont scindés en leurs membres.

Là où l'IG ne définit aucune valeur codée, l'adaptateur utilise `CodeableConcept.text` sous
la liaison **extensible** correspondante — jamais un code inventé — et là où une liaison
**required** n'a pas de concept équivalent, il n'émet rien. Les deux cas figurent dans
`report.textFallback` et `report.unmapped`, avec la dent, le champ, la valeur préservée et
la raison, de sorte que rien ne se dégrade en silence. La valeur elle-même reste toujours
dans le document du domaine de l'interface et survit à l'aller-retour JSON.

`parseFhirBundle` lit **les deux** dialectes, y compris un bundle qui les mélange, si bien
que les bundles déjà exportés continuent de s'importer sans changement.
**Examens datés, statut d'évaluation et relevé péri-implantaire (à partir de 2.4.0) :**

Un cas parodontal est réexaminé pendant des années : un document peut désormais porter
l'identité propre de l'examen et une archive des examens antérieurs :

```ts
setExaminationContext({
  id: "exam-2026-06-30", subject: "Patient/123", effectiveDateTime: "2026-06-30",
  performer: "Practitioner/dr-mueller", encounter: "Encounter/9912",
});

captureExamination({ effectiveDateTime: "2026-06-30" });
listExaminations();
getExamination(id);
loadExamination(id);
startExamination({ effectiveDateTime: "2027-01-15" });
```

- Chaque examen archivé est un **instantané indépendant** des relevés de la bouche entière et du
  contexte du cas au moment de la capture ; les modifications ultérieures n'y reviennent jamais,
  et capturer de nouveau enregistre un examen de suivi au lieu d'écraser la ligne de base dont
  dépend l'évolution.
- Statut et plan gardent le sens **actuel face à proposé au sein d'un même examen** : le plan
  n'est jamais un historique et ne fait jamais partie d'un instantané.
- Chaque champ d'identité est une chaîne opaque appartenant à l'application hôte, que le composant
  stocke et restitue sans jamais l'interpréter. Les documents antérieurs à la version de charge
  2.21 n'en contiennent aucun et se chargent inchangés.

Le relevé parodontal enregistre des constats, pas l'acte de regarder : « sondé, sans saignement »
et « personne n'a sondé » se ressemblaient. Chaque axe concerné (PD, GM, BOP, suppuration,
mobilité, furcation, plaque, PI, GI, mPI, mBI, KG) peut maintenant le dire :

```ts
setAssessmentStatus(16, "bop", "MB", "assessed");
setAssessmentStatus(16, "pd", "DB", "unmeasurable");
getAssessmentStatus(16, "mpi", "buccal");
perioAxisApplies(16, "gm");
perioAxisApplies(11, "gm");
```

« Non applicable » se déduit de ce que la dent est réellement, et une mesure réelle l'emporte
toujours sur une lacune enregistrée. À l'export, une valeur indisponible devient le
`dataAbsentReason` propre à FHIR — jamais un code clinique inventé — et un constat normal devient
un `false` explicite ou le grade `0`.

La carte parodontale de la bouche entière relève désormais aussi la **suppuration** par site, et
une colonne d'implant prend en charge l'examen péri-implantaire : profondeur de sondage en six
sites, saignement, suppuration, mobilité de l'implant et largeur de muqueuse kératinisée. Seuls y
restent inactifs les axes qui exigent la jonction émail-cément (marge gingivale et le CAL qui en
découle) et les indices de plaque de la dent naturelle — mPI et mBI en sont les équivalents
péri-implantaires.
### ✨ Fonctionnalités clés
- 🖱️ Sélection rapide et multi-sélection (CMD/CTRL + clic)
- 🦷 Types de dents : permanente, temporaire (lactéale), implant, sous-gingivale, absente
- 👑 Restaurations par type × matériau : couronne / inlay / onlay / facette / pont en e.max, or, gradia, zircone, métal, céramo-métallique, téléscope ou temporaire
- 🔍 Détection de caries sur 6 surfaces : mésiale, distale, vestibulaire, linguale, occlusale, sous-coronaire
- 🪥 Matériaux d'obturation par surface : amalgame, composite, CVI, temporaire
- 🏥 Diagnostic pulpaire et traitements endodontiques complets
- 🩺 Module parodontal complet avec bilan graphique et classification 2017
- 🔗 Exportation/Importation HL7 FHIR R4 et JSON
- 🖼️ Exportation d'images PNG / JPG / SVG et rapport PDF
- 🔢 Numérotation FDI / Universelle / Palmer
- 🌐 Interface disponible en 12 langues dont le Français (FR)
