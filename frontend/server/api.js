// The library's JSON API (/api/*) and its images (/library/*), served by the
// Vite dev and preview servers themselves: there is no separate backend.
// Responses are `{ data }`, or `{ message, errors }` with status 422 for
// invalid input (what src/api/client.js expects).
import { Buffer } from 'node:buffer';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Library, MAX_IMAGE_BYTES, NotFoundError, ValidationError } from './library.js';

// Bodies above this are refused outright; the image itself is capped lower,
// with a clearer validation message.
const MAX_BODY_BYTES = MAX_IMAGE_BYTES + 5 * 1024 * 1024;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(res, status, body) {
  res.statusCode = status;
  if (body === null) {
    res.end();
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      // Keep reading (so the client gets the 413) but stop buffering.
      if (size <= MAX_BODY_BYTES) {
        chunks.push(chunk);
      }
    });
    req.on('end', () =>
      size > MAX_BODY_BYTES ? reject(new HttpError(413, 'That file is too large for the server.')) : resolve(Buffer.concat(chunks)),
    );
    req.on('error', reject);
  });
}

async function readJson(req) {
  const body = await readBody(req);
  if (body.length === 0) {
    return {};
  }
  let data;
  try {
    data = JSON.parse(body.toString('utf8'));
  } catch {
    throw new HttpError(400, 'The request body is not valid JSON.');
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpError(400, 'The request body must be a JSON object.');
  }
  return data;
}

/** A multipart upload: its text fields (`tags[]` as `tags`) and the `image` file's bytes. */
async function readForm(req) {
  const body = await readBody(req);
  let form;
  try {
    form = await new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': req.headers['content-type'] ?? '' },
      body,
    }).formData();
  } catch {
    throw new HttpError(400, 'The request body is not valid form data.');
  }

  const fields = { tags: form.getAll('tags[]') };
  for (const [key, value] of form) {
    if (key !== 'tags[]' && key !== 'image' && typeof value === 'string') {
      fields[key] = value;
    }
  }
  const file = form.get('image');
  const image = file && typeof file !== 'string' ? Buffer.from(await file.arrayBuffer()) : null;
  return { fields, image };
}

async function serveImage(res, library, segments) {
  const file = segments.length === 3 ? library.imageFile(...segments) : null;
  const info = file && (await stat(file.path).catch(() => null));
  if (!info?.isFile()) {
    sendJson(res, 404, { message: 'Not found.' });
    return;
  }
  res.setHeader('Content-Type', file.mime);
  res.setHeader('Content-Length', info.size);
  res.setHeader('Cache-Control', 'no-cache');
  createReadStream(file.path).pipe(res);
}

/** Connect middleware for the library stored in `root`. */
export function createLibraryMiddleware(root) {
  const library = new Library(root);

  // [method, path pattern, handler] — `:name` segments become params.
  const routes = [
    ['GET', '/api/categories', async ({ query }) => [200, { data: await library.listCategories(query.get('section')) }]],
    ['POST', '/api/categories', async ({ req }) => [201, { data: await library.createCategory(await readJson(req)) }]],
    [
      'DELETE',
      '/api/categories/:section/:id',
      async ({ params }) => {
        await library.deleteCategory(params.section, params.id);
        return [204, null];
      },
    ],
    [
      'GET',
      '/api/inspirations',
      async ({ query }) => [200, { data: await library.listInspirations({ section: query.get('section'), category: query.get('category') }) }],
    ],
    [
      'POST',
      '/api/inspirations',
      async ({ req }) => {
        const { fields, image } = await readForm(req);
        return [201, { data: await library.createInspiration(fields, image) }];
      },
    ],
    ['GET', '/api/inspirations/:id', async ({ params }) => [200, { data: await library.getInspiration(params.id) }]],
    ['PATCH', '/api/inspirations/:id', async ({ req, params }) => [200, { data: await library.updateInspiration(params.id, await readJson(req)) }]],
    [
      'DELETE',
      '/api/inspirations/:id',
      async ({ params }) => {
        await library.deleteInspiration(params.id);
        return [204, null];
      },
    ],
    ['GET', '/api/links', async ({ query }) => [200, { data: await library.listLinks({ section: query.get('section') }) }]],
    ['POST', '/api/links', async ({ req }) => [201, { data: await library.createLink(await readJson(req)) }]],
    [
      'DELETE',
      '/api/links/:id',
      async ({ params }) => {
        await library.deleteLink(params.id);
        return [204, null];
      },
    ],
  ];

  function match(method, segments) {
    for (const [routeMethod, pattern, handler] of routes) {
      const parts = pattern.split('/');
      if (routeMethod !== method || parts.length !== segments.length) {
        continue;
      }
      const params = {};
      if (parts.every((part, index) => (part.startsWith(':') ? (params[part.slice(1)] = segments[index]) : part === segments[index]))) {
        return { handler, params };
      }
    }
    return null;
  }

  return async function libraryMiddleware(req, res, next) {
    const url = new URL(req.url, 'http://localhost');
    const isApi = url.pathname === '/api' || url.pathname.startsWith('/api/');
    const isImage = url.pathname.startsWith('/library/') && req.method === 'GET';
    if (!isApi && !isImage) {
      next();
      return;
    }

    try {
      let segments;
      try {
        segments = url.pathname.split('/').map(decodeURIComponent);
      } catch {
        throw new HttpError(404, 'Not found.');
      }

      if (isImage) {
        await serveImage(res, library, segments.slice(2));
        return;
      }

      const route = match(req.method, segments);
      if (!route) {
        throw new HttpError(404, 'Not found.');
      }
      const [status, body] = await route.handler({ req, query: url.searchParams, params: route.params });
      sendJson(res, status, body);
    } catch (error) {
      if (error instanceof ValidationError) {
        sendJson(res, 422, { message: error.message, errors: error.errors });
      } else if (error instanceof NotFoundError || error instanceof HttpError) {
        sendJson(res, error.status ?? 404, { message: error.message });
      } else {
        console.error(error);
        sendJson(res, 500, { message: error.message });
      }
    }
  };
}

/** Vite plugin: serves the library from `dir` on `npm run dev` and `npm run preview`. */
export function libraryApi({ dir }) {
  return {
    name: 'inspiration-library-api',
    configureServer(server) {
      server.middlewares.use(createLibraryMiddleware(dir));
    },
    configurePreviewServer(server) {
      server.middlewares.use(createLibraryMiddleware(dir));
    },
  };
}
