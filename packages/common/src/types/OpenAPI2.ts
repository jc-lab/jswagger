// Origin: https://github.com/manifoldco/swagger-to-ts

/**
 * OpenAPI2 types
 * These aren’t exhaustive or complete by any means; they simply provide only
 * the parts that swagger-to-ts needs to know about.
 */

export type OpenAPI2Methods = 'get' | 'post' | 'put' | 'delete' | 'head' | 'options';

//
// export interface OpenAPI2ApiResponseHeader {
//   type: string;
//   format?: string;
//   description?: string;
// }

export interface OpenAPI2ApiResponse {
  description?: string;
  headers?: {
    [name: string]: OpenAPI2SchemaObject;
  },
  schema?: OpenAPI2SchemaObject | OpenAPI2Reference;
}

export interface OpenAPI2Api {
  tags: string[];
  summary: string;
  description: string;
  operationId: string;
  consumes?: string[];
  produces?: string[];
  parameters: OpenAPI2ApiParameter[];
  responses?: {
    [statusCode: string]: OpenAPI2ApiResponse;
  },
  security?: {[key: string]: any[]}[];
  deprecated?: boolean
}

export interface OpenAPI2Path {
  get?: OpenAPI2Api;
  post?: OpenAPI2Api;
  put?: OpenAPI2Api;
  delete?: OpenAPI2Api;
  head?: OpenAPI2Api;
  options?: OpenAPI2Api;
}

export interface OpenAPI2Tag {
  name: string;
  description: string;
  [key: string]: any;
}

export interface OpenAPI2Paths {
  [key: string]: OpenAPI2Path;
}

export interface OpenAPI2SecurityDefinition {
  type: string;
  [key: string]: any;
}

export interface OpenAPI2 {
  definitions?: { [key: string]: OpenAPI2SchemaObject };
  swagger: string;
  info: {
    description: string;
    version: string;
    title: string;
    license?: any;
    contact?: {
      email: string;
      [key: string]: any;
    };
    termsOfService?: string;
    [key: string]: any;
  },
  host: string;
  basePath: string;
  tags: OpenAPI2Tag[];
  paths: OpenAPI2Paths;
  securityDefinitions: {
    [key: string]: OpenAPI2SecurityDefinition;
  };

  [key: string]: any; // handle other properties beyond swagger-to-ts’ concern
}

export type OpenAPI2Type =
  | 'array'
  | 'binary'
  | 'boolean'
  | 'byte'
  | 'date'
  | 'dateTime'
  | 'double'
  | 'float'
  | 'integer'
  | 'long'
  | 'number'
  | 'object'
  | 'password'
  | 'string'
  | 'file';

export type OpenAPI2Reference = { $ref: string };

export interface OpenAPI2SchemaObject {
  additionalProperties?: OpenAPI2SchemaObject | OpenAPI2Reference | boolean;
  allOf?: OpenAPI2SchemaObject[];
  description?: string;
  enum?: string[];
  format?: string;
  items?: OpenAPI2SchemaObject | OpenAPI2Reference;
  oneOf?: (OpenAPI2SchemaObject | OpenAPI2Reference)[];
  properties?: { [index: string]: OpenAPI2SchemaObject | OpenAPI2Reference };
  required?: boolean | string[];
  title?: string;
  type?: OpenAPI2Type; // allow this to be optional to cover cases when this is missing
  [key: string]: any; // allow arbitrary x-something properties
}

export interface OpenAPI2ApiParameter extends OpenAPI2SchemaObject {
  name: string;
  in: 'body' | 'header' | 'query' | 'path' | 'formData',
  schema?: OpenAPI2SchemaObject | OpenAPI2Reference;
}
