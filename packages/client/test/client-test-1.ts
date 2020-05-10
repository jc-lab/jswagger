import SwaggerClient from "../src/client";

const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const should = chai.should();

import { OpenAPI2 } from 'jswagger-common';
import jswagger from '../src';

import * as TestApi1Interface from '../../../test-resource/test-api-1';

describe('OpenAPI2 Test', function () {
  const spec: OpenAPI2 = require('../../../test-resource/test-api-1-spec.json');

  it('OpenAPI2 Client', async function () {
    const client: SwaggerClient = jswagger({
      spec
    });
    const testApi = client.api<TestApi1Interface.TestApi>(TestApi1Interface.APIS.TestApi);
    await testApi.getManyTypes({
      data: {

      }
    })
      .then(response => {
        console.log('response => ', response.data);
      })
      .catch(err => {
        console.error('err => ', err);
      });
  });
});
