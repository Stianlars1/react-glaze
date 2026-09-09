import test from "node:test";
import assert from "node:assert/strict";
import { createGeometry } from "../dist/engine/geometry.js";
import { REFERENCE } from "../dist/presets.js";

test("rounded glass has continuous normals across shared bevel vertices", () => {
  const geometry = createGeometry(660, 280, REFERENCE);
  try {
    const p = geometry.getAttribute("position"),
      n = geometry.getAttribute("normal"),
      positions = new Map();
    let discontinuities = 0;
    for (let i = 0; i < p.count; i++) {
      const key = [p.getX(i), p.getY(i), p.getZ(i)]
        .map((v) => v.toFixed(5))
        .join();
      const normal = [n.getX(i), n.getY(i), n.getZ(i)],
        previous = positions.get(key);
      if (
        previous &&
        Math.hypot(...previous.map((v, j) => v - normal[j])) > 0.01
      )
        discontinuities++;
      else positions.set(key, normal);
    }
    assert.equal(
      discontinuities,
      0,
      "Bevel normals jump at coincident vertices and produce refraction bands",
    );
  } finally {
    geometry.dispose();
  }
});

test("the planar front meets the bevel with exactly planar normals", () => {
  const g = createGeometry(660, 280, REFERENCE);
  g.computeBoundingBox();
  const p = g.attributes.position,
    n = g.attributes.normal;
  for (let i = 0; i < p.count; i++)
    if (Math.abs(p.getZ(i) - g.boundingBox.max.z) < 1e-6) {
      assert.ok(
        Math.hypot(n.getX(i), n.getY(i)) < 1e-6,
        "Cap triangulation tilts the flat face",
      );
      assert.ok(n.getZ(i) > 0.999999);
    }
  g.dispose();
});

test("rounded geometry stays finite, bounded and outward-facing at extreme sizes", () => {
  for (const [w, h, r, d] of [
    [660, 280, 32, 0.44],
    [240, 64, 32, 0.44],
    [24, 24, 100, 0.04],
    [1200, 40, 999, 1],
    [200, 200, 0, 0.2],
    [40, 800, 20, 1],
  ]) {
    const g = createGeometry(w, h, { ...REFERENCE, radius: r, depth: d });
    g.computeBoundingBox();
    const p = g.attributes.position,
      n = g.attributes.normal;
    assert.ok(Math.abs(g.boundingBox.max.x - 1.5336) < 1e-5);
    assert.ok(Math.abs(g.boundingBox.max.y - (1.5336 * h) / w) < 1e-5);
    for (let i = 0; i < p.count; i++) {
      assert.ok(Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i)));
      assert.ok(
        Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1) < 1e-5,
      );
      assert.ok(
        p.getX(i) * n.getX(i) + p.getY(i) * n.getY(i) + p.getZ(i) * n.getZ(i) >=
          -1e-6,
      );
    }
    g.dispose();
  }
});

test("large circular silhouettes stay within one tenth of a CSS pixel", () => {
  const width = 1000,
    s = { ...REFERENCE, radius: 500 };
  const g = createGeometry(width, width, s),
    p = g.attributes.position,
    ring = [];
  for (let i = 0; i < p.count; i++)
    if (Math.abs(p.getZ(i) - s.depth * 0.4) < 1e-6)
      ring.push([p.getX(i), p.getY(i)]);
  ring.sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
  let maxSag = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i],
      b = ring[(i + 1) % ring.length];
    maxSag = Math.max(
      maxSag,
      500 -
        (Math.hypot((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) * width) /
          (1.42 * 1.08 * 2),
    );
  }
  assert.ok(maxSag <= 0.1001, `Silhouette deviates by ${maxSag} CSS px`);
  g.dispose();
});

test('CSS elliptical contours use separate horizontal and vertical radii', () => {
  const width=300,height=100,radii=Array.from({length:4},()=>[150,50]);
  const g=createGeometry(width,height,REFERENCE,radii),p=g.attributes.position;
  const rx=1.5336,ry=rx*height/width;
  let samples=0;
  for(let i=0;i<p.count;i++)if(Math.abs(p.getZ(i)-REFERENCE.depth*.4)<1e-6){
    assert.ok(Math.abs((p.getX(i)/rx)**2+(p.getY(i)/ry)**2-1)<1e-5,'Outer ring must follow the CSS ellipse');samples++;
  }
  assert.ok(samples>32);g.dispose();
});

test('different CSS corners keep a sharp corner and finite unit normals',()=>{
  const g=createGeometry(200,120,REFERENCE,[[0,0],[40,20],[16,32],[28,28]]),p=g.attributes.position,n=g.attributes.normal;
  let sharp=false;
  for(let i=0;i<p.count;i++){
    if(Math.abs(p.getX(i)+1.5336)<1e-5&&Math.abs(p.getY(i)-1.5336*120/200)<1e-5)sharp=true;
    assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)));
    assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-5);
  }
  assert.ok(sharp,'Top-left CSS zero radius must remain square');g.dispose();
});

test('mixed sharp and curved corners keep triangle winding aligned with analytic normals',()=>{
  for(const corners of [[[0,0],[40,20],[16,32],[28,28]],[[60,30],[0,0],[0,0],[20,10]]]){
    const g=createGeometry(200,120,REFERENCE,corners),p=g.attributes.position,n=g.attributes.normal,idx=g.index.array;
    for(let i=0;i<idx.length;i+=3){
      const ids=[idx[i],idx[i+1],idx[i+2]],a=ids.map(j=>[p.getX(j),p.getY(j),p.getZ(j)]);
      const u=a[1].map((v,k)=>v-a[0][k]),v=a[2].map((v,k)=>v-a[0][k]);
      const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...cross);
      if(length<1e-8)continue;
      const normal=[ids.reduce((s,j)=>s+n.getX(j),0),ids.reduce((s,j)=>s+n.getY(j),0),ids.reduce((s,j)=>s+n.getZ(j),0)];
      assert.ok(cross.reduce((sum,c,k)=>sum+c*normal[k],0)/length>=-1e-6,'A bevel face is turned inside out');
    }
    g.dispose();
  }
});
