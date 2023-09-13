import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { SingleBar, Presets } from 'cli-progress';
import { HttpProxyAgent } from 'http-proxy-agent';
dotenv.config();
const proxy = process.env.HTTP_PROXY;
const agent = proxy ? new HttpProxyAgent(proxy) : null;
const headers = {
  'Content-Type': 'application/json',
  'accept': 'application/json',
};
let apiRoot = process.env.API_URL;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const tenantId = apiRoot.match(/https:\/\/t(\d+)/)[1];
const masterCatalog = parseInt(process.env.MASTER_CATALOG);
const primeCatalog = parseInt(process.env.PRIME_CATALOG);
const catalogPairs = JSON.parse(process.env.CATALOG_PAIRS);
const sitePairs = JSON.parse(process.env.SITE_PAIRS);




class CatalogClone {
  
  constructor(apiRoot, clientId, clientSecret, masterCatalog, primeCatalog, catalogPairs, sitePairs) {
    this.apiRoot = apiRoot;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.masterCatalog = masterCatalog;
    this.primeCatalog = primeCatalog;
    this.catalogPairs = catalogPairs;
    this.sitePairs = sitePairs;
    this.state = { tenants: {} };
    this.headers = {
      'Content-Type': 'application/json',
      'accept': 'application/json',
    };
    this.proxy = process.env.HTTP_PROXY;
    this.agent = this.proxy ? new HttpProxyAgent(this.proxy) : null;
  }
}


const state = { tenants: {} }
const postOAuth = async () => {
  const ticket = state.ticket;
  if (ticket && ticket.expiresAt > Date.now()) {
    return ticket.access_token;
  }
  const data = {
    client_id: clientId,
    client_secret: clientSecret,
  };
  const response = await fetch(`${apiRoot}/platform/applications/authtickets/oauth`, {
    method: 'POST',
    headers,
    agent,
    body: JSON.stringify(data)
  });
  const result = await response.json();
  state.ticket = result;
  state.ticket.expiresAt = Date.now() + result.expires_in * 1000;
  return result.access_token;
};
const getCategories = async (startIndex, pageSize) => {
  const response = await fetch(`${apiRoot}/commerce/catalog/admin/categories?startIndex=${startIndex}&pageSize=${pageSize}`, {
    method: 'GET',
    headers,
    agent
  });
  const data = await response.json();
  return data;
};
const getProducts = async (startIndex, pageSize) => {
  const response = await fetch(`${apiRoot}/commerce/catalog/admin/products?startIndex=${startIndex}&pageSize=${pageSize}`, {
    method: 'GET',
    headers,
    agent
  });
  const data = await response.json();
  return data;
};
const getAllCategories = async () => {
  console.log(`getting all Categories [${headers['x-vol-catalog']}]`);
  let categories = [];
  let startIndex = 0;
  let pageCount = 1;
  const pageSize = 200;
  const progressBar = new SingleBar({}, Presets.shades_classic);
  while (startIndex < pageCount * pageSize) {
    const data = await getCategories(startIndex, pageSize);
    if (startIndex == 0) {
      progressBar.start(data.totalCount, 0);
    }
    categories = categories.concat(data.items);
    pageCount = data.pageCount;
    progressBar.update(startIndex + data.items?.length);
    startIndex += pageSize;

  }
  sortCategories(categories);
  progressBar.stop();
  return categories;
}
const getTenant = async (tenantId) => {
  let tenant = state.tenants[tenantId];
  if (tenant) {
    return tenant;
  }
  const response = await fetch(`${apiRoot}/platform/tenants/${tenantId}`, {
    method: 'GET',
    headers,
    agent
  });
  state.tenants[tenantId] = await response.json();
  return state.tenants[tenantId];
};
const generalSettingRoutes = {
  cart: '/commerce/settings/cart/cartsettings',
  checkout: '/commerce/commerce/settings/checkout',
  fulfillment: '/commerce/settings/fulfillment/fulfillmentsettings',
  general: '/commerce/settings/general',
  inventory: '/commerce/settings/inventory/inventorySettings',
  return: '/commerce/settings/return/returnsettings',
  shipping: '/commerce/settings/shipping',
  subscription: '/commerce/settings/subscription/subscriptionsettings'
}

const getSetting = async (settingName) => {
  let route = generalSettingRoutes[settingName];
  const response = await fetch(`${apiRoot}${route}`, {
    method: 'GET',
    headers,
    agent
  });
  if (response.status !== 200) {
    console.log(`Failed to get ${settingName} - site:${headers['x-vol-site']} -  ${response.statusText}`);
  } else {
    return await response.json();
  }
}
const saveSetting = async (settingName, setting) => {
  let route = generalSettingRoutes[settingName];
  const response = await fetch(`${apiRoot}${route}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(setting),
    agent
  });
  if (response.status !== 200) {
    console.log(`Failed to save ${settingName} - site:${headers['x-vol-site']}  - ${response.statusText}`);
  } else {
    return await response.json();
  }
}


const saveCategory = async (categoryId, category) => {
  const response = await fetch(`${apiRoot}/commerce/catalog/admin/categories/${categoryId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(category),
    agent
  });
  if (response.status !== 200) {
    console.log(`Failed to save category ${categoryId} - ${response.statusText}`);
  }
  const result = await response.json();
  return result;
};
const saveProduct = async (product) => {
  const response = await fetch(`${apiRoot}/commerce/catalog/admin/products/${product.productCode}?sort=productSequence asc`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(product),
    agent
  });
  if (response.status !== 200) {
    if (response.headers.get('Content-Type').indexOf('json') > -1) {
      const result = await response.json();
      console.log(result);
    }
    console.log(`Failed to save Product ${product.productCode} - ${response.statusText}`);
    return;
  }

  const result = await response.json();
  return result;
};
const deleteCategory = async (categoryId) => {
  const response = await fetch(`${apiRoot}/commerce/catalog/admin/categories/${categoryId}`, {
    method: 'DELETE',
    headers,
    agent
  });
  if (response.status !== 200) {
    console.log(`Failed to save category ${categoryId} - ${response.statusText}`);
  }
  return;
};
const createCategory = async (category) => {
  const response = await fetch(`${apiRoot}/commerce/catalog/admin/categories/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(category),
    agent
  });
  if (response.status !== 201) {
    console.log(`Failed to save category ${category.categoryCode} - ${response.statusText}`);
  }
  const result = await response.json();
  return result;
};



const getEntityLists = async () => {
  const response = await fetch(`${apiRoot}/platform/entitylists?pagesize=200`, {
    method: 'GET',
    headers,
    agent
  });
  const result = await response.json();
  return result;  
}
const getEntities = async (entityListId, startIndex) => {
  startIndex = startIndex || 0;
  const response = await fetch(`${apiRoot}/platform/entitylists/${entityListId}/entities?pagesize=200&startIndex=${startIndex}`, {
    method: 'GET',
    headers,
    agent
  });
  const result = await response.json();
  return result;  
}

const saveEntity = async (entityListId, entity) => {
  let response = await fetch(`${apiRoot}/platform/entitylists/${entityListId}/entities/${entity.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(entity),
    agent
  });
  if( response.status > 299) {
    response = await fetch(`${apiRoot}/platform/entitylists/${entityListId}/entities`, {
      method: 'POST',
      headers,
      body: JSON.stringify(entity),
      agent
    });
  }
  if (response.status !== 200) {
    console.log(`Failed to save entity ${entity.id} - ${response.statusText}`);
  }
  const result = await response.json();
  return result;
}




const getSearchRedirects = async () => {
  //todo: get all pages
  const response = await fetch(`${apiRoot}/commerce/catalog/admin/search/redirect?pagesize=200`, {
    method: 'GET',
    headers,
    agent
  });
  const result = await response.json();
  return result;
};

const saveSearchRedirects = async (item) => {
  let response = await fetch(`${apiRoot}/commerce/catalog/admin/search/redirect/${item.redirectId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(item),
    agent
  });
  if (response.status > 299) {

    response = await fetch(`${apiRoot}/commerce/catalog/admin/search/redirect`, {
      method: 'POST',
      headers,
      body: JSON.stringify(item),
      agent
    });

  }
  if (response.status > 299) {
    console.log(`Failed to save SearchMerchandizingRules ${item.code} - ${response.statusText}`);
  }
  const result = await response.json();
  return result;
}



const getSearchMerchandizingRules = async () => {
  //todo: get all pages
  const response = await fetch(`${apiRoot}/commerce/catalog/admin/searchmerchandizingrules?pagesize=200`, {
    method: 'GET',
    headers,
    agent
  });
  const result = await response.json();
  return result;
};

const saveSearchMerchandizingRules = async (merchRule) => {
  let response = await fetch(`${apiRoot}/commerce/catalog/admin/searchmerchandizingrules/${merchRule.code}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(merchRule),
    agent
  });
  if (response.status > 299) {

    response = await fetch(`${apiRoot}/commerce/catalog/admin/searchmerchandizingrules`, {
      method: 'POST',
      headers,
      body: JSON.stringify(merchRule),
      agent
    });

  }
  if (response.status > 299) {
    console.log(`Failed to save SearchMerchandizingRules ${merchRule.code} - ${response.statusText}`);
  }
  const result = await response.json();
  return result;
}


const getSearchSettings = async () => {
  const response = await fetch(`${apiRoot}/commerce/catalog/admin/search/settings`, {
    method: 'GET',
    headers,
    agent
  });
  const result = await response.json();
  return result;
};
const saveSearchSetting = async (searchSetting) => {
  let response = await fetch(`${apiRoot}/commerce/catalog/admin/search/settings/${searchSetting.settingsName}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(searchSetting),
    agent
  });
  if (response.status > 299) {
    response = await fetch(`${apiRoot}/commerce/catalog/admin/search/settings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(searchSetting),
      agent
    });
  }
  if (response.status > 299) {
    console.log(`Failed to save searchSetting ${searchSetting.settingsName} - ${response.statusText}`);
  }
  const result = await response.json();
  return result;
}
const cleanAndSaveCategories = async (categories) => {
  for (const category of categories) {
    if (category.categoryCode.startsWith('KW-EN-') || category.categoryCode.startsWith('KW-AR-')) {
      category.categoryCode = category.categoryCode.substring(6);
      await saveCategory(category.id, category);
    }
  }
};
const getUniqueCatalogIds = (tenant) => {
  const catalogIds = tenant.sites.map(site => site.catalogId);
  const uniqueCatalogIds = [...new Set(catalogIds)];
  return uniqueCatalogIds;
};
const getCatalogMap = (tenant) => {
  const catalogMap = {};
  tenant.masterCatalogs.forEach((masterCatalog) => {
    masterCatalog.catalogs.forEach((catalog) => {
      catalogMap[catalog.id] = catalog;
    });
  });
  return catalogMap;
}
const cleanCategories = async () => {
  headers.Authorization = `Bearer ${await postOAuth()}`;
  const tenant = await getTenant(tenantId);
  const catalogIds = getUniqueCatalogIds(tenant);
  for (const catalogId of catalogIds) {
    headers['x-vol-catalog'] = catalogId;
    let startIndex = 0;
    let pageCount = 1;
    const pageSize = 200;
    while (startIndex < pageCount * pageSize) {
      const data = await getCategories(startIndex, pageSize);
      const categories = data.items;
      await cleanAndSaveCategories(categories);
      pageCount = data.pageCount;
      startIndex += pageSize;
    }
  }
};
function sortCategories(categories) {
  function isParentOf(cat1, cat2) {
    return cat2.parentCategoryCode === cat1.categoryCode;
  }
  categories.sort((cat1, cat2) => {
    if (isParentOf(cat1, cat2)) {
      return -1;
    } else if (isParentOf(cat2, cat1)) {
      return 1;
    }
    return 0;
  });
  return categories;
}
const sortCategoryById = (categories, categoryId) => {
  const matchingCategory = categories.find(cat => cat.categoryId === categoryId);
  if (matchingCategory) {
    const index = categories.indexOf(matchingCategory);
    categories.splice(index, 1);
    categories.unshift(matchingCategory);
  }
  return categories;
}
const mapCategoryIds = (categoryMap, productInCatalogSource, productInCatalogsDestination) => {
  if (productInCatalogSource == productInCatalogsDestination) {
    return;
  }
  var sourceMap = categoryMap[productInCatalogSource.catalogId];
  var destinationMap = categoryMap[productInCatalogsDestination.catalogId];
  productInCatalogsDestination.productCategories = productInCatalogSource.productCategories
    ?.map(id => destinationMap.categoryCodes[sourceMap.ids[id.categoryId]?.categoryCode]?.id)
    .filter(id => id !== null && id !== undefined)
    .map(id => { return { categoryId: id } });
  if (!(productInCatalogsDestination.productCategories?.length > 0)) {
    delete productInCatalogsDestination.productCategories;
  }
  //todo validate primary category
  const primaryCategoryId = destinationMap.categoryCodes[sourceMap.ids[productInCatalogSource.primaryProductCategory?.categoryId]?.categoryCode]?.id;
  if (primaryCategoryId !== null && primaryCategoryId !== undefined) {
    productInCatalogsDestination.primaryProductCategory = {
      catetoryId: primaryCategoryId
    };
    productInCatalogsDestination.productCategories = sortCategoryById(productInCatalogsDestination.productCategories, primaryCategoryId);
  } else {
    delete productInCatalogsDestination.primaryProductCategory
  }
}
const waitForPromises = async (promises, count) => {
  while (promises.size > count) {
    const finishedPromise = await Promise.race(promises);
  }
  return promises;
}

const syncProductInCatalogs = async () => {
  headers.Authorization = `Bearer ${await postOAuth()}`;

  const progressBar = new SingleBar({}, Presets.shades_classic);
  headers["x-vol-master-catalog"] = masterCatalog;
  let tenant = await getTenant(tenantId);
  let catalogMap = getCatalogMap(tenant);
  let categoryMap = await getCategoryMap();
  let startIndex = 0;
  let pageCount = 1;
  const pageSize = 200;
  let work = new Set();
  console.log('Syncing products in Catalog');
  delete headers['x-vol-catalog']
  while (startIndex < pageCount * pageSize) {
    headers.Authorization = `Bearer ${await postOAuth()}`;
    const data = await getProducts(startIndex, pageSize);
    if (startIndex == 0) {
      progressBar.start(data.totalCount, 0);
    }
    for (const product of data.items) {
      progressBar.increment();
      const beforeJson = JSON.stringify(product);
      let pic = product.productInCatalogs || [];
      let prime = pic.find(p => p.catalogId === primeCatalog);
      if (!prime) {
        console.log(`Product ${product.productCode} not in prime catalog`);
        continue;
      }
      for (const pair of catalogPairs) {
        let source = pic.find(p => p.catalogId === pair.source);
        let dest = pic.find(p => p.catalogId === pair.destination);
        if (!source) {
          console.log(`Product ${product.productCode} not in source catalog ${pair.source}`);
          continue;
        }
        if (source.content && prime.content?.productImages) {
          source.content.productImages = prime.content?.productImages;
        }
        if (!dest) {
          dest = JSON.parse(JSON.stringify(Object.assign({}, source, {
            catalogId: pair.destination, price: {
              isoCurrencyCode: catalogMap[pair.destination].defaultCurrencyCode,
              price: 1
            }
          })));

          pic.push(dest);
        } else {
          if (dest.content && prime.content?.productImages) {
            dest.content.productImages = prime.content?.productImages;
          }
        }
        mapCategoryIds(categoryMap, prime, source);
        mapCategoryIds(categoryMap, prime, dest);
      }
      if (productCompare(JSON.parse(beforeJson), product) != null) {
        let task = saveProduct(product);
        task.finally(() => work.delete(task))
        work.add(task);
        await waitForPromises(work, 4);
      } else {
        //console.log(`Product ${product.productCode} not changed`);
      }
    }
    pageCount = data.pageCount;
    startIndex += pageSize;
  }
  await waitForPromises(work, 0);
  progressBar.stop();
  console.log('Done');
}
function productCompare(product1, product2) {
  const sortProductInCatalogsByCatalogId = (product) => {
    product.productInCatalogs.sort((a, b) => {
      return a.catalogId - b.catalogId;
    });
  }
  sortProductInCatalogsByCatalogId(product1)
  sortProductInCatalogsByCatalogId(product2)

  return deepCompare(product1, product2);
}
function deepCompare(obj1, obj2) {
  const stack = [[obj1, obj2]];
  while (stack.length > 0) {
    const [o1, o2] = stack.pop();
    if (Array.isArray(o1) && Array.isArray(o2)) {
      if (o1.length !== o2.length) {
        return [o1, o2];
      }
      const sorted1 = o1.slice().sort();
      const sorted2 = o2.slice().sort();
      for (let i = 0; i < sorted1.length; i++) {
        stack.push([sorted1[i], sorted2[i]]);
      }
    } else if (typeof o1 === 'object' && typeof o2 === 'object') {
      const keys1 = Object.keys(o1).sort();
      const keys2 = Object.keys(o2).sort();
      if (keys1.length !== keys2.length) {
        return [o1, o2];
      }
      for (let i = 0; i < keys1.length; i++) {
        if (keys1[i] !== keys2[i]) {
          return [o1, o2];
        }
        stack.push([o1[keys1[i]], o2[keys2[i]]]);
      }
    } else if (o1 !== o2) {
      return [o1, o2];
    }
  }
  return null;
}
const getCategoryMap = async () => {
  console.log('getting category map');
  headers.Authorization = `Bearer ${await postOAuth()}`;
  const categoryMap = {};
  const tenant = await getTenant(tenantId);
  const catalogIds = getUniqueCatalogIds(tenant);
  for (const catalogId of catalogIds) {
    headers['x-vol-catalog'] = catalogId;
    const map = categoryMap[catalogId] = { ids: {}, categoryCodes: {} };
    const categories = await getAllCategories();
    for (const category of categories) {
      map.ids[category.id] = category;
      map.categoryCodes[category.categoryCode] = category;
    }
  }
  return categoryMap;
}


const syncMerchandisingSettings = async () => {
  headers.Authorization = `Bearer ${await postOAuth()}`;
  const tenant = await getTenant(tenantId);
  for (const sitePair of sitePairs) {
    const sourceSite = tenant.sites.find(site => site.id === sitePair.source);
    const destinationSite = tenant.sites.find(site => site.id === sitePair.destination);
    headers['x-vol-catalog'] = sourceSite.catalogId;
    headers['x-vol-site'] = sourceSite.id;
    let rules = await getSearchMerchandizingRules();
    for (const rule of rules.items) {
      headers['x-vol-catalog'] = destinationSite.catalogId;
      headers['x-vol-site'] = destinationSite.id;
      await saveSearchMerchandizingRules(rule);
    }

  }
  delete headers['x-vol-site'];
}





const syncSerachRedirects = async () => {
  headers.Authorization = `Bearer ${await postOAuth()}`;
  const tenant = await getTenant(tenantId);
  for (const sitePair of sitePairs) {
    const sourceSite = tenant.sites.find(site => site.id === sitePair.source);
    const destinationSite = tenant.sites.find(site => site.id === sitePair.destination);
    headers['x-vol-catalog'] = sourceSite.catalogId;
    headers['x-vol-site'] = sourceSite.id;
    let items = await getSearchRedirects();
    for (const item of items.items) {
      headers['x-vol-catalog'] = destinationSite.catalogId;
      headers['x-vol-site'] = destinationSite.id;
      await saveSearchRedirects(item);
    }

  }
  delete headers['x-vol-site'];
}



const syncSerachRedirects2 = async (siteMappings) => {
  headers.Authorization = `Bearer ${await postOAuth()}`;
  const backupApiRoot = apiRoot;
  //const tenant = await getTenant(tenantId);
  for (const sitePair of siteMappings) {
    const sourceSite = sitePair.source;
    const destinationSite = sitePair.destination;

    headers['x-vol-catalog'] = sourceSite.catalogId;
    headers['x-vol-site'] = sourceSite.id;
    apiRoot = sourceSite.apiRoot;
    let rules = await getSearchRedirects();
    apiRoot = destinationSite.apiRoot;
    headers['x-vol-catalog'] = destinationSite.catalogId;
    headers['x-vol-site'] = destinationSite.id;
    for (const item of rules.items) {
      //let txt = JSON.stringify(rule);
      //remove all instances of KW-EN- and KW-AR- in txt
      //txt = txt.replace(/KW-EN-/g, '').replace(/KW-AR-/g, '');
      //let fixedRule = JSON.parse(txt);
      let ret = await saveSearchRedirects(item);
    }

  }
  apiRoot = backupApiRoot;
  delete headers['x-vol-site'];
}


const syncMerchandisingSettings2 = async (siteMappings) => {
  headers.Authorization = `Bearer ${await postOAuth()}`;
  const backupApiRoot = apiRoot;
  //const tenant = await getTenant(tenantId);
  for (const sitePair of siteMappings) {
    const sourceSite = sitePair.source;
    const destinationSite = sitePair.destination;

    headers['x-vol-catalog'] = sourceSite.catalogId;
    headers['x-vol-site'] = sourceSite.id;
    apiRoot = sourceSite.apiRoot;
    let rules = await getSearchMerchandizingRules();
    apiRoot = destinationSite.apiRoot;
    headers['x-vol-catalog'] = destinationSite.catalogId;
    headers['x-vol-site'] = destinationSite.id;
    for (const rule of rules.items) {
      let txt = JSON.stringify(rule);
      //remove all instances of KW-EN- and KW-AR- in txt
      txt = txt.replace(/KW-EN-/g, '').replace(/KW-AR-/g, '');
      let fixedRule = JSON.parse(txt);
      let ret = await saveSearchMerchandizingRules(fixedRule);
    }

  }
  apiRoot = backupApiRoot;
  delete headers['x-vol-site'];
}




const syncSearchSettings = async () => {
  headers.Authorization = `Bearer ${await postOAuth()}`;
  const tenant = await getTenant(tenantId);
  for (const sitePair of sitePairs) {
    const sourceSite = tenant.sites.find(site => site.id === sitePair.source);
    const destinationSite = tenant.sites.find(site => site.id === sitePair.destination);
    headers['x-vol-catalog'] = sourceSite.catalogId;
    headers['x-vol-site'] = sourceSite.id;
    let sourceSearchSettings = await getSearchSettings();
    let defaultSearchSetting = sourceSearchSettings.items.filter(setting => setting.isDefault === true)[0];
    if (!defaultSearchSetting) {
      console.log(`No default search setting found for catalog ${catalogPair.source}`);
      continue;
    }
    headers['x-vol-catalog'] = destinationSite.catalogId;
    headers['x-vol-site'] = destinationSite.id;
    await saveSearchSetting(defaultSearchSetting);
  }
  delete headers['x-vol-site'];
}

const syncEntities = async () => {
  headers.Authorization = `Bearer ${await postOAuth()}`;
  const tenant = await getTenant(tenantId);
  const lists = await getEntityLists();

  for (const sitePair of sitePairs) {
    const sourceSite = tenant.sites.find(site => site.id === sitePair.source);
    const destinationSite = tenant.sites.find(site => site.id === sitePair.destination);
    

    for (const list of lists.items) {
      if ( list.contextLevel.toLowerCase() != 'catalog'){
        continue;
      }
      const listFqn = list.name + '@' + list.nameSpace;
      headers['x-vol-catalog'] = sourceSite.catalogId;
      headers['x-vol-site'] = sourceSite.id;
      var entities = await getEntities(listFqn);
      for( const entity of entities.items){
        headers['x-vol-catalog'] = destinationSite.catalogId;
        headers['x-vol-site'] = destinationSite.id;
        
        await saveEntity(listFqn, entity);
      }
    }

    

  }
  delete headers['x-vol-site'];
}


const snycSiteSettings = async () => {
  headers.Authorization = `Bearer ${await postOAuth()}`;
  const tenant = await getTenant(tenantId);
  for (const sitePair of sitePairs) {
    const sourceSite = tenant.sites.find(site => site.id === sitePair.source);
    const destinationSite = tenant.sites.find(site => site.id === sitePair.destination);
    for (const settingName in generalSettingRoutes) {
      headers['x-vol-catalog'] = sourceSite.catalogId;
      headers['x-vol-site'] = sourceSite.id;
      let sourceSetting = await getSetting(settingName);
      if (sourceSetting) {
        headers['x-vol-catalog'] = destinationSite.catalogId;
        headers['x-vol-site'] = destinationSite.id;
        await saveSetting(settingName, sourceSetting);
      }
    }
  }
  delete headers['x-vol-site'];
}
const categorySync = async () => {
  headers.Authorization = `Bearer ${await postOAuth()}`;
  for (const catalogPair of catalogPairs) {
    headers['x-vol-catalog'] = catalogPair.source;
    const sourceCategories = await getAllCategories();
    headers['x-vol-catalog'] = catalogPair.destination;
    const destinationCategories = await getAllCategories();
    const sourceCategoriesDictionary = sourceCategories.reduce((acc, category) => {
      acc[category.categoryCode] = category;
      return acc;
    }, {});
    const destinationCategoriesDictionary = destinationCategories.reduce((acc, category) => {
      acc[category.categoryCode] = category;
      return acc;
    }, {});
    const sourceCategoryCodes = sourceCategories.map(category => category.categoryCode);
    const destinationCategoryCodes = destinationCategories.map(category => category.categoryCode);
    const missingCategoryCodes = sourceCategoryCodes.filter(categoryCode => !destinationCategoryCodes.includes(categoryCode));
    for (const missingCategoryCode of missingCategoryCodes) {
      const newCategory = Object.assign({}, sourceCategoriesDictionary[missingCategoryCode])
      delete newCategory.id;
      newCategory.parentCategoryId = destinationCategoriesDictionary[newCategory.parentCategoryCode]?.id;
      destinationCategoriesDictionary[newCategory.categoryCode] = await createCategory(newCategory);
    }
    for (const sourceCategory of sourceCategories) {
      const destinationCategory = destinationCategoriesDictionary[sourceCategory.categoryCode];
      if (!destinationCategory) {
        continue;
      }
      if (sourceCategory.categoryCode !== destinationCategory.categoryCode) {
        continue;
      }
      if (sourceCategory.parentCategoryCode !== destinationCategory.parentCategoryCode) {
        destinationCategory.parentCategoryId = destinationCategoriesDictionary[sourceCategory.parentCategoryCode]?.id;
        await saveCategory(destinationCategory.id, destinationCategory);
      }
    }
  }
};

//export cleanCategories , categorySync,  syncSearchSettings functions
module.exports = {
  cleanCategories,
  categorySync,
  syncSearchSettings
}



async function main() {
  // await cleanCategories();
  // await categorySync();
  //await syncSearchSettings();
  //await syncProductInCatalogs();
  //await snycSiteSettings();
  //await syncMerchandisingSettings();
  //await syncSerachRedirects();
  await syncEntities();
  // await syncSerachRedirects2([{
  //   source: {
  //     id: 100166,
  //     catalogId: 2,
  //     apiRoot: 'https://t100067.tp1.euw1.kibocommerce.com/api'
  //   },
  //   destination: {
  //     id: 100148,
  //     catalogId: 5,
  //     apiRoot: 'https://t100016.sb.euw1.kibocommerce.com/api'
  //   }
  // },
  // {
  //   source: {
  //     id: 100167,
  //     catalogId: 3,
  //     apiRoot: 'https://t100067.tp1.euw1.kibocommerce.com/api'
  //   },
  //   destination: {
  //     id: 100149,
  //     catalogId: 6,
  //     apiRoot: 'https://t100016.sb.euw1.kibocommerce.com/api'
  //   }
  // }])
}
main();