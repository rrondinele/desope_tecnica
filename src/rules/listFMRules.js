const SEGMENT_REGEX = /\.?\[(\d+)\]|\./g;

const tokenize = (path) => {
  if (!path) {
    return [];
  }

  const parts = [];
  let buffer = "";

  for (let i = 0; i < path.length; i += 1) {
    const char = path[i];

    if (char === '.') {
      if (buffer) {
        parts.push(buffer);
        buffer = "";
      }
      continue;
    }

    if (char === '[') {
      if (buffer) {
        parts.push(buffer);
        buffer = "";
      }

      let j = i + 1;
      let indexBuffer = "";
      while (j < path.length && path[j] !== ']') {
        indexBuffer += path[j];
        j += 1;
      }

      if (indexBuffer) {
        parts.push(Number(indexBuffer));
      }

      i = j;
      continue;
    }

    buffer += char;
  }

  if (buffer) {
    parts.push(buffer);
  }

  return parts;
};

export const getValueFromPath = (root, path) => {
  if (!root || !path) {
    return undefined;
  }

  const segments = tokenize(path);
  return segments.reduce((value, segment) => {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof segment === 'number') {
      return Array.isArray(value) ? value[segment] : undefined;
    }

    if (typeof value === 'object') {
      return value[segment];
    }

    return undefined;
  }, root);
};

export default getValueFromPath;
