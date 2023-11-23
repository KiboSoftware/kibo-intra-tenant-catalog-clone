import { Configuration } from '@kibocommerce/rest-sdk';
import {
  DocumentsApi,
  Document,
} from '@kibocommerce/rest-sdk/clients/Content/index.js';
import { DOCUMENT_LISTS } from '../lib/constants.js';

const THEME_SETTINGS_PREFIX = 'theme_settings_';
function filterThemeSettings(documents: Document[]): Document[] {
  return (
    (documents?.filter(
      (doc) => doc.name?.startsWith(THEME_SETTINGS_PREFIX),
    ) as Document[]) || []
  );
}
function cloneDocument(themeSettingsDoc: Document): any {
  const { insertDate, updateDate, id, ...rest } = themeSettingsDoc;
  return rest;
}
function themeIdComparator(source: Document, target: Document) {
  return source.properties?.theme === target?.properties?.theme;
}
export class SyncThemeSettings {
  private api: DocumentsApi;
  private overwrite: boolean;
  public results: any;
  constructor(
    public sourceDoc: Map<string, Document[]>,
    public targetDoc: Map<string, Document[]>,
    private targetConfiguration: Configuration,
    overwrite: boolean = false,
  ) {
    this.api = new DocumentsApi(targetConfiguration);
    this.overwrite = overwrite;
    this.results = { errors: [], created: [], updated: [] };
  }
  async sync() {
    const sourceThemeSettings = filterThemeSettings(
      this.sourceDoc.get(DOCUMENT_LISTS.SITE_SETTINGS) as Document[],
    );
    const targetThemeSettings = filterThemeSettings(
      this.targetDoc.get(DOCUMENT_LISTS.SITE_SETTINGS) as Document[],
    );
    for (const sourceDoc of sourceThemeSettings) {
      const targetDoc = targetThemeSettings.find((doc) =>
        themeIdComparator(sourceDoc, doc),
      );
      if (targetDoc) {
        await this.updateDocument(targetDoc, sourceDoc);
      } else {
        const clonedDocument = cloneDocument(sourceDoc);
        await this.createDocument(clonedDocument);
      }
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
  private async updateDocument(
    targetDocument: Document,
    sourceDocument: Document,
  ) {
    try {
      targetDocument.properties = sourceDocument.properties;
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
        `Error updating document: ${error} source_name: ${sourceDocument.name} target_name: ${targetDocument.name}`,
      );
    }
  }
}
