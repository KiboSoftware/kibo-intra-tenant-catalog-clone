import type { Configuration } from '@kibocommerce/rest-sdk';
// import ActionTracker from './action-tracker';
import {
  CategoriesApi,
  Category,
} from '@kibocommerce/rest-sdk/clients/CatalogAdministration/index.js';

export type CategoryComparator = (
  source: Category,
  target: Category,
) => boolean;

function defaultComparator(source: Category, target: Category) {
  return source.categoryCode === target.categoryCode;
}
export class CategoryMap {
  sourceCategoriesApi: CategoriesApi;
  targetCategoriesApi: CategoriesApi;
  sourceTargetMap: Map<number, number>;
  comparator: CategoryComparator;
  constructor(
    sourceConfiguration: Configuration,
    targetConfiguration: Configuration,
    comparator?: CategoryComparator,
  ) {
    this.sourceCategoriesApi = new CategoriesApi(sourceConfiguration);
    this.targetCategoriesApi = new CategoriesApi(targetConfiguration);
    this.sourceTargetMap = new Map();
    this.comparator = comparator || defaultComparator;
  }
  async fetchCategories(
    api: CategoriesApi,
    startIndex: number,
    pageSize: number,
  ): Promise<any[]> {
    let data: any[] = [];
    try {
      const categoryCollection = await api.getCategories({
        startIndex,
        pageSize,
      });
      data = categoryCollection.items || [];
    } catch (error) {
      console.error(`Error fetching categories: ${error}`);
    }
    return data;
  }
  async fetchAllCategories(
    api: CategoriesApi,
    startIndex: number,
    pageSize: number,
    collected: any[],
  ): Promise<Category[]> {
    const data = await this.fetchCategories(api, startIndex, pageSize);
    const joinedData = [...collected, ...data];
    if (data.length < pageSize) {
      return joinedData;
    }
    return this.fetchAllCategories(
      api,
      startIndex + pageSize,
      pageSize,
      joinedData,
    );
  }
  async fetchSourceCategories() {
    return this.fetchAllCategories(this.sourceCategoriesApi, 0, 200, []);
  }
  async fetchTargetCategories() {
    return this.fetchAllCategories(this.targetCategoriesApi, 0, 200, []);
  }
  async build() {
    this.sourceTargetMap = new Map();
    try {
      const sourceCategories = await this.fetchSourceCategories();
      const targetCategories = await this.fetchTargetCategories();

      for (const sourceCategory of sourceCategories) {
        const targets = targetCategories.filter((c) =>
          this.comparator(sourceCategory, c),
        );
        if (targets.length > 1) {
          console.log(
            `Found multiple target categories for ${sourceCategory.categoryCode}`,
          );
          continue;
        }
        const targetCategory = targets[0];
        if (targetCategory) {
          this.sourceTargetMap.set(
            sourceCategory.id as number,
            targetCategory.id as number,
          );
        } else {
          console.log(
            `Could not find target category for ${sourceCategory.categoryCode}`,
          );
        }
      }
    } catch (error) {
      console.error(`Error building category map: ${error}`);
      throw error;
    }
  }
}
