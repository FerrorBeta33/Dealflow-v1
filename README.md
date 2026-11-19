# DealerFlow

DealerFlow is a dealership operations app for managing vehicle inventory, customers, bookings, orders, invoices, payment tracking, documents, and delivery workflows. It includes employee sign-in, role-based access, and a command center for operational reporting.

## Stack

- React and TypeScript frontend, built with Vite.
- Express API with server-side validation and access checks.
- SQLite through `better-sqlite3`, with uploaded documents stored on disk.
- A production container that serves the frontend and API from one origin.

## Local setup

Use Node.js compatible with the manifest's `>=22.12` requirement and npm. The deployment image pins Node.js to `22.23.2`. Native dependencies may require Python and a C/C++ build toolchain if a prebuilt binary is unavailable.

```sh
npm ci
npm run seed
npm run dev
```

The frontend listens on port `4173`; Vite forwards `/api` requests to the API on port `4174`. Both servers bind to `0.0.0.0`.

The seed command creates fictional demo records and employee accounts. It generates a password and saves access details in `.data/demo-access.json`, which is ignored by Git. Read that file locally to sign in; do not commit or share it. Existing populated data is retained when seeding is skipped. Change or remove demo accounts before real use.

Stop local development with `Ctrl+C`.

## Configuration and data

Configuration is read from the process environment. `.env.example` is a reference; the app does not automatically load a `.env` file.

| Variable        | Purpose                                                      | Default                       |
| --------------- | ------------------------------------------------------------ | ----------------------------- |
| `DATA_DIR`      | Directory containing the SQLite database and uploads         | `.data`                       |
| `API_PORT`      | API listening port                                           | `4174`; container uses `8080` |
| `DEMO_PASSWORD` | Optional password for the explicit demo-seeding command      | Randomly generated            |
| `NODE_ENV`      | Set to `production` to serve the built frontend from Express | Unset locally                 |

The default SQLite file is `.data/dealerflow.sqlite`; uploads are under `.data/uploads`. Changing `API_PORT` during local development also requires updating Vite's API proxy target.

Never put database files, uploaded documents, credentials, or environment secrets into the container image or Git. Back up the database and uploaded documents together using a SQLite-consistent backup procedure.

## Checks and production build

```sh
npm run type-check
npm run lint
npm test
npm run build
```

`npm test` runs API/database tests and React component tests. `npm run build` type-checks the frontend and writes its production assets to `apps/web/dist`. `npm run format` formats the repository.

To serve the production build locally after building, use a POSIX shell:

```sh
NODE_ENV=production API_PORT=8080 node apps/api/server.js
```

`GET /health` returns HTTP 200 with `{"status":"ok"}` when its database probe succeeds. API routes remain under `/api`; frontend routes fall back to the built app, while missing assets and API requests do not receive the frontend HTML.

## Deploy on Revolte

Deployment configuration is in `revolte.yml`, targeting project **DealerFlow** and application **dealerflow**. These names must match the selections in Revolte.

The root `Dockerfile` installs from the npm lockfile, builds the frontend, and runs Express as a non-root user on port `8080`. `.dockerignore` excludes local data, secrets, dependency directories, and generated output. The image does not seed accounts or include local data.

Follow the [Revolte Interactive Chat deployment guide](https://docs.revolte.ai/deploy-operate/from-interactive-chat.md):

1. Connect the repository and configure a cloud provider in Revolte.
2. Select **View Preview**, review the changed files, and use **Proceed** to commit and push them.
3. Select the matching project, application, and cloud infrastructure.
4. Review the **Preview** configuration, select **Launch**, and confirm the launch checklist.
5. Monitor deployment logs and confirm the service health check becomes live.

A fresh deployment has no employee accounts. For fictional demo use only, run `npm run seed` once inside the deployed runtime with the same `DATA_DIR` as the service. Generated access details are saved in that directory's `demo-access.json`; never expose this file through a public endpoint or logs. The sandbox preview and managed cloud deployment have separate data.

### Environment mappings

| Environment | Branch                                 |
| ----------- | -------------------------------------- |
| Preview     | Feature branch selected for deployment |
| QA          | `qa`                                   |
| Staging     | `staging`                              |
| Production  | `main`                                 |

QA and staging branches were not present when deployment configuration was prepared. Their configuration blocks are scaffolding, not evidence of deployed environments.

### Before using real data or deploying production

- **Confirm durable storage.** SQLite and uploaded documents currently live in `/app/.data` inside the container. The resource `storage` setting alone does not establish a persistent mount or guarantee survival across container replacement. Do not assume redeploys preserve this data.
- **Resolve multi-replica storage first.** The production template includes autoscaling, but independent container-local SQLite databases and upload directories cannot safely support multiple replicas. Production requires a reviewed persistence architecture and matching scaling settings before launch.
- **Check load-balancer validation.** The configuration uses `shared` in every environment. Revolte may require `dedicated` for production; resolve any validation error before launching production.
- **Replace demo access and establish backups.** Demo fixtures are not a production account-provisioning strategy. Verify access controls and recovery procedures before storing dealership information.

The production Docker image still needs an actual Docker build and runtime check in an environment with Docker available. A successful frontend build or sandbox preview does not verify the deployment image.

See also the [Revolte deployment overview](https://docs.revolte.ai/deploy-operate/overview) and [web-service configuration reference](https://docs.revolte.ai/yaml/environment-settings/resource-specifications/web-service.md).
