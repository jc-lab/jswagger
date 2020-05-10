import {
  AxiosRequestConfig, AxiosResponse, AxiosError
} from 'axios';
import {
  OpenAPI2, OpenAPI2ApiParameter
} from 'jswagger-common';
import * as http from 'http';
import * as https from 'https';
import {
  OpenAPI2Reference, OpenAPI2SchemaObject
} from 'jswagger-common/src/types/OpenAPI2';

export interface ISwaggerClientConfig {
  spec: OpenAPI2;
  protocol?: string;
  host?: string;
  baseUrl?: string;
  httpAgent?: http.Agent;
  httpsAgent?: https.Agent;
  securityContext?: IApiSecurityContext;
}

export interface ISwaggerApiOptions {
  securityContext?: IApiSecurityContext;
}

export interface ApiRequestOptions<T, P> extends AxiosRequestConfig {
  securityContext?: IApiSecurityContext;
  queries?: Record<string, any>;
}

export interface ApiRequestOptionsRX<T, P> extends ApiRequestOptions<T, P> {
  data: T;
}
export interface ApiRequestOptionsRO<T, P> extends ApiRequestOptions<T, P> {
  data: T;
  params?: P;
}
export interface ApiRequestOptionsRR<T, P> extends ApiRequestOptions<T, P> {
  data: T;
  params: P;
}
export interface ApiRequestOptionsOX<T, P> extends ApiRequestOptions<T, P> {
  data?: T;
}
export interface ApiRequestOptionsOO<T, P> extends ApiRequestOptions<T, P> {
  data?: T;
  params?: P;
}
export interface ApiRequestOptionsOR<T, P> extends ApiRequestOptions<T, P> {
  data?: T;
  params: P;
}
export interface ApiRequestOptionsXX<T, P> extends ApiRequestOptions<T, P> {
}
export interface ApiRequestOptionsXO<T, P> extends ApiRequestOptions<T, P> {
  params?: P;
}
export interface ApiRequestOptionsXR<T, P> extends ApiRequestOptions<T, P> {
  params: P;
}

export interface ApiResponse<T, H> extends AxiosResponse<T> {
  data: T;
  headers: H;
}

export type AnyKeyValueType = {[key: string]: any};
export interface IApiSecurityContext {
  headerReplacer?: (input: AnyKeyValueType) => AnyKeyValueType;
  queryReplacer?: (input: AnyKeyValueType) => AnyKeyValueType;
}

const S_API_ERROR = Symbol('ApiError');

export class ApiError extends Error {
  public readonly [S_API_ERROR]: boolean;

  public readonly code: string;
  public readonly data: any;
  public readonly headers: AnyKeyValueType;
  public readonly axiosError: AxiosError;
  public readonly axiosConfig: AxiosRequestConfig;
  public readonly axiosRequest?: any;
  public readonly axiosResponse?: AxiosResponse;

  constructor(params: {
    message: string,
    code: string,
    status: number,
    data: any,
    headers: AnyKeyValueType,
    axiosError: AxiosError;
    axiosConfig: AxiosRequestConfig;
    axiosRequest?: any;
    axiosResponse?: AxiosResponse;
  }) {
    super(params.message);
    this[S_API_ERROR] = true;
    this.code = params.code;
    this.data = params.data;
    this.headers = params.headers;
    this.axiosError = params.axiosError;
    this.axiosConfig = params.axiosConfig;
    this.axiosRequest = params.axiosRequest;
    this.axiosResponse = params.axiosResponse;
  }

  public static isInstance(o: any): boolean {
    return !!o[S_API_ERROR];
  }
}

type IsSwaggerDefinitionFunctionType = (o: any) => boolean;
type GetSwaggerDefinitionName = (o: any) => string;
type SwaggerDefinitionToJson = (o: any) => any;

export interface ISpecMetadata {
  isSwaggerDefinition: IsSwaggerDefinitionFunctionType;
  getSwaggerDefinitionName: GetSwaggerDefinitionName;
  swaggerDefinitionToJson: SwaggerDefinitionToJson;
  classes: readonly any[];
  definitions: Record<string, any>; // OpenAPI2SchemaObject | OpenAPI2Reference
}

export interface IApiMetadata {
  tag: string;
  specMetadata: ISpecMetadata;
}
