import type { Configuration } from '@kibocommerce/rest-sdk';
import type {
  Document,
  DocumentsApiCreateDocumentRequest,
} from '@kibocommerce/rest-sdk/clients/Content';
import { DocumentsApi } from '@kibocommerce/rest-sdk/clients/Content/index.js';
import { DOCUMENT_LISTS } from '../lib/constants.js';
import { CategoryMap } from '../lib/category-map.js';

function parseCategoryId(name?: string): number | undefined {
  if (!name) return;
  const parts = name.split('-');
  let idPart = parts[parts.length - 1];
  return parseInt(idPart);
}
function cloneDocument(targetCategoryId: number, document: Document) {
  let { id, insertDate, updateDate, contentUpdateDate, ...rest } = document;
  let clonedDocument: Document = { ...rest };
  clonedDocument.name = `category-${targetCategoryId}`;
  clonedDocument.properties.translated = false;
  return clonedDocument;
}
function transformPipeline(transformers: any[]) {
  return (initial: any) => {
    return transformers.reduce(async (prev: Promise<any>, transformer: any) => {
      return transformer(await prev);
    }, Promise.resolve(initial));
  };
}
export class SyncCatalogContent {
  private api: DocumentsApi;
  private overwrite: boolean;
  public results: any;
  constructor(
    public sourceDocs: Map<string, Document[]>,
    public targetDocs: Map<string, Document[]>,
    public categoryMap: CategoryMap,
    targetConfiguration: Configuration,
    private contentTransformers: any[] = [],
    overwrite: boolean = false,
  ) {
    this.sourceDocs = sourceDocs;
    this.api = new DocumentsApi(targetConfiguration);
    this.overwrite = overwrite;
    this.results = { errors: [], created: [], updated: [] };
  }

  async sync() {
    const catalogContent = this.sourceDocs.get(DOCUMENT_LISTS.CATALOG_CONTENT);
    const categoryContent = catalogContent?.filter(
      (doc) => doc.name?.startsWith('category'),
    );
    await this.syncCategoryContent(categoryContent as Document[]);
  }
  async syncCategoryContent(categoryContent: Document[]) {
    for (const content of categoryContent) {
      let sourceCategoryId = parseCategoryId(content.name as string);
      if (!sourceCategoryId) {
        console.log(
          'skipping, malfomed category content document name: ' + content.name,
        );
        continue;
      }

      let targetCategoryId =
        this.categoryMap.sourceTargetMap.get(sourceCategoryId);
      if (!targetCategoryId) {
        console.log(
          'skipping, could not find target category for source category: ' +
            sourceCategoryId,
        );
        continue;
      }
      await this.createOrUpdateTarget(targetCategoryId, content);
    }
  }
  async createOrUpdateTarget(
    targetCategoryId: number,
    sourceDocument: Document,
  ) {
    const existingDoc = await this.existingTargetDoc(targetCategoryId);
    let targetDocument: any = existingDoc;
    if (!targetDocument) {
      targetDocument = cloneDocument(
        targetCategoryId,
        sourceDocument,
      ) as Document;
    }
    if (!targetDocument) {
      targetDocument.properties = sourceDocument.properties;
    }
    const transformedDocument = await transformPipeline(
      this.contentTransformers,
    )(targetDocument);
    if (transformedDocument.id) {
      console.log('found existing category content in target');
      if (existingDoc && this.overwrite) {
        console.log('overwriting existing category content in target');
        await this.updateDocument(transformedDocument);
      }
    } else {
      console.log('creating new category content in target');
      await this.createDocument(transformedDocument);
    }
  }
  private async existingTargetDoc(targetCategoryId: number) {
    return this.targetDocs
      .get(DOCUMENT_LISTS.CATALOG_CONTENT)
      ?.find((doc) => doc.name === `category-${targetCategoryId}`);
  }
  private async createDocument(targetDocument: Document) {
    try {
      const newDocument = await this.api.createDocument({
        document: targetDocument,
        documentListName: targetDocument.listFQN as string,
      });
      this.results.created.push(newDocument);
      return newDocument;
    } catch (error) {
      this.results.errors.push(error);
      console.error(`Error creating document: ${error}`);
    }
  }
  private async updateDocument(targetDocument: Document) {
    try {
      const updatedDoc = await this.api.updateDocument({
        documentId: targetDocument.id as string,
        document: targetDocument,
        documentListName: targetDocument.listFQN as string,
      });
      this.results.updated.push(updatedDoc);
      return updatedDoc;
    } catch (error) {
      this.results.errors.push(error);
      console.error(
        `Error updating document: ${error} target_name: ${targetDocument.name}`,
      );
    }
  }
  // private async createDocument(targetCategoryId: number, sourceDocument: Document) {
  //   try {
  //     const targetDocument = cloneDocument(targetCategoryId, sourceDocument)
  //     const newDocument = await this.api.createDocument({
  //       document: targetDocument,
  //       documentListName: DOCUMENT_LISTS.CATALOG_CONTENT,
  //     })
  //     this.results.created.push(newDocument)
  //   } catch (error) {
  //     this.results.errors.push(error)
  //     console.error(`Error creating document: ${error}`)
  //   }
  // }
  // private async updateDocument(sourceDocument: Document, targetDocument: Document) {
  //   try {
  //     targetDocument.properties = sourceDocument.properties
  //     const updatedDoc = await this.api.updateDocument({
  //       documentId: targetDocument.id as string,
  //       document: sourceDocument,
  //       documentListName: DOCUMENT_LISTS.CATALOG_CONTENT,
  //     })
  //     this.results.updated.push(updatedDoc)
  //   } catch (error) {
  //     this.results.errors.push(error)
  //     console.error(
  //       `Error updating document: ${error} source_name: ${sourceDocument.name} target_name: ${targetDocument.name}`
  //     )
  //   }
  // }
}
