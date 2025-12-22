# 📱 Relevo - Mobile Client

Le client mobile officiel de **Relevo**, l'architecte vocal intelligent.
Cette application permet aux professionnels du BTP d'enregistrer des comptes rendus de chantier, de les envoyer vers notre Gateway IA, et de recevoir des rapports structurés, tarifés et exportables.

L'application est construite avec une approche **"Offline First"** pour l'interface et **"Optimistic UI"** pour la gestion des états.

---

## ⚡ Fonctionnalités

### 🎙️ Capture & Audio

* **Enregistreur Intelligent** : Timer en temps réel, calcul du coût estimatif en crédits (⚡) avant l'envoi.
* **Import de Fichiers** : Support natif du sélecteur de documents (iOS/Android).
* **Preview** : Lecteur audio intégré pour vérifier l'enregistrement.

### 🔄 Synchronisation & Data

* **Polling Intelligent** : Mise à jour automatique des statuts des Jobs via **React Query** (Intervalle dynamique).
* **Gestion des Crédits** : Synchronisation temps réel du solde utilisateur avec gestion des **remboursements automatiques** en cas d'échec serveur.
* **Notifications Push** : Intégration Expo Notifications pour alerter quand un rapport est prêt.

### 📄 Restitution

* **Rendu Markdown** : Affichage riche des rapports générés par l'IA.
* **Export PDF** :  -- A VENIR -- Génération de PDF natifs via `expo-print` prêts à être partagés.

---

## 🛠️ Stack Technique

* **Framework** : [Expo](https://expo.dev/) (Managed Workflow)
* **Routing** : [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
* **Styling** : [NativeWind](https://www.nativewind.dev/) (TailwindCSS pour React Native)
* **State Management** : [Zustand](https://github.com/pmndrs/zustand) (Auth & User Credits)
* **Server State** : [TanStack Query v5](https://tanstack.com/query/latest) (Caching, Polling, Invalidations)
* **Audio** : `expo-av`
* **Networking** : `axios`

---

## 📂 Architecture du Code

Le projet suit une architecture modulaire stricte pour éviter les "God Components".

```
app/
├── (auth)/             # Login / Register screens
├── (tabs)/             # Navigation principale
│   ├── index.tsx       # Orchestrateur (Recorder)
│   └── history.tsx     # Liste des Jobs (Polling)
├── job/[id].tsx        # Détail d'un Job (Markdown/PDF)
└── _layout.tsx         # Configuration globale (Providers)

src/
├── components/
│   ├── recorder/       # Composants isolés (Idle, Recording, Review)
│   ├── ui/             # Composants réutilisables (Badge, Card...)
│   └── JobCard.tsx     # Carte d'état (Pending/Success/Failed)
├── hooks/
│   ├── useAudioRecorder.ts # Logique micro & permissions
│   ├── useAudioPlayer.ts   # Logique lecture preview
│   ├── useCreateJob.ts     # Mutation Axios (Upload)
│   ├── useMe.ts            # Synchro User/Credits
│   └── usePushNotifications.ts
├── services/           # Configuration API & Interceptors
├── store/              # Stores Zustand (authStore, userStore)
└── utils/              # Helpers (calcul coût, format temps)

```

---

## 🚀 Installation & Démarrage

### 1. Prérequis

* Node.js (LTS)
* Un appareil physique (recommandé pour tester le micro et les notifications) avec l'app **Expo Go**.

### 2. Installation

```bash
# Cloner le repo
git clone <votre-repo>
cd relevo-app

# Installer les dépendances
npm install

```

### 3. Configuration de l'environnement

Créez un fichier `.env` à la racine :

```env
# ⚠️ IMPORTANT : Utilisez votre IP locale (ex: 192.168.1.15), PAS 'localhost'
EXPO_PUBLIC_API_URL="http://192.168.x.x:3000"

# ID du projet EAS (pour les notifications push en prod)
EXPO_PUBLIC_PROJECT_ID="votre-id-projet-expo"

```

### 4. Lancer l'application

```bash
# Lancer le serveur de développement (avec vidage de cache par sécurité)
npx expo start -c

```

Scannez le QR Code avec votre téléphone.

---

## 🐛 Troubleshooting

### "Network Error" / "Axios Error"

* **Cause :** L'application sur votre téléphone essaie de contacter `localhost` (qui est le téléphone lui-même) au lieu de votre ordinateur.
* **Solution :** Vérifiez que votre `.env` contient bien l'adresse IP locale de votre ordinateur et que votre téléphone est sur le même réseau Wi-Fi.

### "Permission Denied" (Microphone)

* **Cause :** Vous avez refusé la permission lors du premier lancement.
* **Solution :** Désinstallez Expo Go ou allez dans les réglages de votre téléphone pour réactiver manuellement le micro pour Expo Go.

### Notifications Push ne fonctionnent pas

* **Note :** Les notifications Push ne fonctionnent pas sur les Simulateurs iOS. Utilisez un vrai iPhone. Sur Android Emulator, cela fonctionne généralement.

---

## 📦 Build Production

Pour générer les binaires (.apk / .ipa) :

```bash
# Installer EAS CLI
npm install -g eas-cli

# Login
eas login

# Build
eas build --profile production --platform all

```
