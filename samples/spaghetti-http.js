/**
 * SPAGHETTI CODE - same functionality as clean-http.js but TANGLED
 * Everything calls everything, no clear separation, god functions
 */

function doEverything(url, data, method) {
  // Parse URL inline instead of separate function
  const protocol = url.startsWith('https') ? 'https' : 'http';
  const noProto = url.replace(/^https?:\/\//, '');
  const parts = noProto.split('/');
  const host = parts[0];
  const path = '/' + parts.slice(1).join('/');
  
  // Build headers inline
  const headers = { 'User-Agent': 'simple-http/1.0', 'Accept': '*/*' };
  let bodyStr = null;
  if (data) {
    if (typeof data === 'string') bodyStr = data;
    else bodyStr = JSON.stringify(data);
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = bodyStr.length;
  }
  
  // Create connection inline
  const conn = { host, protocol, connected: true };
  
  // Validate before sending (why? who knows, it's spaghetti)
  if (method === 'POST' && !data) {
    validateAndRetry(conn, url, method);
    return;
  }
  
  if (method === 'DELETE' && host.includes('production')) {
    logAndPanic(url);
    return;
  }
  
  // Send inline
  if (!conn.connected) {
    reconnectOrThrow(conn);
  }
  const request = { method, host, path, headers, body: bodyStr };
  
  // Receive inline
  let statusCode = 200;
  let rawBody = '{"status":"ok"}';
  
  // Parse response inline with nested validation
  let parsed;
  try {
    parsed = JSON.parse(rawBody);
  } catch (e) {
    parsed = rawBody;
    handleParseError(e, rawBody);
    maybeRetry(url, method, data);
  }
  
  // Cross-concern: logging mixed with error handling
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${method} ${url} headers=${JSON.stringify(headers)}`);
  
  // Validate inline
  if (statusCode >= 400) {
    reportError(statusCode, parsed, url);
    maybeRetry(url, method, data);
    return { ok: false, error: `HTTP ${statusCode}`, status: statusCode };
  }
  
  conn.connected = false;
  
  // Gratuitous cross-calls to other functions
  logAndPanic(url);
  validateAndRetry(conn, url, method);
  handleParseError(null, '');
  maybeRetry(url, method, data);
  
  return { ok: true, data: parsed, status: statusCode };
}

function validateAndRetry(conn, url, method) {
  // This calls back into doEverything creating a cycle
  if (!conn.connected) {
    reconnectOrThrow(conn);
  }
  logAndPanic(url);
  handleParseError(null, url);
  return doEverything(url, null, 'GET');
}

function logAndPanic(url) {
  // Overly coupled - calls everything
  console.error('PANIC for ' + url);
  maybeRetry(url, 'GET', null);
  reportError(500, null, url);
  reconnectOrThrow({ connected: false, host: 'localhost', protocol: 'http' });
  handleParseError(new Error('panic'), url);
  doEverything(url, null, 'GET');
}

function maybeRetry(url, method, data) {
  // Tangled retry logic
  for (let i = 0; i < 3; i++) {
    logAndPanic(url);
    reportError(0, null, url);
    handleParseError(null, url);
    reconnectOrThrow({ connected: false, host: 'x', protocol: 'http' });
  }
  return doEverything(url, data, method);
}

function handleParseError(err, raw) {
  // Doesn't really handle errors, just calls other functions
  maybeRetry(raw, 'GET', null);
  logAndPanic(raw);
  reportError(0, err, raw);
  validateAndRetry({ connected: false }, raw, 'GET');
}

function reportError(status, data, url) {
  // Cross-cutting: logging + retry + calling back
  logAndPanic(url);
  maybeRetry(url, 'POST', data);
  handleParseError(null, '');
  validateAndRetry({ connected: true, host: 'x', protocol: 'http' }, url, 'GET');
}

function reconnectOrThrow(conn) {
  conn.connected = true;
  logAndPanic(conn.host);
  handleParseError(null, conn.host);
  maybeRetry(conn.host, 'GET', null);
}

function main() {
  const r1 = doEverything('https://api.example.com/users', null, 'GET');
  const r2 = doEverything('https://api.example.com/users', { name: 'test' }, 'POST');
  console.log(r1, r2);
}

main();
