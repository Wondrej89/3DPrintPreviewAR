import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { fitPrinter, geometryDimensions, overhangAngle, transformedPoints, validateMesh } from './core';
import { toMillimeters } from '../three/units';
import { trimLRU } from '../storage/db';
import type { ModelTransform } from '../types';

test('unit conversion and STL/OBJ scaling', () => {
  assert.equal(toMillimeters(2, 'cm'), 20);
  assert.equal(toMillimeters(2, 'inch'), 50.8);
  assert.deepEqual(geometryDimensions([new THREE.BoxGeometry(1, 2, 3)], 10), { x: 10, y: 20, z: 30 });
});

test('rectangular and actual circular footprint fit', () => {
  const points = [new THREE.Vector3(-5, -5, 0), new THREE.Vector3(5, 5, 10)];
  assert.equal(fitPrinter(points, { shape: 'rectangular', x: 10, y: 10, z: 10 }).fits, true);
  assert.equal(fitPrinter(points, { shape: 'circular', diameter: 10, z: 10 }).fits, false);
});

test('current orientation is applied before fit calculations', () => {
  const transform: ModelTransform = {
    quaternion: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2).toArray(),
    position: [0, 0, 0],
  };
  const box = new THREE.Box3().setFromPoints(transformedPoints([new THREE.BoxGeometry(20, 10, 5)], transform));
  assert.ok(Math.abs(box.getSize(new THREE.Vector3()).x - 10) < 1e-5);
  assert.ok(Math.abs(box.getSize(new THREE.Vector3()).y - 20) < 1e-5);
});

test('vertical walls are 90 degrees and downward faces are 180 degrees', () => {
  assert.equal(overhangAngle(new THREE.Vector3(1, 0, 0)), 90);
  assert.equal(overhangAngle(new THREE.Vector3(0, 0, -1)), 180);
});

test('mesh edge validation and LRU limit', () => {
  assert.equal(validateMesh([0, 0, 0, 1, 0, 0, 0, 1, 0]).boundaryEdges, 3);
  const recent = trimLRU(Array.from({ length: 11 }, (_, lastOpened) => ({ lastOpened })));
  assert.equal(recent.length, 10);
  assert.equal(recent[0].lastOpened, 10);
});
