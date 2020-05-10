import {
  OpenAPI2, OpenAPI2Api, OpenAPI2Paths, OpenAPI3
} from './types';

export interface FoundApi {
  path: string;
  method: string;
  api: OpenAPI2Api;
}

export function findApisByTag(schema: OpenAPI2 | OpenAPI3, tag: string): FoundApi[] {
  const output: FoundApi[] = [];
  Object.entries(schema.paths as OpenAPI2Paths)
    .forEach(([path, apis]) => {
      Object.entries(apis)
        .forEach((entry) => {
          const method = entry[0];
          const api: OpenAPI2Api = entry[1];
          if (api.tags.find(v => v == tag)) {
            output.push({
              path, method, api
            });
          }
        });
    });
  return output;
}
