'use strict'
Object.defineProperty(exports, "__esModule", { value: true });

const benchmark = require('benchmark');
const C = require('../src');

const suite = new benchmark.Suite

const ITERATIONS = 20;

suite
  .add('Math#random()', function () {
      for ( let k = 0 ; k < ITERATIONS ; ++k ) {
        Math.random();
      }
  })
  .add('continuum#random()', function () {
    C.random(ITERATIONS);
  })
//   .add('continuum#random2()', function () {
//     C.random2(ITERATIONS);
//   })
  // add listeners
  .on('cycle', function (event) {
    console.log(String(event.target))
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  // run async
  .run({ 'async': false })