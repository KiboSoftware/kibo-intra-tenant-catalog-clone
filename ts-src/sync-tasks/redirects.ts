import { Configuration } from '@kibocommerce/rest-sdk';
import {
  DocumentsApi,
  Document,
} from '@kibocommerce/rest-sdk/clients/Content/index.js';
import { DOCUMENT_LISTS } from '../lib/constants.js';
import apiFetch from '../lib/api-fetch.js';

export type DocumentWithContent = {
  name: string;
  content?: any;
  document?: Document;
};
export type Redirect = {
  s: string;
  d: string;
  rw: boolean;
  t: boolean;
  q: boolean;
  e: boolean;
};

export type RedirectTransformer = (
  sourceRedirect: Redirect,
) => Promise<Redirect>;

async function defaultRedirectTransformer(sourceRedirect: Redirect) {
  return { ...sourceRedirect };
}
function transformPipeline(transformers: RedirectTransformer[]) {
  return (initialRedirect: Redirect) => {
    return transformers.reduce(
      async (prev: Promise<Redirect>, transformer: RedirectTransformer) => {
        return transformer(await prev);
      },
      Promise.resolve(initialRedirect),
    );
  };
}
function cloneRedirectDocument(
  sourceDoc: DocumentWithContent,
): DocumentWithContent {
  const { name, document } = sourceDoc;

  const {
    id,
    contentLength,
    insertDate,
    updateDate,
    contentUpdateDate,
    ...rest
  } = document as Document;
  rest.properties.data = new Date().toISOString();
  return {
    name,
    content: undefined,
    document: { ...rest },
  };
}
export class SyncRedirects {
  private api: DocumentsApi;
  private overwrite: boolean;
  private redirectTransformers: RedirectTransformer[];
  public results: any;
  constructor(
    public sourceDoc: DocumentWithContent,
    public targetDoc: DocumentWithContent,
    private targetConfiguration: Configuration,
    redirectTransformers: RedirectTransformer[] = [],
    overwrite: boolean = false,
  ) {
    if (!sourceDoc?.document || !sourceDoc?.content) {
      throw new Error(`Source redirect document is required`);
    }
    if (!targetConfiguration) {
      throw new Error(`Target configuration is required`);
    }
    this.api = new DocumentsApi(targetConfiguration);
    this.overwrite = overwrite;
    this.results = { errors: [], created: [], updated: [] };
    if (!targetDoc?.document) {
      this.targetDoc = cloneRedirectDocument(sourceDoc);
    }
    this.redirectTransformers = [
      defaultRedirectTransformer,
      ...(redirectTransformers || []),
    ];
  }
  async sync() {
    await this.transform();
    if ((this.targetDoc.document as any).id) {
      await this.updateDocument();
    } else {
      await this.createDocument();
    }
    await this.updateContent();
  }
  async transform() {
    this.targetDoc.content = [];
    const transform = transformPipeline(this.redirectTransformers);
    for (const sourceRedirect of this.sourceDoc.content) {
      const targetRedirect = await transform(sourceRedirect);
      this.targetDoc.content.push(targetRedirect);
    }
  }
  async updateContent() {
    const documentId = this.targetDoc.document?.id as string;
    const documentListName = this.targetDoc.document?.listFQN;
    const path =
      `/content/documentlists/{documentListName}/documents/{documentId}/content`
        .replace(
          `{${'documentListName'}}`,
          encodeURIComponent(String(documentListName)),
        )
        .replace(`{${'documentId'}}`, encodeURIComponent(String(documentId)));
    const method = 'PUT';
    try {
      const body: any = JSON.stringify(this.targetDoc.content);
      const response = await apiFetch(this.targetConfiguration, {
        path,
        method,
        body,
      });
      if (response.status >= 300) {
        throw new Error('unable to update target document content');
      }
      this.results.updated.push(`${documentId}`);
    } catch (error) {
      this.results.errors.push(error);
      console.error(
        `unable to update target document content: ${documentId} `,
        error,
      );
    }
  }
  async updateDocument() {
    const documentId = this.targetDoc.document?.id as string;
    try {
      const updatedDoc = await this.api.updateDocument({
        documentId,
        documentListName: this.targetDoc.document?.listFQN as string,
        document: this.targetDoc.document as Document,
      });
      this.targetDoc.document = updatedDoc;
      this.results.updated.push(`document updated ${documentId}`);
    } catch (error) {
      this.results.errors.push(error);
      console.error(`unable to update target document: ${documentId} `, error);
    }
  }
  async createDocument() {
    const documentId = this.targetDoc.document?.id as string;
    try {
      const newDoc = await this.api.createDocument({
        documentListName: DOCUMENT_LISTS.SITE_SETTINGS,
        document: this.targetDoc.document as Document,
      });
      this.targetDoc.document = newDoc;
      this.results.updated.push(`document created ${documentId}`);
    } catch (error) {
      this.results.errors.push(error);
      console.error(`unable to create target document: ${documentId} `, error);
    }
  }
}
