const path = require('path');
const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const should = chai.should();

import {
  OpenAPI2
} from '../../common/src/types';
import generator from '../src';

describe('OpenAPI2 Test', function () {
  const spec: OpenAPI2 = require(
    path.resolve(path.join(__dirname, '../../../test-resource/test-api-1-spec.json'))
  );

  it('OpenAPI2 Generate', async function () {
    const output = generator(spec);
    console.log(output);
  });
});
