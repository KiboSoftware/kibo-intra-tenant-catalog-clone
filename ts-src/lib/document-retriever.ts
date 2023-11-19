import type { Configuration } from '@kibocommerce/rest-sdk';
import { DocumentsApi } from '@kibocommerce/rest-sdk/clients/Content/index.js';
import type {
  DocumentsApiGetDocumentsRequest,
  Document,
} from '@kibocommerce/rest-sdk/clients/Content';
import ActionTracker from './action-tracker.js';
import fs from 'fs/promises';
import path from 'path';
import apiFetch from './api-fetch.js';

class DocumentRetriever {
  private outputDirectory?: string;
  private documentsApi: DocumentsApi;
  includeInactive: boolean;

  constructor(
    private targetConfiguration: Configuration,
    outputDirectory?: string,
    includeInactive?: boolean,
  ) {
    this.outputDirectory = outputDirectory;
    this.documentsApi = new DocumentsApi(targetConfiguration);
    this.includeInactive = includeInactive || false;
  }
  async fetchDocuments(
    documentListName: string,
    startIndex: number,
    pageSize: number,
  ): Promise<Document[]> {
    let data: any[] = [];
    try {
      ActionTracker.addAction(
        `fetch-${documentListName}-${startIndex}`,
        'FETCH',
        documentListName,
      );
      const documentsRequest: DocumentsApiGetDocumentsRequest = {
        documentListName,
        startIndex,
        pageSize,
        includeInactive: this.includeInactive,
        // includeSubPaths: true,
      };
      const documents = await this.documentsApi.getDocuments(documentsRequest);
      data = documents.items || [];
    } catch (error) {
      console.error(`Error fetching documents: ${error}`);
      ActionTracker.markFailed(
        `fetch-${documentListName}-${startIndex}`,
        error as any,
      );
    }
    return data;
  }
  async fetchDocumentList(
    documentListName: string,
    startIndex: number,
    pageSize: number,
    collected: any[],
  ): Promise<Document[]> {
    const data = await this.fetchDocuments(
      documentListName,
      startIndex,
      pageSize,
    );
    const joinedData = [...collected, ...data];
    if (data.length < pageSize) {
      return joinedData;
    }
    return this.fetchDocumentList(
      documentListName,
      startIndex + pageSize,
      pageSize,
      joinedData,
    );
  }
  async findDocument(
    documentListName: string,
    documentName: string,
  ): Promise<any> {
    try {
      const documentsRequest: DocumentsApiGetDocumentsRequest = {
        documentListName,
        filter: `name eq '${documentName}'`,
      };
      return this.documentsApi.getDocuments(documentsRequest);
    } catch (error) {}
  }
  // Write data to JSON file
  async writeJSONFile(
    data: any,
    listName: string,
    documentName?: string,
  ): Promise<void> {
    if (!this.outputDirectory) {
      throw new Error('Output directory not set');
    }
    try {
      await fs.access(this.outputDirectory);
    } catch (error) {
      console.error(`Error writing local json file: ${error}`);
      await fs.mkdir(this.outputDirectory, { recursive: true });
    }
    try {
      const fileName = documentName ? `${listName}-${documentName}` : listName;
      const filePath = path.join(this.outputDirectory, `${fileName}.json`);
      ActionTracker.addAction(`write-${listName}`, 'write', listName, {
        filePath,
      });
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      ActionTracker.markFailed(`write-${listName}`, error as any);
      console.error(`Error writing JSON file: ${error}`);
    }
  }
  // fetch all documents in a list and optionally write them to output directory
  async load(
    documentLists: string[],
    persist: boolean = false,
  ): Promise<Map<string, Document[]>> {
    const map = new Map<string, Document[]>();
    for (const documentList of documentLists) {
      const content = await this.fetchDocumentList(documentList, 0, 200, []);
      map.set(documentList, content);
      if (persist) {
        await this.writeJSONFile(content, documentList);
      }
    }
    return map;
  }
  async fetchDocumentContent(document: Document): Promise<any> {
    const documentId = document.id as string;
    const documentListName = document.listFQN;
    const path =
      `/content/documentlists/{documentListName}/documents/{documentId}/content`
        .replace(
          `{${'documentListName'}}`,
          encodeURIComponent(String(documentListName)),
        )
        .replace(`{${'documentId'}}`, encodeURIComponent(String(documentId)));

    try {
      const response = await apiFetch(this.targetConfiguration, {
        path,
        method: 'GET',
      });
      if (response.status >= 200) {
        const ctext = await response.text();
        return JSON.parse(ctext);
      }
    } catch (error) {
      console.error(`Error fetching document content: ${error}`);
    }
  }
}

export default DocumentRetriever;
