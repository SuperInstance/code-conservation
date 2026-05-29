/**
 * CLEAN, WELL-STRUCTURED MODULE
 * A simple HTTP request library with clear separation of concerns.
 */

function parseUrl(url) {
  const protocol = url.startsWith('https') ? 'https' : 'http';
  const noProto = url.replace(/^https?:\/\//, '');
  const parts = noProto.split('/');
  const host = parts[0];
  const path = '/' + parts.slice(1).join('/');
  return { protocol, host, path };
}

function buildHeaders(method, body) {
  const headers = { 'User-Agent': 'simple-http/1.0', 'Accept': '*/*' };
  if (body) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = body.length;
  }
  return headers;
}

function buildRequest(method, parsedUrl, headers, body) {
  return {
    method,
    host: parsedUrl.host,
    path: parsedUrl.path,
    headers,
    body: body || null
  };
}

function validateResponse(statusCode, body) {
  if (statusCode >= 400) {
    return { ok: false, error: `HTTP ${statusCode}`, status: statusCode };
  }
  return { ok: true, data: body, status: statusCode };
}

function parseResponseBody(rawBody) {
  try {
    return JSON.parse(rawBody);
  } catch (e) {
    return rawBody;
  }
}

function serializeBody(data) {
  if (typeof data === 'string') return data;
  return JSON.stringify(data);
}

function createConnection(host, protocol) {
  return { host, protocol, connected: true, createdAt: Date.now() };
}

function closeConnection(conn) {
  conn.connected = false;
  return conn;
}

function sendRequest(conn, request) {
  if (!conn.connected) {
    return { ok: false, error: 'Not connected' };
  }
  return { ok: true, request, simulated: true };
}

function receiveResponse(conn) {
  return { statusCode: 200, body: '{"status":"ok"}' };
}

function logRequest(method, url, headers) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] ${method} ${url} headers=${JSON.stringify(headers)}`;
}

function httpGet(url) {
  const parsed = parseUrl(url);
  const headers = buildHeaders('GET', null);
  const request = buildRequest('GET', parsed, headers, null);
  const conn = createConnection(parsed.host, parsed.protocol);
  sendRequest(conn, request);
  const raw = receiveResponse(conn);
  const body = parseResponseBody(raw.body);
  const result = validateResponse(raw.statusCode, body);
  closeConnection(conn);
  logRequest('GET', url, headers);
  return result;
}

function httpPost(url, data) {
  const parsed = parseUrl(url);
  const body = serializeBody(data);
  const headers = buildHeaders('POST', body);
  const request = buildRequest('POST', parsed, headers, body);
  const conn = createConnection(parsed.host, parsed.protocol);
  sendRequest(conn, request);
  const raw = receiveResponse(conn);
  const parsedBody = parseResponseBody(raw.body);
  const result = validateResponse(raw.statusCode, parsedBody);
  closeConnection(conn);
  logRequest('POST', url, headers);
  return result;
}

function httpPut(url, data) {
  const parsed = parseUrl(url);
  const body = serializeBody(data);
  const headers = buildHeaders('PUT', body);
  const request = buildRequest('PUT', parsed, headers, body);
  const conn = createConnection(parsed.host, parsed.protocol);
  sendRequest(conn, request);
  const raw = receiveResponse(conn);
  const parsedBody = parseResponseBody(raw.body);
  const result = validateResponse(raw.statusCode, parsedBody);
  closeConnection(conn);
  logRequest('PUT', url, headers);
  return result;
}

function httpDelete(url) {
  const parsed = parseUrl(url);
  const headers = buildHeaders('DELETE', null);
  const request = buildRequest('DELETE', parsed, headers, null);
  const conn = createConnection(parsed.host, parsed.protocol);
  sendRequest(conn, request);
  const raw = receiveResponse(conn);
  const body = parseResponseBody(raw.body);
  const result = validateResponse(raw.statusCode, body);
  closeConnection(conn);
  logRequest('DELETE', url, headers);
  return result;
}

function main() {
  const getResult = httpGet('https://api.example.com/users');
  const postResult = httpPost('https://api.example.com/users', { name: 'test' });
  console.log(getResult, postResult);
}

main();
