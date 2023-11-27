# README.md

## Catalog Intra Tenant Catalog Clone Utility (CLI Tool)

This CLI tool provides utilities for syncing, managing, and validating configurations related to catalogs in a given tenant.

### Prerequisites

Ensure you have Node.js 16+ installed.

### Setup

1. Install dependencies:

   ```bash
   npm install @kibocommerce:intra-tenant-catalog-clone
   ```

2. Make sure the `.env` file is set up with the required environment variables:

   - `API_URL`: The API endpoint.
   - `CLIENT_ID`: Client ID for the API.
   - `CLIENT_SECRET`: Client secret for the API.
   - `CATALOG_PAIRS`: JSON array of source and destination catalog pairs.
   - `SITE_PAIRS`: JSON array of source and destination site pairs.
   - `PRIME_CATALOG`: Prime catalog number.
   - `MASTER_CATALOG`: Master catalog number.
   
   for CONTENT
   - `SOURCE_TENANT`: Source Tenant Id, can be the same as the Target Tenant for intra clone
   - `SOURCE_SITE`: Source Site Id
   - `SOURCE_SITE_PREFIX_LOCALE`: if the source has a url local prefix such en-kw
   - `TARGET_SITE`: Target Site Id
   - `TARGET_SITE_PREFIX_LOCALE`: if the destination  has a url local prefix such en-sk
   
   You can use the `init-env` command to create an empty `.env` file.

### Available Commands

- `categories`: Sync categories.
- `settings`: Sync site settings.
- `entities`: Sync entities.
- `search-settings`: Sync search settings.
- `search-facets`: Sync search facets.
- `search-merchandising`: Sync search merchandising settings.
- `search-all`: Sync all search-related settings.
- `products`: Sync products in catalogs.
- `clean-category-prefixes`: Clean category prefixes.
- `sync-content -pages -redirects -catalogContent -themeSettings`: Syncs Content Pages , redirects , theme settings
- `validate-config`: Validate the configuration settings.
- `init-env`: Creates an empty `.env` file.

### Usage

To use the CLI tool, run the following command:

```bash
npx @kibocommerce:intra-tenant-catalog-clone [command]
```

Replace `[command]` with any of the available commands listed above.

Example:

```bash
npx @kibocommerce:intra-tenant-catalog-clone categories
```

### Environment Variables

Make sure you set up the following environment variables in your `.env` file:

```plaintext
API_URL=https://t***.com/api
CLIENT_ID=YourClientID
CLIENT_SECRET=YourClientSecret
CATALOG_PAIRS='[{"source":5,"destination":7}, {"source":6,"destination":8}]'
SITE_PAIRS='[{"source":100148,"destination":100150}, {"source":100149,"destination":100151}]'
PRIME_CATALOG=5
MASTER_CATALOG=2
```

### Contributing

Please raise an issue or pull request on our GitHub repository if you have any fixes, enhancements, or suggestions.

### License

This project is licensed under the MIT License. See the `LICENSE` file for more details.

---

If you have any issues, please reach out to our support team or check our documentation for more details.
