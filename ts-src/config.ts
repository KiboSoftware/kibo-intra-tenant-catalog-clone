import 'dotenv/config';

export const config = {
  source: {
    api: {
      authHost: process.env.AUTH_HOST || 'home.euw1.kibocommerce.com',
      clientId: process.env.CLIENT_ID,
      sharedSecret: process.env.CLIENT_SECRET,
      tenantId: process.env.SOURCE_TENANT as any,
      siteId: process.env.SOURCE_SITE as any,
    },
    sitePrefixlocale: process.env.SOURCE_SITE_PREFIX_LOCALE || 'ar-ae',
    categoryPrefix: null,
  },
  target: {
    api: {
      authHost: process.env.AUTH_HOST || 'home.euw1.kibocommerce.com',
      clientId: process.env.CLIENT_ID,
      sharedSecret: process.env.CLIENT_SECRET,
      tenantId: process.env.TARGET_TENANT as any,
      siteId: process.env.TARGET_SITE as any,
      dataViewMode: 'pending',
    },
    sitePrefixlocale: process.env.TARGET_SITE_PREFIX_LOCALE,
  },
};
