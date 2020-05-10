import * as types from './types';
import _SwaggerClient from './client';
import * as internals from './internals';

declare namespace index {
  export type ISwaggerClientConfig = types.ISwaggerClientConfig;
  export type SwaggerClient = _SwaggerClient;
  export type ApiRequestOptionsRX<D, H> = types.ApiRequestOptionsRX<D, H>;
  export type ApiRequestOptionsRO<D, H> = types.ApiRequestOptionsRO<D, H>;
  export type ApiRequestOptionsRR<D, H> = types.ApiRequestOptionsRR<D, H>;
  export type ApiRequestOptionsOX<D, H> = types.ApiRequestOptionsOX<D, H>;
  export type ApiRequestOptionsOO<D, H> = types.ApiRequestOptionsOO<D, H>;
  export type ApiRequestOptionsOR<D, H> = types.ApiRequestOptionsOR<D, H>;
  export type ApiRequestOptionsXX<D, H> = types.ApiRequestOptionsXX<D, H>;
  export type ApiRequestOptionsXO<D, H> = types.ApiRequestOptionsXO<D, H>;
  export type ApiRequestOptionsXR<D, H> = types.ApiRequestOptionsXR<D, H>;
  export type IApiSecurityContext = types.IApiSecurityContext;
  export type ApiResponse<D, H> = types.ApiResponse<D, H>;
  export type ApiError = types.ApiError;
  export const internal: typeof internals;
}

function index(config: types.ISwaggerClientConfig): _SwaggerClient {
  return new _SwaggerClient(config);
}

Object.defineProperty(index, 'internal', {
  value: Object.freeze(internals)
});

export = index;

