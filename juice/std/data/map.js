export const create = () => new Map();

export const get = (map, key) => map.get(key);

export const set = (map, key, value) => map.set(key, value);

export const remove = (map, key) => map.delete(key);

export const has = (map, key) => map.has(key);

export const size = (map) => map.size;

export const keys = (map) => map.keys();
