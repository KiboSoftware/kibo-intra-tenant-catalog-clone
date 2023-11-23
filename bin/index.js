#! /usr/bin/env node

import dotenv from 'dotenv';
import fs from 'fs';
import Yargs from 'yargs/yargs';
import CatalogCloneUtil from '../src/catalog-sync-util.js';
import syncContent from '../dist/commands/sync.js';

dotenv.config();
import { bootstrap } from 'global-agent';
bootstrap();

function createCloneUtil() {
  validateVariables();
  const apiRoot = process.env.API_URL;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const tenantId = apiRoot.match(/https:\/\/t(\d+)/)[1];
  const masterCatalog = parseInt(process.env.MASTER_CATALOG);
  const primeCatalog = parseInt(process.env.PRIME_CATALOG);
  const catalogPairs = JSON.parse(process.env.CATALOG_PAIRS);
  const sitePairs = JSON.parse(process.env.SITE_PAIRS);
  const catalogCloneUtil = new CatalogCloneUtil(
    apiRoot,
    clientId,
    clientSecret,
    masterCatalog,
    primeCatalog,
    catalogPairs,
    sitePairs,
    tenantId,
  );
  return catalogCloneUtil;
}

async function validateVariables() {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    throw new Error('API_URL environment variable is not set');
  }
  if (!/^https?:\/\/.+\/api$/.test(apiUrl)) {
    throw new Error('API_URL environment variable is not a valid URL');
  }

  const clientId = process.env.CLIENT_ID;
  if (!clientId) {
    throw new Error('CLIENT_ID environment variable is not set');
  }
  if (!clientId) {
    throw new Error('CLIENT_ID environment variable is not a valid client ID');
  }

  const clientSecret = process.env.CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error('CLIENT_SECRET environment variable is not set');
  }
  if (!/^[a-f0-9]{32}$/i.test(clientSecret)) {
    throw new Error(
      'CLIENT_SECRET environment variable is not a valid client secret',
    );
  }

  const catalogPairs = process.env.CATALOG_PAIRS;
  if (!catalogPairs) {
    throw new Error('CATALOG_PAIRS environment variable is not set');
  }
  try {
    const pairs = JSON.parse(catalogPairs);
    if (!Array.isArray(pairs) || pairs.length === 0) {
      throw new Error(
        'CATALOG_PAIRS environment variable is not a valid JSON array',
      );
    }
    for (const pair of pairs) {
      if (!pair.source || !pair.destination) {
        throw new Error(
          'CATALOG_PAIRS environment variable contains invalid pair',
        );
      }
    }
  } catch (error) {
    throw new Error(
      'CATALOG_PAIRS environment variable is not a valid JSON array',
    );
  }

  const sitePairs = process.env.SITE_PAIRS;
  if (!sitePairs) {
    throw new Error('SITE_PAIRS environment variable is not set');
  }
  try {
    const pairs = JSON.parse(sitePairs);
    if (!Array.isArray(pairs) || pairs.length === 0) {
      throw new Error(
        'SITE_PAIRS environment variable is not a valid JSON array',
      );
    }
    for (const pair of pairs) {
      if (!pair.source || !pair.destination) {
        throw new Error(
          'SITE_PAIRS environment variable contains invalid pair',
        );
      }
    }
  } catch (error) {
    throw new Error(
      'SITE_PAIRS environment variable is not a valid JSON array',
    );
  }

  const primeCatalog = process.env.PRIME_CATALOG;
  if (!primeCatalog) {
    throw new Error('PRIME_CATALOG environment variable is not set');
  }
  if (
    isNaN(primeCatalog) ||
    parseInt(primeCatalog) !== parseFloat(primeCatalog)
  ) {
    throw new Error('PRIME_CATALOG environment variable is not a valid number');
  }

  const masterCatalog = process.env.MASTER_CATALOG;
  if (!masterCatalog) {
    throw new Error('MASTER_CATALOG environment variable is not set');
  }
  if (
    isNaN(masterCatalog) ||
    parseInt(masterCatalog) !== parseFloat(masterCatalog)
  ) {
    throw new Error(
      'MASTER_CATALOG environment variable is not a valid number',
    );
  }
}

/*
  API_URL=https://t100016.sb.euw1.kibocommerce.com/api
CLIENT_ID=afg.data_connector.1.0.0.Release
CLIENT_SECRET=91faf1355b0e4718b95a37a732c9fae5
CATALOG_PAIRS='[{"source":5,"destination":7}, {"source":6,"destination":8}]'
SITE_PAIRS='[{"source":100148,"destination":100150}, {"source":100149,"destination":100151}]'
PRIME_CATALOG=5
MASTER_CATALOG=2
  */

Yargs(process.argv.slice(2))
  // .option('all', {
  //   alias: 'a',
  //   type: 'boolean',
  //   describe: 'include all resources',
  // })

  .command({
    command: 'categories',
    desc: 'categories',
    handler: (argv) => {
      performActions(['categorySync'], argv);
    },
  })
  .command({
    command: 'settings',
    desc: 'settings',
    handler: (argv) => {
      performActions(['snycSiteSettings'], argv);
    },
  })
  .command({
    command: 'entities',
    desc: 'entities',
    handler: (argv) => {
      performActions(['syncEntities'], argv);
    },
  })
  .command({
    command: 'search-settings',
    desc: 'search-settings',
    handler: (argv) => {
      performActions(['syncSearchSettings'], argv);
    },
  })
  .command({
    command: 'search-facets',
    desc: 'search-redirects',
    handler: (argv) => {
      performActions(['syncFacets'], argv);
    },
  })
  .command({
    command: 'search-merchandising',
    desc: 'search-merchandising',
    handler: (argv) => {
      performActions(['syncMerchandisingSettings'], argv);
    },
  })
  .command({
    command: 'search-all',
    desc: 'search-all',
    handler: (argv) => {
      performActions(
        ['syncSearchSettings', 'syncFacets', 'syncMerchandisingSettings'],
        argv,
      );
    },
  })
  .command(
    'sync-content',
    'sync-content',
    (yargs) => {
      yargs.options({
        pages: {
          type: 'boolean',
          description: 'Specify pages',
          requiresArg: false,
        },
        redirects: {
          type: 'boolean',
          description: 'Specify redirects',
          requiresArg: false,
        },
        catalogContent: {
          type: 'boolean',
          description: 'Specify catalog content',
          requiresArg: false,
        },
        themeSettings: {
          type: 'boolean',
          description: 'Specify theme settings',
          requiresArg: false,
        },
      });
    },
    (argv) => {
      syncContent(argv);
    },
  )
  .command({
    command:
      'sync-content2 [pages] [redirects] [catalogContent] [themeSettings]',
    desc: 'sync-content',
    args: {},
    handler: (argv) => {
      syncContent(argv);
    },
  })
  .command({
    command: 'products',
    desc: 'products',
    handler: (argv) => {
      performActions(['syncProductInCatalogs'], argv);
    },
  })
  .command({
    command: 'clean-category-prefixes',
    desc: 'clean-category-prefixes',
    handler: (argv) => {
      performActions(['cleanCategories'], argv);
    },
  })
  .command({
    command: 'validate-config',
    desc: 'initEnv #copies creates an empty .env file',
    handler: (argv) => {
      performActions(['validateAccountSettings'], argv);
    },
  })
  .command({
    command: 'init-env',
    desc: 'initEnv #copies creates an empty .env file',
    handler: () => {
      initEnv();
    },
  })
  .demandCommand()
  .strict()
  .help().argv;

async function performActions(actions, args) {
  var app = createCloneUtil();
  if (actions.indexOf('validateAccountSettings') == -1) {
    actions.unshift('validateAccountSettings');
  }
  for (const action of actions) {
    console.log(`performing action ${action}`);
    await app[action](args);
    console.log(`completed action ${action}`);
  }
}

function initEnv() {
  const template = `
$API_URL=https://t***.com/api
CLIENT_ID=
CLIENT_SECRET=
HTTPS_PROXY=
CATALOG_PAIRS='[{"source":5,"destination":7}, {"source":6,"destination":8}]'
SITE_PAIRS='[{"source":x,"destination":y}, {"source":a,"destination":b}]'
PRIME_CATALOG=
MASTER_CATALOG=
#required for sync-content
SOURCE_TENANT=
SOURCE_SITE=
SOURCE_SITE_PREFIX_LOCALE=en-xx
TARGET_TENANT=
TARGET_SITE=
TARGET_SITE_PREFIX_LOCALE=en-xx
`;
  if (fs.existsSync('.env')) {
    console.log('.env file already exists');
    process.exit(1);
  }
  fs.writeFileSync('.env', template);
  console.log('update the .env.yaml file');
}
