import { DOCUMENT_LISTS } from './constants.js';
import type { Document } from '@kibocommerce/rest-sdk/clients/Content';

export class CmsPage {
  constructor(
    public name: string,
    public page?: Document,
    public content?: Document,
    public navigation?: any,
  ) {}
  static fromDocs(name: string, documentCollection: Map<string, Document[]>) {
    try {
      let page: Document | undefined, content: Document | undefined, navigation;
      page = documentCollection
        .get(DOCUMENT_LISTS.PAGES)
        ?.find((doc) => doc.name === name);
      content = documentCollection
        .get(DOCUMENT_LISTS.PAGE_TEMPLATE_CONTENT)
        ?.find((doc) => doc.name === name);
      if (page) {
        navigation = documentCollection
          .get(DOCUMENT_LISTS.SITE_SETTINGS)
          ?.find((doc) => doc.name === 'navigation')
          ?.properties?.data.find(
            (node: any) => node.Id === 'page^^pages@mozu^^' + page?.id,
          );
      }
      return new CmsPage(name, page, content, navigation);
    } catch (error) {
      console.log(error);
    }
  }
}
export class MultiSitePage {
  constructor(
    public name: string,
    public source?: CmsPage,
    public target?: CmsPage,
  ) {}
  static fromDocs(
    name: string,
    sourceDocs: Map<string, Document[]>,
    targetDocs: Map<string, Document[]>,
  ) {
    return new MultiSitePage(
      name,
      CmsPage.fromDocs(name, sourceDocs),
      CmsPage.fromDocs(name, targetDocs),
    );
  }
}
export class MultiSitePageMap {
  static sourceToTargetPageIdMap(pageMap: Map<string, MultiSitePage>) {
    return Array.from(pageMap.values())
      .filter(
        (multiSitePage) =>
          multiSitePage?.source?.page && multiSitePage?.target?.page,
      )
      .reduce((map, multiSitePage) => {
        map.set(
          multiSitePage.source?.page?.id as string,
          multiSitePage.target?.page?.id as string,
        );
        return map;
      }, new Map());
  }
}
