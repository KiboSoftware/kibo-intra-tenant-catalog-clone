import { Configuration } from '@kibocommerce/rest-sdk';
import DocumentRetriever from '../lib/document-retriever.js';
import { DOCUMENT_LISTS } from '../lib/constants.js';

import {
  DocumentPublishingApi,
  DocumentsApi,
  Document,
} from '@kibocommerce/rest-sdk/clients/Content';
import { config } from '../config.js';

async function loadTargetDocuments(targetConfig: Configuration) {
  const targetDocumentRetriever = new DocumentRetriever(
    targetConfig,
    './output/target',
  );
  const targetDocuments = await targetDocumentRetriever.load(
    [
      DOCUMENT_LISTS.PAGES,
      DOCUMENT_LISTS.SITE_SETTINGS,
      DOCUMENT_LISTS.PAGE_TEMPLATE_CONTENT,
      DOCUMENT_LISTS.CATALOG_CONTENT,
    ],
    false,
  );
  return targetDocuments;
}
async function clearTargetDrafts(api: DocumentPublishingApi) {
  for (const documentList of [
    DOCUMENT_LISTS.PAGES,
    DOCUMENT_LISTS.SITE_SETTINGS,
    DOCUMENT_LISTS.PAGE_TEMPLATE_CONTENT,
    DOCUMENT_LISTS.CATALOG_CONTENT,
  ]) {
    await api.deleteDocumentDrafts({ documentLists: documentList });
  }
}
async function deleteDocuments(api: any, content: any) {
  for (const doc of content as Document[]) {
    await api.deleteDocument({
      documentListName: doc.listFQN,
      documentId: doc.id as string,
    });
  }
}
export async function clearTarget() {
  const targetConfig = new Configuration(config.target.api);
  const api = new DocumentsApi(targetConfig);
  const targetPublishing = new DocumentPublishingApi(targetConfig);
  const targetDocuments = await loadTargetDocuments(targetConfig);
  // const pages = targetDocuments.get(DOCUMENT_LISTS.PAGES)
  // const content = targetDocuments.get(DOCUMENT_LISTS.PAGE_TEMPLATE_CONTENT)
  const catalogContent = targetDocuments.get(DOCUMENT_LISTS.CATALOG_CONTENT);
  await clearTargetDrafts(targetPublishing);
  // await deleteDocuments(api, content)
  // await deleteDocuments(api, pages)
  await deleteDocuments(api, catalogContent);

  // const nav = targetDocuments
  //   .get(DOCUMENT_LISTS.SITE_SETTINGS)
  //   ?.find((doc) => doc.name === 'navigation')
  // if (nav) {
  //   nav.properties.data = []
  //   await api.updateDocument({
  //     documentListName: DOCUMENT_LISTS.SITE_SETTINGS,
  //     documentId: nav.id as string,
  //     document: nav,
  //   })
  // }
  await targetPublishing.publishDocuments();
}

(async () => {
  await clearTarget();
})();
