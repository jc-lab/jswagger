import axios, {
  AxiosError, AxiosRequestConfig, AxiosResponse
} from 'axios';
import JSONbig from 'node-json-bigint';
import * as url from 'url';

import {
  ApiError, IApiMetadata,
  IApiSecurityContext,
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
          const securityContext: IApiSecurityContext | undefined =
            _options['securityContext'] || self._config.securityContext;
          const optBody: undefined | any = callOptions && callOptions['body'];
          const optParams: { [key: string]: any } | undefined = callOptions && callOptions['params'];
          const reqBody = optBody;
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

          const apiUrl = new url.URL(urlConcat(self._baseUrl, apiPath));

          if (securityContext) {
            if (securityContext.headerReplacer) {
              reqHeaders = securityContext.headerReplacer(reqHeaders);
            }
            if (securityContext.queryReplacer) {
              reqQueries = securityContext.queryReplacer(reqQueries);
            }
          }

          return ((() => {
            if (['get', 'delete', 'head', 'options'].includes(item.method)) {
              type CallType = (url: string, config: AxiosRequestConfig) => Promise<AxiosResponse>;
              return (axios[item.method] as CallType)(apiUrl.toString(), {
                headers: reqHeaders,
                params: reqQueries,
                httpAgent: self._config.httpAgent,
                httpsAgent: self._config.httpsAgent,
                transformResponse: jsonTransformResponse
              });
            } else {
              type CallType = (url: string, data: any, config: AxiosRequestConfig) => Promise<AxiosResponse>;
              return (axios[item.method] as CallType)(apiUrl.toString(), reqBody, {
                headers: reqHeaders,
                params: reqQueries,
                httpAgent: self._config.httpAgent,
                httpsAgent: self._config.httpsAgent,
                transformResponse: jsonTransformResponse
              });
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
              }
              else {
                return Promise.reject(err);
              }
            });
        }
      });
    });
    return proxy;
  }
}
