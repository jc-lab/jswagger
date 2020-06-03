import axios, {
  AxiosError, AxiosRequestConfig, AxiosResponse, AxiosTransformer
} from 'axios';
import JSONbig from 'node-json-bigint';
import * as url from 'url';

import {
  ApiError, ApiRequestOptions, IApiMetadata,
  IApiSecurityContext,
  IRewriterParams,
  ISwaggerApiOptions,
  ISwaggerClientConfig
} from './types';
import {
  findApisByTag
} from 'jswagger-common';

function extractRef(ref: string): {
  type: string,
  name: string
} | null {
  const refMatcher = /#\/(\w+)\/(.*)/.exec(ref);
  if (!refMatcher) {
    return null;
  }
  return {
    type: refMatcher[1],
    name: refMatcher[2]
  };
}

const REGEX_CONTENT_TYPE_APPLICATION_JSON = /application\/json(?:\s*;\s*charset=([a-zA-Z0-9_-]+))?/;
function jsonTransformResponse(data: any, headers: any): any {
  const jsonCheck = headers['content-type'] && REGEX_CONTENT_TYPE_APPLICATION_JSON.exec(headers['content-type']);
  if (jsonCheck) {
    let text = data;
    if (jsonCheck[1]) {
      text = Buffer.from(data, jsonCheck[1] as BufferEncoding).toString('utf8');
    }
    return JSONbig.parse(text);
  }
  return data;
}

function urlConcat(a: string, b: string): string {
  if (a.length && b.length) {
    const ta = a.charAt(a.length - 1) === '/';
    const tb = b.charAt(0) === '/';
    if (ta === tb) {
      if (ta) {
        return a.concat(b.substring(1));
      } else {
        return a.concat('/', b);
      }
    }
  }
  return a.concat(b);
}

function concatHandlers<T>(first: T, others?: T | T[]): T[] {
  if (others && others) {
    if (Array.isArray(others)) {
      return [first].concat(others);
    } else {
      return [first, others];
    }
  } else {
    return [first];
  }
}

function safePromiseCallback<T>(runner: () => Promise<T>): Promise<T> {
  try {
    return runner();
  } catch (e) {
    return Promise.reject(e);
  }
}

export default class SwaggerClient {
  private readonly _config: ISwaggerClientConfig;
  private readonly _baseUrl: string;

  public static urlConcat(a: string, b: string): string {
    return urlConcat(a, b);
  }

  constructor(config: ISwaggerClientConfig) {
    this._config = config;
    if (config.baseUrl) {
      this._baseUrl = config.baseUrl;
    } else {
      this._baseUrl = url.format({
        protocol: config.protocol || config.spec.protocol || 'http',
        host: config.host || config.spec.host,
        pathname: config.spec.basePath
      });
    }
  }

  public api<TAPI>(api: IApiMetadata, options?: ISwaggerApiOptions): TAPI {
    const _options: ISwaggerApiOptions = options || {};
    const self = this;

    const apis = findApisByTag(this._config.spec, api.tag);
    const proxy: TAPI = {} as TAPI;

    const definitionClasses: Map<string, any> =
      api.specMetadata.classes.reduce<Map<string, any>>(
        (results, clazz) => {
          const definitionName = api.specMetadata.getSwaggerDefinitionName(clazz);
          results.set(definitionName, clazz);
          return results;
        }, new Map<string, any>()
      );

    apis.forEach(item => {
      let apiPath = item.path;

      Object.defineProperty(proxy, item.api.operationId, {
        get: () => function() {
          const callOptions: undefined | any = arguments[0];
          const apiRequestOptions: ApiRequestOptions | undefined =
            callOptions && (callOptions as ApiRequestOptions);
          const securityContext: IApiSecurityContext | undefined =
            _options['securityContext'] || self._config.securityContext;
          const optBody: undefined | any = callOptions && callOptions['body'];
          const optParams: { [key: string]: any } | undefined = callOptions && callOptions['params'];
          const reqBody = optBody;
          const baseUrl = apiRequestOptions && apiRequestOptions.baseURL || self._baseUrl;

          const rewriterParams: IRewriterParams = {
            operationId: item.api.operationId,
            arg: callOptions
          };
          let retryCount = 0;

          const doExecute = () => {
            let reqHeaders = {};
            let reqQueries = {};

            if (optParams) {
              item.api.parameters.forEach(parameterInfo => {
                if (parameterInfo.in === 'header') {
                  const foundItem = Object.entries(optParams).find(([key, value]) => key === parameterInfo.name);
                  if (foundItem) {
                    reqHeaders[parameterInfo.name] = foundItem[1];
                  }
                } else if (parameterInfo.in === 'query') {
                  const foundItem = Object.entries(optParams).find(([key, value]) => key === parameterInfo.name);
                  if (foundItem) {
                    reqQueries[parameterInfo.name] = foundItem[1];
                  }
                } else if (parameterInfo.in === 'path') {
                  const foundItem = Object.entries(optParams).find(([key, value]) => key === parameterInfo.name);
                  if (foundItem) {
                    apiPath = apiPath.replace(`{${parameterInfo.name}}`, foundItem[1]);
                  }
                }
              });
            }

            let apiUrl = new url.URL(urlConcat(baseUrl, apiPath));
            if (apiRequestOptions && apiRequestOptions.protocol) {
              apiUrl.protocol = apiRequestOptions.protocol;
            }
            if (apiRequestOptions && apiRequestOptions.host) {
              apiUrl.host = apiRequestOptions.host;
            }

            if (self._config.hostRewriter) {
              const result = self._config.hostRewriter(rewriterParams);
              if (result) {
                apiUrl.protocol = result.protocol || apiUrl.protocol;
                apiUrl.host = result.host || apiUrl.host;
              }
            }
            if (self._config.urlRewriter) {
              const result = self._config.urlRewriter(rewriterParams, apiUrl);
              apiUrl = result || apiUrl;
            }

            if (securityContext) {
              if (securityContext.headerReplacer) {
                reqHeaders = securityContext.headerReplacer(reqHeaders);
              }
              if (securityContext.queryReplacer) {
                reqQueries = securityContext.queryReplacer(reqQueries);
              }
            }

            if (apiRequestOptions && apiRequestOptions.queries) {
              Object.assign(reqQueries, apiRequestOptions.queries);
            }
            if (apiRequestOptions && apiRequestOptions.headers) {
              Object.assign(reqHeaders, apiRequestOptions.headers);
            }

            const axioxRequestConfig = Object.assign({}, apiRequestOptions || {});
            if (axioxRequestConfig['securityContext']) delete axioxRequestConfig['securityContext'];
            if (axioxRequestConfig['queries']) delete axioxRequestConfig['queries'];
            if (axioxRequestConfig['data']) delete axioxRequestConfig['data'];
            if (axioxRequestConfig['baseURL']) delete axioxRequestConfig['baseURL'];
            Object.assign(
              axioxRequestConfig,
              {
                headers: reqHeaders,
                params: reqQueries,
                httpAgent: self._config.httpAgent,
                httpsAgent: self._config.httpsAgent,
                transformResponse: concatHandlers<AxiosTransformer>(
                  jsonTransformResponse,
                  apiRequestOptions && apiRequestOptions.transformResponse
                )
              }
            );

            return ((() => {
              if (['get', 'delete', 'head', 'options'].includes(item.method)) {
                type CallType = (url: string, config: AxiosRequestConfig) => Promise<AxiosResponse>;
                return (axios[item.method] as CallType)(apiUrl.toString(), axioxRequestConfig);
              } else {
                type CallType = (url: string, data: any, config: AxiosRequestConfig) => Promise<AxiosResponse>;
                return (axios[item.method] as CallType)(apiUrl.toString(), reqBody, axioxRequestConfig);
              }
            })())
              .then(res => {
                const responseDefinition = item.api.responses && item.api.responses[res.status.toString()];
                const responseRef = responseDefinition && responseDefinition.schema && extractRef(responseDefinition.schema.$ref);
                const responseClazz = responseRef && definitionClasses.get(responseRef.name);
                const out = Object.assign({}, res);
                if (responseClazz) {
                  out.data = new responseClazz({
                    schema: res.data
                  });
                }
                return out;
              })
              .catch((err: AxiosError) => {
                if (err.response) {
                  const responseDefinition = item.api.responses && item.api.responses[err.response.status.toString()];
                  const responseRef = responseDefinition && responseDefinition.schema && responseDefinition.schema.$ref;
                  const responseDefinitionClass = (() => {
                    const refMatcher = extractRef(responseRef);
                    if (!refMatcher) {
                      return undefined;
                    }
                    return api.specMetadata.classes
                      .find(v => api.specMetadata.getSwaggerDefinitionName(v) === refMatcher.name);
                  })();
                  const responseVO = responseDefinitionClass ?
                    new responseDefinitionClass({
                      schema: err.response.data
                    }) : err.response.data;
                  return Promise.reject(new ApiError({
                    message: responseDefinition ? responseDefinition.description || err.message : err.message,
                    code: err.code || 'ApiError',
                    status: err.response.status,
                    data: responseVO,
                    headers: err.response.headers,
                    axiosError: err,
                    axiosConfig: err.config,
                    axiosRequest: err.request,
                    axiosResponse: err.response
                  }));
                } else {
                  return Promise.reject(err);
                }
              });
          };

          const doExecuteWithRetry = (resolve, reject) => {
            doExecute()
              .then(resolve)
              .catch(e => {
                if (self._config.retryHandler) {
                  safePromiseCallback(self._config.retryHandler.bind(null, rewriterParams, retryCount++, e))
                    .then(delay => {
                      if (delay < 0 || delay === false) {
                        reject(e);
                      } else if (delay === 0) {
                        doExecuteWithRetry(resolve, reject);
                      } else {
                        setTimeout(() => doExecuteWithRetry(resolve, reject), delay);
                      }
                    })
                    .catch(reject);
                } else {
                  reject(e);
                }
              });
          };

          return new Promise<AxiosResponse>((resolve, reject) => {
            doExecuteWithRetry(resolve, reject);
          });
        }
      });
    });
    return proxy;
  }
}
