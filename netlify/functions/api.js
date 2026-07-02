const { Readable, Writable } = require("stream");
const handler = require("../../server");

exports.handler = async (event) => {
  const path = event.path.replace(/^\/\.netlify\/functions\/api/, "/api");
  const query = event.rawQuery ? `?${event.rawQuery}` : "";
  const bodyBuffer = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64")
    : Buffer.from(event.body || "");

  const req = new Readable({
    read() {
      this.push(bodyBuffer.length ? bodyBuffer : null);
      if (bodyBuffer.length) this.push(null);
    }
  });
  req.method = event.httpMethod;
  req.url = `${path}${query}`;
  req.headers = lowerHeaders(event.headers || {});

  const chunks = [];
  const res = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      callback();
    }
  });
  res.statusCode = 200;
  res.headers = {};
  res.writeHead = (statusCode, headers = {}) => {
    res.statusCode = statusCode;
    res.headers = { ...res.headers, ...headers };
  };
  res.setHeader = (name, value) => {
    res.headers[name] = value;
  };
  res.getHeader = (name) => res.headers[name];

  await new Promise((resolve, reject) => {
    res.on("finish", resolve);
    res.on("error", reject);
    Promise.resolve(handler(req, res)).catch(reject);
  });

  const responseBody = Buffer.concat(chunks);
  const contentType = getHeader(res.headers, "content-type") || "";
  const isText = /^text\/|json|javascript|xml|svg/.test(contentType);
  return {
    statusCode: res.statusCode,
    headers: normalizeHeaders(res.headers),
    body: isText ? responseBody.toString("utf8") : responseBody.toString("base64"),
    isBase64Encoded: !isText
  };
};

function lowerHeaders(headers) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
}

function normalizeHeaders(headers) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, String(value)]));
}

function getHeader(headers, wanted) {
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === wanted);
  return found ? String(found[1]) : "";
}
