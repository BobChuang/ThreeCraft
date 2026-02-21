'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.samePoint = exports.toPointKey = void 0;
const toPointKey = ({ x, y, z }) => `${x}:${y}:${z}`;
exports.toPointKey = toPointKey;
const samePoint = (left, right) => left.x === right.x && left.y === right.y && left.z === right.z;
exports.samePoint = samePoint;
