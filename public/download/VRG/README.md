# 🎮 VaRyGasy Gaming

Boutique en ligne de jeux vidéo et produits gaming à Madagascar.

Built with **Next.js 16**, **TypeScript**, **Tailwind CSS 4**, **Supabase**, **Prisma**.

---

## 🚀 Installation rapide

### Option 1 : Docker (recommandé)

```bash
# 1. Extraire l'archive
unzip VRG-source.zip -d VRG
cd VRG

# 2. Configurer les variables d'environnement
cp .env.example .env
# Ouvrir .env avec ton éditeur et remplir les clés Supabase

# 3. Lancer avec Docker
docker compose up -d --build

# 4. Ouvrir http://localhost:3000
```

### Option 2 : Manuel (Node.js / Bun)

```bash
# 1. Extraire l'archive
unzip VRG-source.zip -d VRG
cd VRG

# 2. Installer les dépendances
bun install
# ou: npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Ouvrir .env et remplir les clés Supabase

# 4. Lancer en développement
bun run dev
# Ouvrir http://localhost:3000

# 5. Build production
bun run build
bun run start
```

---

## ⚙️ Configuration (.env)

| Variable | Description | Exemple |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de ton projet Supabase | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé admin Supabase (secrète) | `eyJhbGci...` |
| `JWT_SECRET` | Secret pour les tokens JWT | `un-texte-aleatoire-long` |
| `ADMIN_EMAIL` | Email admin par défaut | `admin@varygasy.mg` |
| `ADMIN_PASSWORD` | Mot de passe admin par défaut | `ton-password` |

---

## 📁 Structure du projet

```
VRG/
├── src/
│   ├── app/                    # Pages et API Routes
│   │   ├── api/                # Backend API
│   │   │   ├── admin/          # API admin (produits, commandes, users...)
│   │   │   ├── auth/           # Login, register, profil
│   │   │   ├── chat/           # Chat + Assistant IA
│   │   │   └── ...             # Products, orders, settings
│   │   ├── page.tsx            # Page principale
│   │   ├── layout.tsx          # Layout racine
│   │   └── globals.css         # Styles globaux
│   ├── components/
│   │   ├── vrg/                # Composants du site
│   │   │   ├── admin/          # Pages admin
│   │   │   ├── Navbar.tsx
│   │   │   ├── Hero.tsx
│   │   │   ├── Products.tsx
│   │   │   ├── SupportChat.tsx # Chat avec IA
│   │   │   └── ...
│   │   └── ui/                 # Composants shadcn/ui
│   ├── contexts/               # Auth + Cart contexts
│   ├── hooks/                  # Hooks personnalisés
│   └── lib/                    # Utils, Supabase, auth
├── prisma/
│   └── schema.prisma           # Schéma de base locale
├── public/
│   ├── images/                 # Images du site
│   └── robots.txt
├── Dockerfile                  # Docker production
├── docker-compose.yml          # Docker Compose
├── docker-entrypoint.sh        # Script de démarrage Docker
├── .env.example                # Template des variables
├── package.json                # Dépendances
└── next.config.ts              # Config Next.js
```

---

## 🛠 Commandes utiles

```bash
# Développement
bun run dev              # Lancer le serveur de dev (port 3000)

# Production
bun run build            # Build l'application
bun run start            # Lancer en production

# Docker
docker compose up -d     # Démarrer
docker compose down      # Arrêter
docker compose logs -f   # Voir les logs
docker compose up --build  # Rebuild après modif

# Base de données
bun run db:push          # Pousser le schema Prisma
bun run db:generate      # Générer le client Prisma

# Qualité
bun run lint             # Vérifier le code
```

---

## 🔑 Accès Admin

1. Ouvrir le site
2. Cliquer sur le compte / ou aller sur `#admin`
3. Se connecter avec `ADMIN_EMAIL` / `ADMIN_PASSWORD`
4. Le dashboard admin s'ouvre

---

## 💬 Chat IA

Le chat support inclut un assistant IA. Commandes :

| Commande | Effet |
|---|---|
| `/stop` | Arrêter l'assistant IA |
| `/human` | Passer au support humain |
| `/ai` | Réactiver l'assistant IA |
| `/reset` | Nouvelle discussion |
| `/help` | Voir les commandes |

---

## 📦 Technologies

- **Next.js 16** (App Router)
- **TypeScript 5**
- **Tailwind CSS 4**
- **shadcn/ui** (composants)
- **Supabase** (base de données + auth + storage)
- **Prisma** (ORM local)
- **z-ai-web-dev-sdk** (assistant IA)
- **Framer Motion** (animations)
- **Lucide React** (icônes)
- **Zustand** (state management)

---

## 📄 Licence

Projet privé - VaRyGasy Gaming © 2024
