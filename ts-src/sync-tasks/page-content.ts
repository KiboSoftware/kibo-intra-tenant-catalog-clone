import type { Configuration } from '@kibocommerce/rest-sdk';
import type {
  Document,
  DocumentsApiCreateDocumentRequest,
} from '@kibocommerce/rest-sdk/clients/Content';
import { DocumentsApi } from '@kibocommerce/rest-sdk/clients/Content/index.js';
import { DOCUMENT_LISTS } from '../lib/constants.js';
import {
  CmsPage,
  MultiSitePage,
  MultiSitePageMap,
} from '../lib/multi-site-page.js';

function cloneDocument(page: Document) {
  let { id, insertDate, updateDate, contentUpdateDate, ...rest } = page;
  return rest;
}
function tranformNavigationNode(
  multiSitePage: MultiSitePage,
  sourceTargetIdMap: any,
) {
  let node = multiSitePage.source?.navigation;
  if (!node) {
    return;
  }
  let { Id, OriginalId, ...targetNode } = node;
  targetNode.Id = `page^^pages@mozu^^${multiSitePage.target?.page?.id}`;
  targetNode.OriginalId = multiSitePage.target?.page?.id;
  if (targetNode?.ParentId.startsWith('page')) {
    const sourceId = targetNode.ParentId.split('^^').pop();
    const targetId = sourceTargetIdMap.get(sourceId);
    if (!targetId) {
      console.log(
        `No target id while trying to create new navigation node: ${sourceId}`,
      );
      return;
    }
    targetNode.ParentId = `page^^pages@mozu^^${targetId}`;
  }
  return targetNode;
}
function transformPipeline(transformers: any[]) {
  return (initial: any) => {
    return transformers.reduce(async (prev: Promise<any>, transformer: any) => {
      return transformer(await prev);
    }, Promise.resolve(initial));
  };
}
export class SyncPageContent {
  private api: DocumentsApi;
  private overwrite: boolean;
  public pageMap: Map<string, MultiSitePage>;
  public results: any;
  constructor(
    public sourceDocs: Map<string, Document[]>,
    public targetDocs: Map<string, Document[]>,
    targetConfiguration: Configuration,
    private contentTransformers: any[] = [],
    overwrite: boolean = false,
  ) {
    this.sourceDocs = sourceDocs;
    this.api = new DocumentsApi(targetConfiguration);
    this.overwrite = overwrite;
    this.pageMap = new Map();
    this.results = { errors: [], created: [], updated: [] };
  }
  async sync() {
    await this.syncPages();
    await this.syncMultiSiteNavigation();
    await this.syncTemplatesWithoutPages();
  }
  async syncPages() {
    const sourcePages = this.sourceDocs.get(DOCUMENT_LISTS.PAGES) as Document[];
    for (const sourcePage of sourcePages) {
      if (!sourcePage.name) {
        continue;
      }
      const multiSitePage = MultiSitePage.fromDocs(
        sourcePage.name as string,
        this.sourceDocs,
        this.targetDocs,
      );
      this.pageMap.set(sourcePage.name as string, multiSitePage);
      await this.syncPage(multiSitePage);
    }
  }
  async syncMultiSiteNavigation() {
    const navigationData = await this.buildTargetNavigationData();
    let targetNavDoc = this.targetDocs
      .get(DOCUMENT_LISTS.SITE_SETTINGS)
      ?.find((doc) => doc.name === 'navigation') as Document;
    if (!targetNavDoc) {
      targetNavDoc = {} as Document;
      targetNavDoc.name = 'navigation';
      targetNavDoc.listFQN = DOCUMENT_LISTS.SITE_SETTINGS;
      targetNavDoc.documentTypeFQN = 'document@mozu';
      targetNavDoc.properties = {};
      targetNavDoc.properties.data = navigationData;
      await this.createDocument(targetNavDoc);
      return;
    }
    targetNavDoc.properties.data = navigationData;
    await this.updateDocument(targetNavDoc);
  }
  async syncTemplatesWithoutPages() {
    const sourceTemplates = this.sourceDocs.get(
      DOCUMENT_LISTS.PAGE_TEMPLATE_CONTENT,
    ) as Document[];
    for (const sourceTemplate of sourceTemplates) {
      if (!sourceTemplate.name) {
        continue;
      }
      if (this.pageMap.has(sourceTemplate.name as string)) {
        continue;
      }
      const multiSitePage = MultiSitePage.fromDocs(
        sourceTemplate.name as string,
        this.sourceDocs,
        this.targetDocs,
      );
      this.pageMap.set(sourceTemplate.name as string, multiSitePage);
      await this.syncPage(multiSitePage);
    }
  }
  private async buildTargetNavigationData() {
    const sourceTargetIdMap = MultiSitePageMap.sourceToTargetPageIdMap(
      this.pageMap,
    );
    const navigationData = [];
    for (const [name, multiSitePage] of this.pageMap.entries()) {
      if (multiSitePage?.target?.navigation) {
        navigationData.push(multiSitePage.target.navigation);
        continue;
      }
      const newNavigationNode = tranformNavigationNode(
        multiSitePage,
        sourceTargetIdMap,
      );
      if (!newNavigationNode) {
        console.log(`skipping navigation node for page: ${name}`);
        continue;
      }
      navigationData.push(newNavigationNode);
    }
    return navigationData;
  }
  async syncPage(multiSitePage: MultiSitePage) {
    if (!multiSitePage.source) {
      return;
    }
    if (!multiSitePage.target) {
      multiSitePage.target = new CmsPage(multiSitePage.name);
    }
    if (multiSitePage.source?.page) {
      const targetPage = await this.createOrUpdateTargetPage(multiSitePage);
      multiSitePage.target.page = targetPage;
    }
    if (multiSitePage.source?.content) {
      const targetContent =
        await this.createOrUpdateTargetContent(multiSitePage);
      multiSitePage.target.content = targetContent;
    }
  }
  async createOrUpdateTargetContent(multiSitePage: MultiSitePage) {
    let targetDocument = multiSitePage.target?.content;
    if (!targetDocument) {
      targetDocument = cloneDocument(
        multiSitePage?.source?.content as Document,
      );
    }
    targetDocument.properties = multiSitePage.source?.content?.properties;
    const transform = transformPipeline(this.contentTransformers);
    targetDocument = (await transform(targetDocument)) as Document;
    if (!(targetDocument as Document).id) {
      targetDocument.id = multiSitePage.target?.page?.id;
    }
    if (!multiSitePage.target?.content) {
      return this.createDocument(targetDocument);
    } else {
      return this.updateDocument(targetDocument);
    }
  }
  async createOrUpdateTargetPage(multiSitePage: MultiSitePage) {
    let targetDocument = multiSitePage.target?.page;
    if (!targetDocument) {
      targetDocument = cloneDocument(multiSitePage?.source?.page as Document);
    }
    targetDocument.properties = multiSitePage.source?.content?.properties;
    const transform = transformPipeline(this.contentTransformers);
    targetDocument = await transform(targetDocument);
    if (!(targetDocument as Document).id) {
      return this.createDocument(targetDocument as Document);
    } else {
      return this.updateDocument(targetDocument as Document);
    }
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
}
