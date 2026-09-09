import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRadii } from '../dist/engine/radii.js';
const css=(...values)=>Object.fromEntries(['borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'].map((key,i)=>[key,values[i]??values[0]]));
test('percentage radius uses width and height independently',()=>{
 assert.deepEqual(resolveRadii(200,100,css('50%')),[[100,50],[100,50],[100,50],[100,50]]);
});
test('overlapping corners receive one common CSS scale factor',()=>{
 assert.deepEqual(resolveRadii(100,80,css('80px','40px','0px','20px')),[[64,64],[32,32],[0,0],[16,16]]);
});
test('each corner and common computed CSS math resolve independently',()=>{
 assert.deepEqual(resolveRadii(200,100,css('calc(10% + 4px) 12px','min(12px, 20%)','clamp(5px, 10%, 30px)','0px 40px')),[[24,12],[12,12],[20,10],[0,0]]);
});
test('unsupported computed CSS does not silently produce a different contour',()=>{
 assert.throws(()=>resolveRadii(100,100,css('unsupported(5px)')),/border radius/i);
});
