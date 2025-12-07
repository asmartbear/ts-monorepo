'use strict'
Object.defineProperty(exports, "__esModule", { value: true });

const benchmark = require('benchmark');
const C = require('../src');

const suite = new benchmark.Suite

const start_lo = C.random(16);
const start_hi = C.random(16);

suite
.add('continuum#between()', function () {
  let lo = start_lo;
  let hi = start_hi;
  for ( let k = 100 ; --k >= 0 ; ) {
      lo = C.between(lo,hi);
  }
})
// .add('continuum#between2()', function () {
//   let lo = start_lo;
//   let hi = start_hi;
//   for ( let k = 100 ; --k >= 0 ; ) {
//       lo = C.between2(lo,hi);
//   }
// })
  // add listeners
  .on('cycle', function (event) {
    console.log(String(event.target))
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  // run async
  .run({ 'async': false })