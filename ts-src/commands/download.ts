import { config } from '../config.js';
import { Configuration } from '@kibocommerce/rest-sdk';
import DocumentRetriever from '../lib/document-retriever.js';
import { DOCUMENT_LISTS } from '../lib/constants.js';

async function download() {
  const sourceConfig = new Configuration(config.source.api);
  const sourceDocumentRetriever = new DocumentRetriever(
    sourceConfig,
    './output/source',
  );

  const targetConfig = new Configuration(config.target.api);
  const targetDocumentRetriever = new DocumentRetriever(
    targetConfig,
    './output/target',
  );

  await Promise.all([
    targetDocumentRetriever.load(
      [
        DOCUMENT_LISTS.PAGES,
        DOCUMENT_LISTS.SITE_SETTINGS,
        DOCUMENT_LISTS.PAGE_TEMPLATE_CONTENT,
        DOCUMENT_LISTS.CATALOG_CONTENT,
      ],
      true,
    ),
    sourceDocumentRetriever.load(
      [
        DOCUMENT_LISTS.PAGES,
        DOCUMENT_LISTS.SITE_SETTINGS,
        DOCUMENT_LISTS.PAGE_TEMPLATE_CONTENT,
        DOCUMENT_LISTS.CATALOG_CONTENT,
      ],
      true,
    ),
  ]);
}

download();
