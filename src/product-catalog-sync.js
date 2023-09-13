import fs from 'fs';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import { stringify } from 'csv-stringify/sync';

dotenv.config();
const productCatalogFile =
  '/Users/thomas.phipps/git/ps/kibo-intra-tenant-clone/testdata/products/kibo-export-catalog-2023-08-26T00_42_16/productcatalog.csv';

const categoriesFile = 'productcatalog_updates.csv';
const outputFile = 'productcatalog.csv';
const catalogMapping = {
  source: {
    id: 6,
    name: 'Marks and Spencer Kuwait Arabic',
  },
  destination: {
    id: 8,
    name: 'Marks and Spencer UAE Arabic',
  },
};

const apiRoot = process.env.API_URL;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const catalogPairs = JSON.parse(process.env.CATALOG_PAIRS);
const sitePairs = JSON.parse(process.env.SITE_PAIRS);
const tenantId = apiRoot.match(/https:\/\/t(\d+)/)[1];

function createProductCatalogUpdateFile(
  catalogMapping,
  productCatalogFile,
  outputFile,
) {
  const productCatalogData = fs.readFileSync(productCatalogFile, 'utf8');
  const productCatalog = parse(productCatalogData, { columns: true });

  const productCatalogDict = {};

  for (const product of productCatalog) {
    const catalogName = product.CatalogName;
    const productCode = product.ProductCode.toLowerCase();

    if (!productCatalogDict[catalogName]) {
      productCatalogDict[catalogName] = {};
    }

    productCatalogDict[catalogName][productCode] = product;
  }
  //const categoriesData = fs.readFileSync(categoriesFile, 'utf8');
  //const categories = parse(categoriesData, { columns: true });

  const productCatalogUpdates = [];

  const sourceCatalog = productCatalogDict[catalogMapping.source.name];
  const destinationCatalog =
    productCatalogDict[catalogMapping.destination.name] || {};

  for (const productCode in sourceCatalog) {
    const sourceProduct = sourceCatalog[productCode.toLowerCase()];
    const destinationProduct = destinationCatalog[productCode.toLowerCase()];

    if (!destinationProduct) {
      const updatedProduct = {
        ...sourceProduct,
        CatalogName: catalogMapping.destination.name,
      };
      updatedProduct.Price = updatedProduct.Price || 1;
      //updatedProduct.IsContentOverridden =  updatedProduct.IsSEOOverridden = updatedProduct.IsPriceOverridden = 'No';

      productCatalogUpdates.push(updatedProduct);
    } else if (
      sourceProduct.CategoryCodes !== destinationProduct.CategoryCodes
    ) {
      destinationProduct.CategoryCodes = sourceProduct.CategoryCodes;
      productCatalogUpdates.push(destinationProduct);
    }
  }

  const productCatalogUpdatesCsv = stringify(productCatalogUpdates, {
    header: true,
  });

  fs.writeFileSync(outputFile, productCatalogUpdatesCsv);
}

createProductCatalogUpdateFile(catalogMapping, productCatalogFile, outputFile);
