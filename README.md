# FreeRoom

Voir quelles salles de l'école sont libres à un instant donné et réserver un créneau court, sans tourner dans les couloirs.

Projet étudiant (ESGI, Tech Venture Sprint). Une seule fonctionnalité de bout en bout, poussée jusqu'au bout : connexion, grille des salles avec créneaux libres/occupés du jour (mise à jour automatique toutes les 8s, créneaux passés non réservables), réservation, annulation — plus une gestion de rôles pour la modération (admin/superadmin).

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Modèle de données](#modèle-de-données)
- [Rôles et permissions](#rôles-et-permissions)
- [Structure du projet](#structure-du-projet)
- [Démarrer en local](#démarrer-en-local)
- [Scripts disponibles](#scripts-disponibles)
- [Tests](#tests)
- [Thème clair / sombre / auto](#thème-clair--sombre--auto)
- [Déploiement](#déploiement)
- [Infrastructure de production](#infrastructure-de-production)
- [Sauvegarde et restauration](#sauvegarde-et-restauration)
- [Scénario d'incident](#scénario-dincident-base-coupée-en-plein-fonctionnement)
- [Hors périmètre (volontairement)](#hors-périmètre-volontairement)

---

## Fonctionnalités

- **Authentification** email + mot de passe (pas d'OAuth/SSO), session en cookie signé, rate limiting anti-bruteforce sur `/login` et `/signup`.
- **Grille du jour** : les salles réparties sur 3 étages (voir plus bas), 11 créneaux horaires (8h–19h), un sélecteur d'étage, navigation jour précédent/suivant. Rafraîchissement automatique toutes les 8s pour ne pas afficher un créneau comme libre alors qu'il vient d'être pris.
- **Réservation / annulation** en un clic, avec double-booking impossible *par construction* (contrainte unique en base, pas juste une vérification côté client).
- **"Mes réservations"** : liste des créneaux à venir de l'utilisateur connecté, avec annulation directe.
- **Rôles** : `student` (par défaut), `admin` (peut forcer une réservation sur un créneau déjà pris), `superadmin` (en plus, accès à un dashboard pour gérer le rôle de tous les comptes).
- **Thème clair / sombre / automatique**, mémorisé, sans flash au chargement.
- **Responsive** : pensé mobile d'abord (usage réel = un téléphone, entre deux cours, dans un couloir).

## Stack technique

| Domaine | Choix |
|---|---|
| Framework | **Next.js 16** (App Router), **React 19**, TypeScript |
| Base de données | **PostgreSQL** (choisi pour permettre `pg_dump`/`pg_restore`, voir [Sauvegarde](#sauvegarde-et-restauration)) |
| Accès base | **postgres.js**, SQL brut — pas d'ORM |
| Auth | Session cookie signée (JWT via `jose`), mots de passe hashés (`bcryptjs`), rate limiting maison |
| Style | Tailwind CSS v4, système de design documenté dans `DESIGN.md` |
| Tests | Vitest (unitaires + intégration HTTP réelle) |
| Icônes | `lucide-react` |

Aucun framework d'UI, d'ORM ou de state management externe — le projet reste volontairement petit et lisible de bout en bout.

## Architecture

**Frontend** — Server Components par défaut (le rendu des pages passe par la base à chaque requête, pas de cache client à invalider). Les seuls Client Components sont ceux qui ont vraiment besoin d'interactivité : les boutons réserver/annuler/forcer (`book-slot-button.tsx`, `cancel-slot-button.tsx`), le sélecteur de rôle du dashboard (`admin/role-select.tsx`), le bouton de thème (`theme-toggle.tsx`) et le rafraîchissement automatique (`live-refresher.tsx`). Les mutations passent soit par une **Server Action** (formulaires d'auth, changement de rôle), soit par un petit **Route Handler REST** (`/api/bookings`) pour les boutons qui ont besoin d'un état de chargement/erreur fin.

**Backend** — Toute la logique métier (créneaux valides, conflits, annulation autorisée) vit dans `lib/bookings.ts`, testée indépendamment de toute route HTTP. L'autorisation est **toujours revérifiée côté serveur**, jamais seulement cachée côté UI : un étudiant ne peut annuler que sa propre réservation (403 sinon), et le statut admin est relu en base à chaque action sensible plutôt que fait confiance depuis un token client.

**Protection des routes** — `proxy.ts` (le nom historique de `middleware.ts` dans ce projet) redirige vers `/login` toute page non publique sans session valide, et redirige un utilisateur déjà connecté loin de `/login`/`/signup`.

**Résilience** — `app/error.tsx` capte une base injoignable et affiche un message clair avec un bouton "Réessayer", plutôt qu'un crash ou une page blanche (voir le [scénario d'incident](#scénario-dincident-base-coupée-en-plein-fonctionnement)).

## Modèle de données

```mermaid
erDiagram
    users {
        serial id PK
        text name
        text email UK
        text password_hash
        text role "student | admin | superadmin"
    }
    rooms {
        serial id PK
        text name UK
        integer capacity
        smallint floor "0=RDC, 1=1er, 2=2e"
    }
    bookings {
        serial id PK
        integer room_id FK
        integer user_id FK
        date date
        smallint start_hour "8-18"
        smallint end_hour "start_hour+1"
    }
    users ||--o{ bookings : "réserve"
    rooms ||--o{ bookings : "est réservée dans"
```

Le double-booking est rendu impossible par une contrainte `UNIQUE (room_id, date, start_hour)` — pas seulement une vérification applicative qu'une race condition pourrait contourner.

**Salles** : 35 au total, réparties par étage —
- **RDC** (`floor = 0`) : l'Amphi + Salle 001 à 010
- **1er étage** (`floor = 1`) : Salle 101 à 112
- **2e étage** (`floor = 2`) : Salle 201 à 212

## Rôles et permissions

| Rôle | Peut faire |
|---|---|
| `student` | Réserver un créneau libre, annuler ses propres réservations. Rôle par défaut à l'inscription — impossible de se l'auto-attribuer autrement. |
| `admin` | Tout ce que peut un `student`, **plus** : forcer une réservation sur un créneau déjà pris par quelqu'un d'autre (bouton "Forcer", avec confirmation, sur la grille) — utile si un cours se greffe au dernier moment. |
| `superadmin` | Tout ce que peut un `admin`, **plus** : accès au dashboard `/admin` pour voir tous les comptes et changer le rôle de n'importe qui (sauf le sien, pour éviter de se bloquer soi-même). |

Aucune UI ne permet de se donner un rôle soi-même. Le tout premier `superadmin` doit être créé en base :

```bash
npm run role:set -- quelquun@esgi.fr superadmin
```

Ensuite, tout se fait depuis le dashboard `/admin`.

## Structure du projet

```
app/
  page.tsx                  grille des salles/créneaux du jour (+ sélecteur d'étage)
  reservations/page.tsx     "Mes réservations" (à venir, avec annulation)
  admin/page.tsx            dashboard de gestion des rôles (superadmin uniquement)
  admin/role-select.tsx     sélecteur de rôle (Client Component, appelle une Server Action)
  login/, signup/           formulaires d'authentification
  api/bookings/             POST (créer, avec priorité admin) / DELETE (annuler)
  app-header.tsx            navigation, badge de rôle, bouton de thème, déconnexion
  day-grid.tsx              la grille elle-même (statuts libre/occupé/mien/passé)
  floor-selector.tsx        sélecteur RDC / 1er / 2e étage
  theme-*.{ts,tsx}          thème clair/sombre/auto (voir plus bas)
  error.tsx                 écran de repli si la base est injoignable
lib/
  db.ts                     client postgres.js
  session.ts, dal.ts        cookie de session signé + verifySession()/getUser()
  roles.ts                  type des rôles, sans garde "server-only" (importable côté client)
  bookings.ts               logique métier : créneaux, création, annulation, priorité admin
  rate-limit.ts             rate limiting en mémoire (login/signup)
  actions/auth.ts           Server Actions signup/login/logout
  actions/admin.ts          Server Action de changement de rôle (revérifie superadmin côté serveur)
db/schema.sql               schéma SQL, migrations idempotentes incluses
scripts/
  migrate.ts                applique db/schema.sql
  seed.ts                   crée/maintient à jour le catalogue des 35 salles
  seed-course-bookings.ts   remplit un mois de fausses réservations "cours" (démo)
  set-role.ts               change le rôle d'un compte (bootstrap du premier superadmin)
  setup-test-db.ts          crée/migre la base dédiée aux tests
proxy.ts                    redirections d'auth (anciennement middleware.ts)
docker-compose.yml          db + app + reverse proxy, pour un déploiement autonome
DESIGN.md, PRODUCT.md       système de design et périmètre produit détaillés
```

## Démarrer en local

**Prérequis** : Node.js 22+ (testé avec Node 26), Docker (pour Postgres).

```bash
npm install

cp .env.example .env
# éditer .env : générer un SESSION_SECRET avec `openssl rand -base64 32`

npm run db:up       # démarre Postgres dans Docker (port 5432)
npm run db:migrate  # crée les tables
npm run db:seed     # crée les 35 salles (RDC/1er/2e)

npm run dev
```

L'app est sur [http://localhost:3000](http://localhost:3000). Créer un compte via `/signup`, se connecter, réserver un créneau.

Pour une grille qui ne soit pas vide en démo, remplir un mois de fausses réservations :

```bash
npm run db:seed:bookings
```

Pour arrêter la base : `npm run db:down`.

## Scripts disponibles

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement Next.js |
| `npm run build` / `npm run start` | Build de production / lance le build |
| `npm run lint` | ESLint |
| `npm test` | Migre la base de test puis lance Vitest (voir [Tests](#tests)) |
| `npm run db:up` / `db:down` | Démarre/arrête Postgres via Docker Compose |
| `npm run db:migrate` | Applique `db/schema.sql` (idempotent, sûr à rejouer) |
| `npm run db:seed` | Crée/maintient à jour le catalogue des 35 salles |
| `npm run db:seed:bookings` | Remplit un mois de fausses réservations "cours" réalistes (démo) |
| `npm run role:set -- <email> <role>` | Change le rôle d'un compte (`student`\|`admin`\|`superadmin`) |

## Tests

```bash
npm test
```

Migre automatiquement une base Postgres **dédiée aux tests** (`amphi_libre_test`, isolée de la base de dev via `.env.test`), puis lance Vitest. Deux suites :

- `lib/bookings.test.ts` (9 tests) — logique métier pure : création, double-booking, créneau passé, annulation, priorité admin.
- `tests/api/integration.test.ts` (11 tests) — démarre un **vrai serveur Next** et appelle réellement les routes en HTTP (pas de mock) : parcours utilisateur complet, chemins d'erreur, contrôle d'accès.

`lib/*.ts` important `"server-only"` (garde anti-import-côté-client de Next.js) fonctionne aussi sous Vitest grâce à un stub (`tests/stubs/server-only.ts`, aliasé dans `vitest.config.ts`) — sans ça, ces modules ne seraient testables qu'à travers une vraie requête HTTP.

### Rapport de tests

Environnements utilisés :

| Environnement | Composants |
|---|---|
| **A — Local, suite automatisée** | macOS (Darwin), Node.js v26.8.1, Vitest 5.0.1, Next.js 16.3.5, PostgreSQL 16-alpine (Docker) |
| **B — CI (GitHub Actions)** | `ubuntu-latest`, Node.js 26, PostgreSQL 16-alpine (service container), déclenché sur chaque push vers `main` |
| **C — Déploiement conteneurisé complet** | Image `node:26-alpine` (build multi-stage, voir `Dockerfile`), PostgreSQL 16-alpine, Nginx `1.31.5` (reverse proxy), via `docker compose up --build` |

Le détail commande-par-commande de chaque ligne ci-dessous est reproductible tel quel (`npm test` pour A, le fichier `.github/workflows/deploy.yml` pour B, `docker compose up --build -d` pour C).

| Catégorie | Test | Env. | Résultat attendu | Résultat obtenu | Date | Preuve / lien |
|---|---|---|---|---|---|---|
| **Parcours** | Réserver un créneau libre → il apparaît dans "Mes réservations" → l'annuler → il disparaît | A | 201 puis présent en HTML, puis 204 puis absent + "Aucune réservation à venir" | ✅ Conforme | 2026-09-16 | `tests/api/integration.test.ts` › *Parcours — réserver, retrouver dans « Mes réservations », annuler* (642ms) |
| **Parcours** | Inscription réelle (formulaire `/signup`) → session posée → créneau réservable immédiatement | C | Cookie de session renvoyé, `POST /api/bookings` → 201 | ✅ Conforme | 2026-09-16 | Exécuté manuellement contre la stack Docker Compose : `curl .../signup` (multipart) puis `curl -X POST .../api/bookings` → `{"id":7387}` HTTP 201 |
| **Parcours** | Créneau réservé par A vu comme "Occupé" par B, "Annuler" pour A ; admin peut le "Forcer" | A | Statuts `own`/`booked` corrects ; override atomique par un admin | ✅ Conforme | 2026-09-16 | `lib/bookings.test.ts` › *lets an admin bump an existing booking and take the slot* (6ms) + captures d'écran navigateur (session précédente) |
| **Erreur** | `POST /api/bookings` avec un corps invalide (`roomId` non numérique) | A | 400 `invalid_body` | ✅ Conforme | 2026-09-16 | `tests/api/integration.test.ts` › *refuse un corps de requête invalide (400)* (7ms) |
| **Erreur** | `POST /api/bookings` sur un créneau déjà passé | A | 400 | ✅ Conforme | 2026-09-16 | `tests/api/integration.test.ts` › *refuse de réserver un créneau déjà passé (400)* (4ms) |
| **Erreur** | Double-booking : deux utilisateurs réservent le même créneau | A | 1er → 201, 2e → 409, le 1er n'est pas écrasé | ✅ Conforme | 2026-09-16 | `tests/api/integration.test.ts` › *refuse un double-booking...* (15ms) + `lib/bookings.test.ts` › *rejects a second booking...* (7ms) |
| **Accès** | Page protégée (`/`) sans session | A | Redirection 307 → `/login` | ✅ Conforme | 2026-09-16 | `tests/api/integration.test.ts` › *redirige une page protégée vers /login sans session (307)* (6ms) |
| **Accès** | `/admin` sans session | A | Redirection 307 → `/login` | ✅ Conforme | 2026-09-16 | `tests/api/integration.test.ts` › *redirige /admin vers /login sans session (307)* (3ms) |
| **Accès** | `/admin` avec un compte `student` authentifié | A | Redirection 307 → `/` (pas d'accès, même connecté) | ✅ Conforme | 2026-09-16 | `tests/api/integration.test.ts` › *redirige /admin vers / pour un compte student...* (150ms) |
| **Accès** | `/admin` avec un compte `superadmin` | A | 200, dashboard affiché | ✅ Conforme | 2026-09-16 | `tests/api/integration.test.ts` › *laisse passer /admin pour un compte superadmin (200)* (29ms) |
| **Accès** | Annuler la réservation d'un autre utilisateur | A | 403 pour l'autre utilisateur, 204 pour le propriétaire, jamais supprimée entre-temps | ✅ Conforme | 2026-09-16 | `tests/api/integration.test.ts` › *refuse d'annuler la réservation d'un autre utilisateur...* (24ms) |
| **Accès** | Créer/annuler une réservation sans cookie de session | A | 401 dans les deux cas | ✅ Conforme | 2026-09-16 | `tests/api/integration.test.ts` › *refuse de créer... (401)* (5ms) et *refuse d'annuler sans session (401)* (5ms) |
| **Déploiement** | Pipeline CI complet (lint, typecheck, tests contre Postgres éphémère, build, push image `ghcr.io`) | B | Tous les jobs verts, image publiée | ✅ Conclusion `success` | 2026-09-16 | Run réel : [github.com/ThysmaJS/FreeRoom/actions/runs/35074675555](https://github.com/ThysmaJS/FreeRoom/actions/runs/35074675555) (commit `7560bf2`) |
| **Déploiement** | Stack complète (`db` + `app` + `proxy`) démarrée à froid via `docker compose up --build` | C | `app` migre/seed automatiquement au démarrage, `GET /login` via le reverse proxy → 200 | ✅ `HTTP/1.1 200 OK` (nginx/1.31.5) | 2026-09-16 10:46 CEST | Exécuté manuellement : `docker compose up --build -d` puis `curl -D - http://localhost/login` |
| **Détection d'incident** | Coupure de la base pendant que l'app tourne (`docker compose stop db`), requête utilisateur pendant la panne | C | Pas de crash ni de page blanche : message d'erreur clair + bouton "Réessayer" | ✅ HTTP 500 mais UI dégradée correcte (`app/error.tsx` rendu) | 2026-09-16 10:46 CEST | Capture d'écran + `page.locator("body").innerText()` via Playwright : *"Impossible de contacter le serveur / ... Réessayez dans quelques instants. / Réessayer"* |
| **Reprise** | Redémarrage de la base (`docker compose start db`), sans redémarrer le conteneur `app` | C | L'app se reconnecte seule, la réservation faite avant la panne est toujours là | ✅ `HTTP/1.1 200 OK` après reprise ; réservation `id=7387` toujours en base | 2026-09-16 10:47 CEST | `curl http://localhost/` → 200, puis `SELECT * FROM bookings WHERE id = 7387` → 1 ligne inchangée |

**Comment reproduire ces preuves soi-même :**
```bash
npm test                                  # lignes A (20/20 tests, ~2s)
docker compose up --build -d              # lignes C (déploiement)
docker compose stop db && curl -D - http://localhost/     # ligne "Détection d'incident"
docker compose start db && curl -D - http://localhost/    # ligne "Reprise"
```
Le run CI/CD (lignes B) se déclenche automatiquement à chaque push sur `main` — voir l'onglet [Actions](https://github.com/ThysmaJS/FreeRoom/actions) du repo pour l'historique complet.

## Thème clair / sombre / auto

Le bouton dans le header cycle `système → clair → sombre`, mémorisé dans `localStorage`. Pas de flash au premier chargement : un script inline (`theme-init-script.ts`, chargé en `beforeInteractive` dans `layout.tsx`) résout et applique le thème **avant** l'hydratation React, directement sur `<html data-theme="...">`. Tailwind lit cet attribut via un `@custom-variant dark` dans `globals.css`, plutôt que la media query `prefers-color-scheme` par défaut — ce qui permet à un choix explicite de l'utilisateur de prendre le pas sur la préférence système.

## Déploiement

### Option autonome (Docker Compose)

```bash
cp .env.example .env
# éditer .env : POSTGRES_USER / POSTGRES_PASSWORD / SESSION_SECRET (valeurs de prod, pas celles de dev)

docker compose up --build -d
```

Trois services :
- `db` — PostgreSQL 16 avec volume persistant
- `app` — l'app Next.js ; `docker/entrypoint.sh` applique le schéma et re-seed les salles à **chaque démarrage du conteneur**, de façon idempotente, avant de lancer le serveur
- `proxy` — Nginx en reverse proxy devant l'app, exposé sur le port `80`

`SESSION_SECRET` et les identifiants Postgres sont lus depuis `.env`, jamais en dur dans le code ou l'image.

### Déploiement réel (CI/CD + GitOps)

`.github/workflows/deploy.yml` : sur chaque push sur `main`, une CI lance lint + typecheck + tests contre un vrai Postgres éphémère, puis (si tout passe) build et pousse l'image sur `ghcr.io/thysmajs/freeroom`, et met à jour automatiquement le tag d'image dans un repo GitOps séparé qu'ArgoCD synchronise en continu vers un cluster k3s.

Le détail (secrets, ArgoCD, Kubernetes, schéma complet) est dans la section suivante.

## Infrastructure de production

La prod tourne sur un cluster **k3s** auto-hébergé, piloté entièrement en **GitOps** : ce repo (FreeRoom) ne contient que le code applicatif et sa CI ; tous les manifestes Kubernetes vivent dans un repo séparé, [`k3s-gitops-lab`](https://github.com/ThysmaJS/k3s-gitops-lab), qu'**ArgoCD** synchronise en continu vers le cluster. Rien n'est jamais appliqué à la main avec `kubectl apply` — un changement d'infra passe par un commit sur `k3s-gitops-lab`, jamais par une modification directe du cluster (d'ailleurs, si quelqu'un modifiait quelque chose à la main sur le cluster, ArgoCD l'écraserait automatiquement pour revenir à l'état déclaré dans Git — c'est le `selfHeal`).

### Schéma

```mermaid
flowchart LR
    Dev(["git push main"]) --> Repo["Repo FreeRoom\n(GitHub)"]

    subgraph CIPIPE["CI/CD — .github/workflows/deploy.yml"]
        CI["lint · typecheck · tests\n(Postgres éphémère)"]
        Build["build + push image"]
        Bump["clone k3s-gitops-lab,\nmet à jour le tag d'image, push"]
        CI --> Build --> Bump
    end
    Repo --> CI

    Build -.-> GHCR[("GHCR\nghcr.io/thysmajs/freeroom")]
    Bump --> GitOps["Repo k3s-gitops-lab\n(manifestes Kubernetes)"]

    GitOps -->|"détecte le changement"| ArgoCD["ArgoCD\nsync auto + selfHeal"]

    subgraph K3S["Cluster k3s"]
        ArgoCD -->|"applique"| NS

        subgraph NS["namespace: freeroom"]
            App["Deployment\nfreeroom"]
            Svc["Service\nfreeroom :80"]
            PG["Deployment\npostgres:16-alpine"]
            PGSvc["Service\npostgres :5432"]
            PVC[("PVC\nfreeroom-postgres-data")]
            Sec["Secret\nfreeroom-secrets"]

            App --> Svc
            PG --> PGSvc
            PG --> PVC
            Sec -.->|"env vars"| App
            Sec -.->|"env vars"| PG
            App -->|"DATABASE_URL"| PGSvc
        end

        InfisicalOp["Opérateur Infisical"] -->|"sync 5 min"| Sec
        Traefik["Ingress\nTraefik"] --> Svc
    end

    GHCR -.->|"pull image"| App
    InfisicalVault[("Infisical\ncoffre-fort des secrets")] --> InfisicalOp
    Traefik --> Tunnel["Tunnel Cloudflare\n(cloudflared)"]
    Tunnel --> Users(["Étudiants ESGI\nfreeroom.thysmadev.fr"])
```

### Où vit quoi

| Composant | Rôle | Où le trouver |
|---|---|---|
| **Repo `FreeRoom`** (celui-ci) | Code applicatif + pipeline CI | `.github/workflows/deploy.yml` |
| **Repo `k3s-gitops-lab`** | Tous les manifestes Kubernetes du cluster (FreeRoom et les autres apps qui y tournent) | `apps/freeroom/*.yaml` |
| **GHCR** | Registre d'images Docker | `ghcr.io/thysmajs/freeroom:<sha>` |
| **ArgoCD** | Applique en continu l'état déclaré dans `k3s-gitops-lab` sur le cluster | `argocd/applications/freeroom-app.yaml` (pointe vers `apps/freeroom`) |
| **Infisical** | Coffre-fort des secrets (source de vérité des vraies valeurs) | Projet `k3s-gitops-lab`, environnement `prod`, chemin `/freeroom/*` |
| **Traefik** | Ingress controller (fourni par défaut avec k3s) | `apps/freeroom/ingress.yaml` |
| **Tunnel Cloudflare** | Expose l'app sur internet sans ouvrir de port/IP publique sur le cluster | Config côté tableau de bord Cloudflare Zero Trust (hors Git) |

### Où sont stockés les secrets

**Jamais en clair dans Git**, ni dans ce repo ni dans `k3s-gitops-lab`. Le repo GitOps ne contient qu'une *référence* — projet, environnement, chemin — jamais une valeur :

```yaml
# apps/freeroom/infisical-secret.yaml (extrait)
apiVersion: secrets.infisical.com/v1beta1
kind: InfisicalStaticSecret
spec:
  sources:
    - projectSlug: k3s-gitops-lab
      environmentSlug: prod
      secretPath: /freeroom/freeroom-secrets   # ← juste un chemin, pas une valeur
  targets:
    - kind: Secret
      name: freeroom-secrets
      creationPolicy: Owner
```

Un opérateur Infisical, qui tourne en permanence dans le cluster, va chercher les vraies valeurs dans le coffre-fort Infisical (projet `k3s-gitops-lab`, env `prod`) toutes les 5 minutes et les matérialise en un vrai `Secret` Kubernetes (`freeroom-secrets`) dans le namespace `freeroom`. C'est ce Secret que le Deployment `freeroom` référence via `secretKeyRef` pour ses variables d'environnement (`DATABASE_URL`, `SESSION_SECRET`) — jamais de valeur en dur dans le YAML.

Deux secrets pour cette app :
- **`freeroom-secrets`** — `database-url`, `session-secret`, `postgres-user`, `postgres-password`
- **`ghcr-pull-secret`** — les identifiants pour que le cluster puisse tirer l'image privée depuis GHCR (`imagePullSecrets` sur le Deployment)

### ArgoCD — pourquoi rien n'est appliqué à la main

Le cluster suit le patron **app-of-apps** : une `Application` racine (`root-app`) surveille le dossier `argocd/applications/` du repo GitOps ; chaque fichier qu'on y ajoute (comme `freeroom-app.yaml`) devient une nouvelle `Application` ArgoCD, qui elle-même surveille un dossier `apps/<nom>` et l'applique au cluster. Avec `syncPolicy.automated: { prune: true, selfHeal: true }` :
- un commit qui ajoute/modifie une ressource → appliqué automatiquement (pas de bouton à cliquer, pas de `kubectl apply`) ;
- une ressource retirée du repo → supprimée du cluster (`prune`) ;
- une modification faite en direct sur le cluster (hors Git) → annulée à la prochaine synchronisation (`selfHeal`) — le cluster ne peut pas dériver silencieusement de ce qui est déclaré dans Git.

Les `sync-wave` (annotation `argocd.argoproj.io/sync-wave`) ordonnent les déploiements quand il y a une dépendance : l'app `freeroom` est en wave `2`, après que le secret Infisical et le registre d'images soient prêts.

### Pipeline complet, du `git push` à la prod

1. Push sur `main` (ce repo).
2. CI : lint, typecheck, tests contre un vrai Postgres éphémère (service container GitHub Actions).
3. Si tout passe : build de l'image Docker, push sur `ghcr.io/thysmajs/freeroom:<sha du commit>`.
4. La CI clone `k3s-gitops-lab`, remplace le tag d'image dans `apps/freeroom/deployment.yaml`, commit et push.
5. ArgoCD détecte le changement sur `k3s-gitops-lab` et synchronise automatiquement.
6. Le nouveau pod `freeroom` démarre avec la nouvelle image ; `docker/entrypoint.sh` applique le schéma et re-seed les salles avant de lancer `next start`.
7. Le trafic entrant (tunnel Cloudflare → Traefik → Service `freeroom`) arrive sur le nouveau pod dès qu'il est prêt.

## Sauvegarde et restauration

Postgres a été choisi précisément pour ça.

**Sauvegarde :**
```bash
docker compose exec db pg_dump -U amphi -d amphi_libre -F c -f /tmp/backup.dump
docker cp $(docker compose ps -q db):/tmp/backup.dump ./backup.dump
```

**Restauration** (efface et recharge les tables depuis le dump) :
```bash
docker cp ./backup.dump $(docker compose ps -q db):/tmp/backup.dump
docker compose exec db pg_restore -U amphi -d amphi_libre --clean --if-exists -1 /tmp/backup.dump
```

## Scénario d'incident (base coupée en plein fonctionnement)

Procédure pour démontrer que l'app gère proprement une panne de base, sans perte de données :

1. Réserver un créneau normalement (pour avoir une donnée à vérifier).
2. Couper la base : `docker compose stop db`.
3. Recharger la page ou tenter une réservation → l'app affiche une erreur claire (`app/error.tsx` : "Impossible de contacter le serveur"), pas un crash silencieux ni une page blanche.
4. Relancer la base : `docker compose start db`.
5. Recharger la page → l'app se reconnecte automatiquement (aucun redémarrage du conteneur `app` nécessaire), et la réservation faite à l'étape 1 est toujours là.

Vérifié manuellement pendant le développement (coupure/relance du conteneur `db`, vérification en base avant/après).

## Hors périmètre (volontairement)

Pas de gestion des salles via une interface (le catalogue vit dans `scripts/seed.ts`), pas de notifications email/SMS, pas de calendrier multi-semaines — un seul jour affiché à la fois —, pas d'OAuth/SSO. Voir `PRODUCT.md` pour le détail du périmètre produit et `DESIGN.md` pour le système de design.
