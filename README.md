# FreeRoom

Voir quelles salles de l'école sont libres à un instant donné et réserver un créneau court, sans tourner dans les couloirs.

Projet étudiant (ESGI, Tech Venture Sprint). Périmètre volontairement minimal : une seule fonctionnalité de bout en bout — connexion, liste des salles avec créneaux libres/occupés du jour (mise à jour automatique toutes les 8s, créneaux passés non réservables), réservation, annulation.

## Stack

- **Next.js 16** (App Router), TypeScript, React 19
- **PostgreSQL** (choisi pour permettre une sauvegarde/restauration simple avec `pg_dump`/`pg_restore`, voir plus bas)
- **postgres.js**, SQL brut, pas d'ORM
- Auth maison : session cookie signée (JWT via `jose`), mots de passe hashés avec `bcryptjs`, rate limiting (5 tentatives / 15 min par IP) sur `/login` et `/signup`
- **Vitest** pour les tests
- Tailwind CSS v4 pour le style (responsive)

## Prérequis

- Node.js 22+ (testé avec Node 26)
- Docker (pour Postgres en local, et pour le déploiement complet)

## Lancer le projet en local

```bash
npm install

cp .env.example .env
# éditer .env : générer un SESSION_SECRET avec `openssl rand -base64 32`

npm run db:up       # démarre Postgres dans Docker (port 5432)
npm run db:migrate  # crée les tables
npm run db:seed     # crée les 8 salles de démo

npm run dev
```

L'app est sur [http://localhost:3000](http://localhost:3000). Créer un compte via `/signup`, se connecter, réserver un créneau.

Pour arrêter la base : `npm run db:down`.

## Tests

```bash
npm test
```

Ça migre automatiquement une base Postgres **dédiée aux tests** (`amphi_libre_test`, isolée de la base de dev, via `.env.test` — support natif de Next.js pour l'environnement `test`), puis lance Vitest. Deux suites couvrent les points obligatoires du cahier des charges :

- `lib/bookings.test.ts` — logique de double-booking (le 2e essai sur le même créneau échoue proprement, sans écraser le premier) et logique d'annulation (un utilisateur ne peut pas annuler la réservation d'un autre).
- `tests/api/cancel-authorization.test.ts` — test d'intégration qui démarre un vrai serveur Next et appelle réellement `DELETE /api/bookings/:id` avec le cookie de session d'un autre utilisateur, vérifie une réponse **403**, puis avec le bon utilisateur vérifie **204**.

## Déploiement (Docker)

```bash
cp .env.example .env
# éditer .env : POSTGRES_USER / POSTGRES_PASSWORD / SESSION_SECRET (valeurs de prod, pas celles de dev)

docker compose up --build -d
```

Ça démarre trois services :

- `db` — PostgreSQL 16, avec un volume persistant
- `app` — l'application Next.js (migre le schéma et re-seed les salles au démarrage, de façon idempotente, avant de lancer le serveur)
- `proxy` — Nginx en reverse proxy devant l'app, exposé sur le port `80`

L'app est accessible sur `http://localhost` (port 80, via le reverse proxy). `SESSION_SECRET` et les identifiants Postgres sont lus depuis `.env` (jamais en dur dans le code ou l'image).

## Sauvegarde et restauration

Postgres a été choisi précisément pour ça. Sauvegarde :

```bash
docker compose exec db pg_dump -U amphi -d amphi_libre -F c -f /tmp/backup.dump
docker cp $(docker compose ps -q db):/tmp/backup.dump ./backup.dump
```

Restauration (efface et recharge les tables depuis le dump) :

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

Ce scénario a été vérifié manuellement pendant le développement (coupure/relance du conteneur `db`, vérification en base avant/après).

## Structure du projet

```
app/                  pages et Route Handlers (App Router)
  api/bookings/        POST (créer) / DELETE (annuler) une réservation
  login/, signup/       formulaires d'authentification
  page.tsx              grille des salles/créneaux du jour
  reservations/          liste "Mes réservations" (à venir, avec annulation)
lib/
  db.ts                 client postgres.js
  session.ts, dal.ts     session cookie signée + verifySession()/getUser()
  bookings.ts            logique métier (créneaux, création, annulation)
  actions/auth.ts         Server Actions signup/login/logout
db/schema.sql          schéma SQL (contrainte unique room_id+date+start_hour)
scripts/                seed, migration, setup de la base de test
proxy.ts                redirections optimistes (anciennement `middleware.ts`)
docker-compose.yml      db + app + reverse proxy
```

## Ce qui est hors périmètre (volontairement)

Pas d'ajout/suppression de salles via une interface, pas de notifications email/SMS, pas de calendrier multi-semaines — un seul jour affiché à la fois. Voir `AGENTS.md` pour le détail du périmètre MVP.
