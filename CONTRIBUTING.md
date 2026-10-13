# Contributing to Homebranch Web

Homebranch development is coordinated in the [Homebranch project repository](https://github.com/Oghamark/homebranch). Follow its [contribution guidelines](https://github.com/Oghamark/homebranch/blob/dev/CONTRIBUTING.md) for the issue process, integrated Docker development environment, pull request expectations, and changes that span components.

## Web development

To work on the web client as part of the full application, clone the project repository with submodules and start the development stack:

```sh
git clone --recurse-submodules https://github.com/Oghamark/homebranch.git
cd homebranch
cp .env.example .env
docker compose -f docker-compose.dev.yml up
```

The web client is available at http://localhost:5173. To run it independently:

```sh
npm ci
npm run dev
```

Run the type check before submitting a pull request:

```sh
npm run typecheck
```

Submit web source changes to the [homebranch-web repository](https://github.com/Oghamark/homebranch-web). The Homebranch workspace updates its submodule reference separately after the web change is ready to integrate.
