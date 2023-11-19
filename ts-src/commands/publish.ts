import { Configuration } from '@kibocommerce/rest-sdk';
import { DocumentPublishingApi } from '@kibocommerce/rest-sdk/clients/Content';
import { config } from '../config.js';

export async function publish(args: any) {
  const targetConfig = new Configuration(config.target.api);
  const targetPublishing = new DocumentPublishingApi(targetConfig);
  await targetPublishing.publishDocuments();
}
