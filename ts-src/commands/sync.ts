import { Configuration } from '@kibocommerce/rest-sdk';
import { Site } from '../lib/site.js';
import {
  SyncRedirects,
  SyncCatalogContent,
  SyncPageContent,
  SyncThemeSettings,
} from '../sync-tasks/index.js';
import { config } from '../config.js';
import { DOCUMENT_NAMES } from '../lib/constants.js';
import { CategoryComparator, CategoryMap } from '../lib/category-map.js';
import type { RedirectTransformer } from '../sync-tasks/redirects.js';
import path from 'path';
import fs from 'fs/promises';
import { Document } from '@kibocommerce/rest-sdk/clients/Content';

async function redirects(sourceSite: Site, targetSite: Site) {
  const redirectTransformer: RedirectTransformer = async (sourceRedirect) => {
    const d = sourceRedirect.d.toLowerCase();
    const sourceLocale = sourceSite.sitePrefixlocale.toLowerCase();
    const targetLocale = targetSite.sitePrefixlocale.toLowerCase();
    // clean up relative locale specific paths
    if (d.startsWith(`${sourceLocale}/`)) {
      sourceRedirect.d = d.replace(`${sourceLocale}/`, `${targetLocale}/`);
    }
    // clean up absolute paths
    if (d.includes(`/${sourceLocale}/`)) {
      sourceRedirect.d = sourceRedirect.d.replace(
        `/${sourceLocale}/`,
        `/${targetLocale}/`,
      );
    }
    return sourceRedirect;
  };
  const redirectTask = new SyncRedirects(
    sourceSite.docsWithContent.get(DOCUMENT_NAMES.REDIRECTS) as any,
    targetSite.docsWithContent.get(DOCUMENT_NAMES.REDIRECTS) as any,
    targetSite.configuration,
    [redirectTransformer],
  );

  await redirectTask.sync();
  return redirectTask.results;
}

async function catalogContent(sourceSite: Site, targetSite: Site) {
  const comparator: CategoryComparator = (source, target) => {
    let normalizedSource;
    let categoryPrefix = config.source.categoryPrefix as any;
    if (categoryPrefix) {
      normalizedSource = source.categoryCode?.replace(
        `${categoryPrefix.toUpperCase()}-`,
        '',
      );
    } else {
      normalizedSource = source.categoryCode;
    }
    return normalizedSource === target.categoryCode;
  };
  const categoryMap = new CategoryMap(
    sourceSite.configuration,
    targetSite.configuration,
    comparator,
  );
  await categoryMap.build();

  const localeLinkTransformer: any = async (contentDocument: Document) => {
    if (!contentDocument.properties?.dropzones) {
      return contentDocument;
    }
    try {
      const sourceSitePrefix = sourceSite.sitePrefixlocale.toLowerCase();
      const targetSitePrefix = targetSite.sitePrefixlocale.toLowerCase();
      const dzAsString = JSON.stringify(contentDocument.properties.dropzones);
      const targetDZString = dzAsString.replaceAll(
        `/${sourceSitePrefix}/`,
        `/${targetSitePrefix}/`,
      );
      contentDocument.properties.dropzones = JSON.parse(targetDZString);
    } catch (error) {
      console.error(`Error transforming page content: ${error}`);
    }
    return contentDocument;
  };
  const syncCatalogTask = new SyncCatalogContent(
    sourceSite.docs,
    targetSite.docs,
    categoryMap,
    targetSite.configuration,
    [localeLinkTransformer],
    true,
  );
  await syncCatalogTask.sync();
  return syncCatalogTask.results;
}

async function pages(sourceSite: Site, targetSite: Site) {
  const localeLinkTransformer: any = async (contentDocument: Document) => {
    if (!contentDocument.properties?.dropzones) {
      return contentDocument;
    }
    try {
      const sourceSitePrefix = sourceSite.sitePrefixlocale.toLowerCase();
      const targetSitePrefix = targetSite.sitePrefixlocale.toLowerCase();
      const dzAsString = JSON.stringify(contentDocument.properties.dropzones);
      const targetDZString = dzAsString.replaceAll(
        `/${sourceSitePrefix}/`,
        `/${targetSitePrefix}/`,
      );
      contentDocument.properties.dropzones = JSON.parse(targetDZString);
    } catch (error) {
      console.error(`Error transforming page content: ${error}`);
    }
    return contentDocument;
  };
  const syncPagesTask = new SyncPageContent(
    sourceSite.docs,
    targetSite.docs,
    targetSite.configuration,
    [localeLinkTransformer],
    true,
  );
  await syncPagesTask.sync();
  return syncPagesTask.results;
}

async function themeSettings(sourceSite: Site, targetSite: Site) {
  const syncThemeSettings = new SyncThemeSettings(
    sourceSite.docs,
    targetSite.docs,
    targetSite.configuration,
    true,
  );
  await syncThemeSettings.sync();
  return syncThemeSettings.results;
}

function printErrorSummary({
  redirectResult = {},
  catalogContentResult = {},
  pageResult = {},
  themeSettingsResult = {},
}: any) {
  redirectResult?.errors?.length &&
    console.log(`Redirect Errors: ${redirectResult.errors.length}`);
  catalogContentResult?.errors?.length &&
    console.log(
      `Catalog Content Errors: ${catalogContentResult.errors.length}`,
    );
  pageResult?.errors?.length &&
    console.log(`Page Errors: ${pageResult.errors.length}`);
}

async function dumpErrors(
  {
    redirectResult = {},
    catalogContentResult = {},
    pageResult = {},
    themeSettingsResult = {},
  }: any,
  outputDir: string,
) {
  try {
    await fs.access(outputDir);
  } catch (error) {
    await fs.mkdir(outputDir, { recursive: true });
  }
  try {
    const data = {
      redirects: redirectResult.errors,
      catalogContent: catalogContentResult.errors,
      pages: pageResult.errors,
      themeSettings: themeSettingsResult.errors,
    };
    const fileName = `error-summary`;
    const filePath = path.join(outputDir, `${fileName}.json`);
    fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`Error writing error summary: ${e}`);
  }
}

export default async function sync(args: any) {
  const sourceSite = await Site.initSite(config.source, './output/source');
  const targetSite = await Site.initSite(config.target, './output/target');
  let redirectResult, catalogContentResult, pageResult, themeSettingsResult;
  if (args.redirects) {
    redirectResult = await redirects(sourceSite, targetSite);
  }
  if (args.catalogContent) {
    catalogContentResult = await catalogContent(sourceSite, targetSite);
  }
  if (args.pages) {
    pageResult = await pages(sourceSite, targetSite);
  }
  if (args.themeSettings) {
    themeSettingsResult = await themeSettings(sourceSite, targetSite);
  }
  printErrorSummary({
    redirectResult,
    catalogContentResult,
    pageResult,
    themeSettingsResult,
  });
  await dumpErrors(
    { redirectResult, catalogContentResult, pageResult, themeSettingsResult },
    './output/errors',
  );
}
