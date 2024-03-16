export const has = (key) => {
  return process.env.hasOwnProperty(key);
};

export const get = (key) => {
  return process.env[key];
};
