import { Configuration } from '@kibocommerce/rest-sdk/index.js';
import type { Document } from '@kibocommerce/rest-sdk/clients/Content';
import DocumentRetreiver from './document-retriever.js';
import { DOCUMENT_LISTS, DOCUMENT_NAMES } from './constants.js';

const findRedirectDoc = (siteSettings?: Document[]) =>
  siteSettings?.find((doc: Document) => doc.name === DOCUMENT_NAMES.REDIRECTS);

export class Site {
  documentRetriever: DocumentRetreiver;
  docs: Map<string, Document[]> = new Map<string, Document[]>();
  docsWithContent: Map<string, Document> = new Map<string, Document>();
  constructor(
    public configuration: Configuration,
    public sitePrefixlocale: string,
    private outputDirectory: string,
  ) {
    // this.documentsApi = new DocumentsApi(configuration);
    this.documentRetriever = new DocumentRetreiver(
      configuration,
      outputDirectory,
    );
  }
  async load(): Promise<void> {
    const docLists = Object.values(DOCUMENT_LISTS);
    this.docs = await this.documentRetriever.load(docLists);
  }
  async loadRedirectContent(): Promise<void> {
    if (this.docs.size === 0) {
      await this.load();
    }
    const document = findRedirectDoc(
      this.docs.get(DOCUMENT_LISTS.SITE_SETTINGS),
    );
    let content = null;
    if (document) {
      content = await this.documentRetriever.fetchDocumentContent(document);
    }
    const redirectDoc = { document, content, name: DOCUMENT_NAMES.REDIRECTS };
    this.docsWithContent.set(DOCUMENT_NAMES.REDIRECTS, redirectDoc);
  }
  static async initSite(config: any, outputDir: string) {
    const apiConfig = new Configuration(config.api);
    const site = new Site(apiConfig, config.sitePrefixlocale, outputDir);
    await site.load();
    await site.loadRedirectContent();
    return site;
  }
}
