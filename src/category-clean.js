import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { HttpProxyAgent } from 'http-proxy-agent';

dotenv.config();

const proxy = process.env.HTTP_PROXY;
const agent = proxy ? new HttpProxyAgent(proxy) : null;

const headers = {
  'Content-Type': 'application/json',
  accept: 'application/json',
};

const apiRoot = process.env.API_URL;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const tenantId = apiRoot.match(/https:\/\/t(\d+)/)[1];

const postOAuth = async () => {
  const data = {
    client_id: clientId,
    client_secret: clientSecret,
  };
  const response = await fetch(
    `${apiRoot}/platform/applications/authtickets/oauth`,
    {
      method: 'POST',
      headers,
      agent,
      body: JSON.stringify(data),
    },
  );
  const result = await response.json();
  return result.access_token;
};

const getCategories = async (startIndex, pageSize) => {
  const response = await fetch(
    `${apiRoot}/commerce/catalog/admin/categories?startIndex=${startIndex}&pageSize=${pageSize}`,
    {
      method: 'GET',
      headers,
      agent,
    },
  );
  const data = await response.json();
  return data;
};

const getTenant = async (tenantId) => {
  const response = await fetch(`${apiRoot}/platform/tenants/${tenantId}`, {
    method: 'GET',
    headers,
    agent,
  });
  const data = await response.json();
  return data;
};

const saveCategory = async (categoryId, category) => {
  const response = await fetch(
    `${apiRoot}/commerce/catalog/admin/categories/${categoryId}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify(category),
      agent,
    },
  );
  if (response.status !== 200) {
    console.log(
      `Failed to save category ${categoryId} - ${response.statusText}`,
    );
  }
  const result = await response.json();
  return result;
};

const cleanAndSaveCategories = async (categories) => {
  for (const category of categories) {
    if (
      category.categoryCode.startsWith('KW-EN-') ||
      category.categoryCode.startsWith('KW-AR-')
    ) {
      category.categoryCode = category.categoryCode.substring(6);
      await saveCategory(category.id, category);
    }
  }
};

const getUniqueCatalogIds = (tenant) => {
  const catalogIds = tenant.sites.map((site) => site.catalogId);
  const uniqueCatalogIds = [...new Set(catalogIds)];
  return uniqueCatalogIds;
};

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

cleanCategories();
