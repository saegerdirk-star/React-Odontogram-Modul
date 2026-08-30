# 🦷 React Advanced Odontogram

[![Download](https://img.shields.io/badge/Download-React--Odontogram--Modul-blue?style=for-the-badge&logo=github)](https://github.com/ZoliQua/React-Odontogram-Modul/releases)
[![Version](https://img.shields.io/badge/version-2.55.0-green?style=for-the-badge)](https://github.com/ZoliQua/React-Odontogram-Modul)
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
Ce projet est un éditeur d'odontogramme dentaire interactif basé sur un navigateur Web, conçu pour une saisie rapide du schéma dentaire avec une interface claire. Il génère des modèles de dents SVG superposés pour représenter les restaurations, les caries, le statut endodontique, la mobilité et d'autres détails cliniques, tout en offrant la sélection multiple, des filtres de sélection et des préréglages d'état prédéfinis. Chaque position dentaire possède son propre dessin — seize vues latérales permanentes, vingt vues occlusales et la denture temporaire — et la vue occlusale des dents antérieures est ce qui rend possible le relevé d'une lésion palatine sur une incisive, que la vue latérale ne peut pas montrer.

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

**FHIR / Dental Core:**

FHIR conversion is a pure optional projection of the UI-domain document. It has two explicit codecs: upstream-compatible `legacy` is the standalone default, while `dental-core` uses generated `de.cognovis.fhir.dental.core#0.5.0`. `buildDentalCoreBundle` requires a caller-provided or examination-context effective date and refuses exports that would lose populated clinical state; a Dental Core session rejects Legacy, unsupported, or malformed bundles.

**Mode live Aidbox (développement, à partir de 2.50.0) :**

Un second point d'entrée du serveur de développement, `live.html` (`src/live`), charge la fiche d'un patient directement depuis une instance Aidbox en cours d'exécution, la restitue dans la coquille habituelle via l'API de session décrite ci-dessus, et réécrit les modifications sous forme de ressources Dental Core avec des identifiants déterministes, de sorte qu'un nouvel enregistrement met à jour au lieu de dupliquer. Il se configure via un `.env` exclu du contrôle de version (copie de `.env.example`) désignant **uniquement un client machine à portée restreinte** — jamais des identifiants d'administrateur. C'est un outil de développement, ne faisant pas partie du paquet publié : les paquets SDK `@polaris` sont des devDependencies, `dependencies` reste inchangé, et ni `src/live` ni `live.html` ne sont publiés. La configuration, la mécanique de chargement/enregistrement et l'écart documenté avec le dialecte de l'adaptateur charly figurent dans [`docs/aidbox-live-mode.md`](../docs/aidbox-live-mode.md). À noter : l'installation des devDependencies de ce dépôt nécessite désormais un identifiant pour `npm.cognovis.de` (voir le document) ; `npm ci --omit=dev` et l'utilisation du paquet publié n'en ont pas besoin.

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
- **Ce que le patient a apporté est dérivé de cette archive, jamais stocké.** Les soins restaurateurs présents lors de l'examen archivé LE PLUS ANCIEN sont dessinés **hachurés**. `getBaselineExamination()`, `getPreExistingAxes(toothNo)`, `getChangesSinceBaseline()`, `isToothPreExisting(toothNo)`.
- La hachure marque **le travail, jamais la dent ni la maladie** — restaurations, obturations, obturations canalaires et tenons, apicectomie, scellement de sillons. Une racine résiduelle ou un implant est une dent, pas un travail ; carie, tartre et constats parodontaux sont une maladie.
- L'**examen initial est corrigible** : `beginBaselineCorrection()`, `commitBaselineCorrection()`, `cancelBaselineCorrection()`. Délibérément aucun remplacement par dent.
- Un **schéma importé sans archive propre devient l'examen initial** (menu d'import, activé par défaut). Un document apportant sa propre archive la conserve.

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

**Saisie (à partir de 2.7.0) :** un commutateur **Statut d'évaluation** dans l'en-tête du
charting parodontal ajoute une ligne compagnon sous chaque ligne d'indice visible, avec un bouton
cyclique par point de mesure — site, surface, entrée de furcation ou la dent entière. Ces lignes
sont désactivées par défaut. Un point qui porte déjà une mesure est verrouillé (la valeur est sa
propre preuve d'examen) et une position non applicable est désactivée plutôt qu'ignorée en
silence. Les statuts enregistrés apparaissent aussi dans l'infobulle de la dent et dans le résumé
parodontal de toute la bouche.

La carte parodontale de la bouche entière relève désormais aussi la **suppuration** par site, et
une colonne d'implant prend en charge l'examen péri-implantaire : profondeur de sondage en six
sites, saignement, suppuration, mobilité de l'implant et largeur de muqueuse kératinisée. Seuls y
restent inactifs les axes qui exigent la jonction émail-cément (marge gingivale et le CAL qui en
découle) et les indices de plaque de la dent naturelle — mPI et mBI en sont les équivalents
péri-implantaires.
### ⌨️ Saisie du bilan par abréviations

Les constats se prennent en quelques secondes, souvent sous dictée. Avec 46 axes et 129 valeurs,
le nombre de clics est le véritable goulot d'étranglement ; le schéma se remplit donc comme on
tape déjà (`odontogram-t8y`) :

```
sélectionner 13–23  glisser sur les dents, Maj + flèche ou Maj + clic
E                   mode matériau : céramique — il reste actif
k                   six couronnes, une seule frappe
```

**Le matériau précède le constat et reste actif**, comme un mode et non comme un ajout. Une touche
de matériau a deux lectures, car une obturation et une restauration puisent dans des ensembles de
valeurs différents : `K mo` est une obturation composite sur deux faces, `K k` une couronne en
Gradia. Là où une lecture n'existe pas, on n'en invente aucune.

**La tabulation passe à la dent suivante**, Maj+tabulation revient, en partant de 18 et en faisant
le tour de la bouche (18–28, puis 38–48), avec bouclage. Elle déplace la sélection, pas seulement
le focus, de sorte que la dent où l'on se trouve est mise en évidence. Les flèches sont
inchangées.

```
G k    Tab    b          couronne en or, puis un intermédiaire sur la voisine
A  mod Tab               une obturation à l'amalgame sur trois faces
c mod K3                 carie sur trois faces, avec sévérité
```

La correspondance vit dans `src/shorthand.ts`, sans DOM et indépendamment du moteur, car le même
ensemble de constats doit être atteignable par trois voies : le clavier, une requête FHIR vers un
logiciel de cabinet, et la voix.

L'abréviation est transcrite du pavé de saisie de *charly* (solutio), elle n'est pas inventée
(`docs/charly/01-befund-tastenfeld.md`).

Une portée suit l'**arcade**, pas la géométrie (`odontogram-apn`) : par-dessus la ligne médiane
(de 13 à 23) oui, d'une arcade à l'autre jamais.

### ✨ Fonctionnalités clés
- 🖱️ Sélection rapide et multi-sélection (CMD/CTRL + clic)
- 🦷 Types de dents : permanente, temporaire (lactéale), implant, sous-gingivale, absente
- 👑 Restaurations par type × matériau : couronne / inlay / onlay / facette / pont en e.max, or, gradia, zircone, métal, céramo-métallique, téléscope ou temporaire
- 🔍 Détection de caries sur 6 surfaces : mésiale, distale, vestibulaire, linguale, occlusale, sous-coronaire
- 🪥 Matériaux d'obturation par surface : amalgame, composite, CVI, temporaire
- 🏥 Diagnostic pulpaire et traitements endodontiques complets
- 🩺 Module parodontal complet avec bilan graphique et classification 2017
- 🔗 Éléments de rétention pour prothèse amovible : crochet, attachement, pilier de barre (crochet dessiné sur la couronne ; travée de barre dérivée, pilier implantaire et naturel mélangés)
- 🧭 **L'orthodontie est la troisième vue clinique** (`odontogram-c51`) : un sélecteur `Odontogram | Statut Parodontal | Orthodontie` (`#appViewToggle`) accueille les deux cartes ci-dessous. L'odontogramme n'est jamais démonté, seulement masqué : changer de vue ne peut donc pas perturber le relevé. La vue orthodontique n'a pas de fenêtre propre et reste donc un segment du sélecteur même là où le statut parodontal est configuré en fenêtre surgissante — seul son segment disparaît.
- 📐 **Analyse des modèles** (`odontogram-c51.1`) : Tonn et Bolton à partir des largeurs mésio-distales, avec la somme incisive cible, la discordance de taille dentaire et l'arcade porteuse de l'excès. Saisie sur une arcade ou en liste — deux vues d'un même enregistrement. Une dent absente du modèle (non éruptée, perdue, sous la gencive) reprend la largeur de sa controlatérale, signalée comme hypothèse. Plus le surplomb, le recouvrement et la déviation de la ligne médiane par arcade
- 🩻 **Céphalométrie** (`odontogram-c51.2`) : un répertoire de points commun, les mesures définies dessus, et les analyses comme profils au-dessus — une nouvelle école est un nouveau profil, les points ne bougent pas. Chaque mesure porte sa source et son codage FHIR ; une norme sans publication n'est pas livrée. Sont dérivées la position des maxillaires par rapport au crâne (type facial selon Björk, harmonie, classe sagittale face à la norme de population **et** à la norme individuelle) et le schéma de croissance comme vote entre tous les indicateurs dotés d'une norme sourcée. Les valeurs peuvent être reprises de l'évaluation imprimée d'un autre programme en collant son texte — rien n'est appliqué sans confirmation Quatre analyses sont livrées : **Segner/Hasund**, **Ricketts**, **Jarabak** et **Steiner**. Steiner et les analyses suivantes proviennent d'un catalogue clinique d'analyses céphalométriques et ne citent aucune source — la norme est un fait public, le praticien la vérifie avec la littérature d'origine (le champ `source` est interne, jamais affiché). L'axe facial montre à quoi sert cette stratification : Ricketts le donne à 90 ± 3,5 et Paddenberg à 90 ± 3,0, si bien que 93,3° se lit à l'intérieur d'une dispersion et hors de l'autre ; la surcharge appartient au profil et la mesure conserve sa propre norme. Le sélecteur les trie alphabétiquement par leur nom traduit, les **favoris** formant un groupe en tête ; le premier favori ouvre la carte tant que personne n'a choisi explicitement. Une préférence du cabinet comme la palette des restaurations : état de session, jamais dans la charge utile, et délibérément hors de la réinitialisation.
- 🖐️ **Âge osseux** (`odontogram-c51.4`) : combien de croissance reste, lu de deux façons et tenu séparé — maturation vertébrale cervicale (CVM, 6 stades) sur la même téléradiographie et SMI de Fishman (11 stades) sur la radiographie de la main. Les onze SMI se projettent sur les six stades CVM par paires fixes, si bien que les deux donnent la même plage de croissance restante ; un CVM lu directement l'emporte sur celui dérivé de la main, et un désaccord est signalé, non résolu. À côté du schéma de croissance céphalométrique.
- 📸 **Analyse photostatique — Powell** (`odontogram-c51.3`) : angles sur photo de profil, intégrés à la carte céphalométrique mais marqués comme un MÉDIA différent : chaque mesure et le profil portent `medium: "photo"`, et le sélecteur regroupe selon lui (téléradiographie vs photostatique), si bien que le relevé indique si une valeur des tissus mous a été lue sur le cliché ou sur la photo.
- ⚠️ Les deux sont pour l'instant un **état de session** : aucun profil Dental Core publié n'existe, ils ne font donc pas partie du payload d'export plutôt que d'en inventer un local
- 🔗 Exportation/Importation HL7 FHIR R4 et JSON
- 🖼️ Exportation d'images PNG / JPG / SVG et rapport PDF
- 🔢 Numérotation FDI / Universelle / Palmer
- 🌐 Interface disponible en 12 langues dont le Français (FR)
