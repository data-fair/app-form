# @data-fair/app-form

A data-fair application to create forms with incremental datasets

## Setup

Install the dependencies:

```bash
npm install
```

## Development Server

Start the development server on `http://localhost:3000`

```bash
npm run dev
```

## Production

Build the application for production:

```bash
npm run build
```

Locally preview production build:

```bash
npm run preview
```

## Deployment

Simply publish the project on the global npm registry (you need to be member of the owner organization).

    npm version PATCH|MINOR|MAJOR
    npm publish
    git push && git push --tags

If the release is a bug fix and you don't want to wait 24h (the cache delay of jsdelivr), you can purge the cache for the index.html file of the minor version in the CDN:

    curl https://purge.jsdelivr.net/npm/@data-fair/app-form@0.1/dist/index.html

To publish a version for testing purposes you can tag it as a pre-release and publish it with the tag "staging".

    npm version prerelease --preid=staging
    npm publish --tag staging
    curl https://purge.jsdelivr.net/npm/@data-fair/app-form@staging/dist/index.html
    curl https://purge.jsdelivr.net/npm/@data-fair/app-form@staging/dist/config-schema.json
    git push && git push --tags
