/**
 * Essential React Native Polyfills
 * Only includes polyfills that are absolutely necessary and won't interfere with Firebase
 */

// Import required polyfills
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Import platform constants polyfill
import './src/config/platform-constants';

// Buffer polyfill
import { Buffer } from 'buffer';

// Process polyfill
const process = {
  env: {},
  nextTick: (callback: Function) => setTimeout(callback, 0),
  version: 'v16.0.0',
  versions: {},
  platform: 'react-native',
  browser: false,
  argv: [],
  cwd: () => '/',
  chdir: () => {},
  umask: () => 0,
  hrtime: () => [0, 0],
  uptime: () => 0,
  kill: () => {},
  exit: () => {},
  on: () => {},
  addListener: () => {},
  once: () => {},
  removeListener: () => {},
  removeAllListeners: () => {},
  emit: () => {},
  prependListener: () => {},
  prependOnceListener: () => {},
  listeners: () => [],
  binding: () => {}
};

// Global polyfills
global.Buffer = Buffer;
(global as any).process = process;

// Essential React Native globals (minimal for mobile apps)
if (typeof global !== 'undefined') {
  // Window object polyfill (some libraries expect this)
  if (typeof global.window === 'undefined') {
    (global as any).window = global;
  }

  // Only add polyfills if they don't exist and are actually needed
  // This prevents interference with existing functionality like Firebase

  // Essential polyfills for React Native app functionality
  // These are needed for the app to run but won't interfere with Firebase
  
  // AbortController and AbortSignal polyfills (essential for many libraries)
  if (typeof global.AbortController === 'undefined') {
    (global as any).AbortController = class AbortControllerPolyfill {
      private _signal: any;

      constructor() {
        this._signal = new (global as any).AbortSignal();
      }

      get signal() {
        return this._signal;
      }

      abort(reason?: any) {
        this._signal.abort(reason);
      }
    };
  }

  if (typeof global.AbortSignal === 'undefined') {
    (global as any).AbortSignal = class AbortSignalPolyfill {
      public aborted: boolean = false;
      public reason: any = undefined;
      private _onabort: ((event: any) => void) | null = null;

      constructor() {
        this.aborted = false;
        this.reason = undefined;
      }

      abort(reason?: any) {
        if (this.aborted) return;
        this.aborted = true;
        this.reason = reason;
        if (this._onabort) {
          this._onabort({ type: 'abort', reason });
        }
      }

      get onabort() {
        return this._onabort;
      }

      set onabort(handler: ((event: any) => void) | null) {
        this._onabort = handler;
      }

      addEventListener(type: string, listener: (event: any) => void) {
        if (type === 'abort') {
          this._onabort = listener;
        }
      }

      removeEventListener(type: string, listener: (event: any) => void) {
        if (type === 'abort' && this._onabort === listener) {
          this._onabort = null;
        }
      }

      static abort(reason?: any) {
        const signal = new (global as any).AbortSignal();
        signal.abort(reason);
        return signal;
      }

      static timeout(delay: number) {
        const signal = new (global as any).AbortSignal();
        setTimeout(() => signal.abort(new Error('Timeout')), delay);
        return signal;
      }
    };
  }

  // Headers polyfill (essential for HTTP requests)
  if (typeof global.Headers === 'undefined') {
    (global as any).Headers = class HeadersPolyfill {
      private _headers: Map<string, string> = new Map();

      constructor(init?: HeadersInit) {
        if (init) {
          if (Array.isArray(init)) {
            init.forEach(([key, value]) => this.set(key, value));
          } else if (typeof init === 'object' && init !== null) {
            Object.entries(init).forEach(([key, value]) => this.set(key, value));
          }
        }
      }

      append(name: string, value: string) {
        const existing = this.get(name);
        this.set(name, existing ? `${existing}, ${value}` : value);
      }

      delete(name: string) {
        this._headers.delete(name.toLowerCase());
      }

      get(name: string) {
        return this._headers.get(name.toLowerCase()) || null;
      }

      has(name: string) {
        return this._headers.has(name.toLowerCase());
      }

      set(name: string, value: string) {
        this._headers.set(name.toLowerCase(), value);
      }

      forEach(callback: (value: string, key: string, parent: any) => void) {
        this._headers.forEach((value, key) => callback(value, key, this));
      }

      entries() {
        return this._headers.entries();
      }

      keys() {
        return this._headers.keys();
      }

      values() {
        return this._headers.values();
      }

      [Symbol.iterator]() {
        return this._headers[Symbol.iterator]();
      }
    };
  }

  // Request polyfill (essential for HTTP requests)
  if (typeof global.Request === 'undefined') {
    (global as any).Request = class RequestPolyfill {
      public method: string;
      public url: string;
      public headers: any;
      public body: any;
      public signal: any;
      public credentials: any;
      public cache: any;
      public redirect: any;
      public referrer: string;
      public referrerPolicy: any;
      public mode: any;

      constructor(input: string | Request, init?: RequestInit) {
        if (typeof input === 'string') {
          this.url = input;
          this.method = init?.method || 'GET';
        } else {
          this.url = input.url;
          this.method = input.method;
        }

        this.headers = new Headers(init?.headers);
        this.body = init?.body;
        this.signal = init?.signal;
        this.credentials = init?.credentials || 'same-origin';
        this.cache = init?.cache || 'default';
        this.redirect = init?.redirect || 'follow';
        this.referrer = init?.referrer || 'about:client';
        this.referrerPolicy = init?.referrerPolicy || '';
        this.mode = init?.mode || 'cors';
      }

      clone() {
        return new RequestPolyfill(this.url, {
          method: this.method,
          headers: this.headers,
          body: this.body,
          signal: this.signal,
          credentials: this.credentials,
          cache: this.cache,
          redirect: this.redirect,
          referrer: this.referrer,
          referrerPolicy: this.referrerPolicy,
          mode: this.mode
        });
      }
    };
  }

  // Response polyfill (essential for HTTP requests)
  if (typeof global.Response === 'undefined') {
    (global as any).Response = class ResponsePolyfill {
      public status: number;
      public statusText: string;
      public headers: any;
      public body: any;
      public url: string;
      public type: string;
      public redirected: boolean;
      public ok: boolean;

      constructor(body?: BodyInit, init?: ResponseInit) {
        this.status = init?.status || 200;
        this.statusText = init?.statusText || 'OK';
        this.headers = new Headers(init?.headers);
        this.body = body;
        this.url = (init as any)?.url || '';
        this.type = 'basic';
        this.redirected = false;
        this.ok = this.status >= 200 && this.status < 300;
      }

      clone() {
        return new ResponsePolyfill(this.body, {
          status: this.status,
          statusText: this.statusText,
          headers: this.headers,
          url: this.url
        } as any);
      }

      async text() {
        return typeof this.body === 'string' ? this.body : '';
      }

      async json() {
        const text = await this.text();
        return JSON.parse(text);
      }

      async blob() {
        return new Blob([this.body || '']);
      }

      async arrayBuffer() {
        return new ArrayBuffer(0);
      }

      async formData() {
        return new FormData();
      }
    };
  }

  // URLSearchParams polyfill (essential for URL handling)
  if (typeof global.URLSearchParams === 'undefined') {
    (global as any).URLSearchParams = class URLSearchParamsPolyfill {
      private _params: Map<string, string[]> = new Map();

      constructor(init?: string | URLSearchParams | Record<string, string>) {
        if (typeof init === 'string') {
          this._parseString(init);
        } else if (init instanceof URLSearchParamsPolyfill) {
          init._params.forEach((values, key) => {
            this._params.set(key, [...values]);
          });
        } else if (typeof init === 'object' && init !== null) {
          Object.entries(init).forEach(([key, value]) => {
            this.append(key, value);
          });
        }
      }

      private _parseString(str: string) {
        str.split('&').forEach(pair => {
          const [key, value] = pair.split('=');
          if (key) {
            this.append(decodeURIComponent(key), value ? decodeURIComponent(value) : '');
          }
        });
      }

      append(name: string, value: string) {
        const existing = this._params.get(name) || [];
        existing.push(value);
        this._params.set(name, existing);
      }

      delete(name: string) {
        this._params.delete(name);
      }

      get(name: string) {
        const values = this._params.get(name);
        return values ? values[0] : null;
      }

      getAll(name: string) {
        return this._params.get(name) || [];
      }

      has(name: string) {
        return this._params.has(name);
      }

      set(name: string, value: string) {
        this._params.set(name, [value]);
      }

      sort() {
        const sorted = new Map([...this._params.entries()].sort());
        this._params = sorted;
      }

      toString() {
        const pairs: string[] = [];
        this._params.forEach((values, key) => {
          values.forEach(value => {
            pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
          });
        });
        return pairs.join('&');
      }

      forEach(callback: (value: string, key: string, parent: any) => void) {
        this._params.forEach((values, key) => {
          values.forEach(value => callback(value, key, this));
        });
      }

      entries() {
        const entries: [string, string][] = [];
        this._params.forEach((values, key) => {
          values.forEach(value => entries.push([key, value]));
        });
        return entries;
      }

      keys() {
        return this._params.keys();
      }

      values() {
        const values: string[] = [];
        this._params.forEach((vals) => {
          values.push(...vals);
        });
        return values;
      }

      [Symbol.iterator]() {
        return this.entries()[Symbol.iterator]();
      }
    };
  }

  // FormData polyfill (essential for form submissions)
  if (typeof global.FormData === 'undefined') {
    // Use the native FormData if available (React Native 0.72+)
    if (typeof FormData !== 'undefined') {
      (global as any).FormData = FormData;
    } else {
      // Fallback polyfill for older React Native versions
      (global as any).FormData = class FormDataPolyfill {
        private data: { [key: string]: any } = {};

        append(name: string, value: any, filename?: string) {
          if (!this.data[name]) {
            this.data[name] = [];
          }
          this.data[name].push({ value, filename });
        }

        set(name: string, value: any, filename?: string) {
          this.data[name] = [{ value, filename }];
        }

        delete(name: string) {
          delete this.data[name];
        }

        get(name: string) {
          const values = this.data[name];
          return values ? values[0].value : null;
        }

        getAll(name: string) {
          const values = this.data[name];
          return values ? values.map((item: any) => item.value) : [];
        }

        has(name: string) {
          return name in this.data;
        }

        forEach(callback: (value: any, key: string, parent: any) => void) {
          Object.entries(this.data).forEach(([key, values]) => {
            values.forEach((item: any) => callback(item.value, key, this));
          });
        }

        entries() {
          const entries: [string, any][] = [];
          Object.entries(this.data).forEach(([key, values]) => {
            values.forEach((item: any) => entries.push([key, item.value]));
          });
          return entries;
        }

        keys() {
          return Object.keys(this.data);
        }

        values() {
          const values: any[] = [];
          Object.values(this.data).forEach((items: any) => {
            items.forEach((item: any) => values.push(item.value));
          });
          return values;
        }
      };
    }
  }

  // TextEncoder and TextDecoder polyfills (essential for encoding)
  if (typeof global.TextEncoder === 'undefined') {
    (global as any).TextEncoder = class TextEncoderPolyfill {
      encode(input: string) {
        const bytes = new Uint8Array(input.length);
        for (let i = 0; i < input.length; i++) {
          bytes[i] = input.charCodeAt(i);
        }
        return bytes;
      }
    };
  }

  if (typeof global.TextDecoder === 'undefined') {
    (global as any).TextDecoder = class TextDecoderPolyfill {
      decode(input: Uint8Array) {
        let result = '';
        for (let i = 0; i < input.length; i++) {
          result += String.fromCharCode(input[i]);
        }
        return result;
      }
    };
  }

  // Blob polyfill (essential for file handling)
  if (typeof global.Blob === 'undefined') {
    (global as any).Blob = class BlobPolyfill {
      public size: number = 0;
      public type: string = '';

      constructor(blobParts?: BlobPart[], options?: BlobPropertyBag) {
        this.type = options?.type || '';
        this.size = blobParts ? blobParts.reduce((size, part) => {
          if (typeof part === 'string') return size + part.length;
          if (part instanceof ArrayBuffer) return size + part.byteLength;
          return size;
        }, 0) : 0;
      }

      slice(start?: number, end?: number, contentType?: string) {
        return new BlobPolyfill([], { type: contentType || this.type });
      }

      async text() {
        return '';
      }

      async arrayBuffer() {
        return new ArrayBuffer(0);
      }

      stream() {
        return new ReadableStream();
      }
    };
  }

  // File polyfill (essential for file handling)
  if (typeof global.File === 'undefined') {
    (global as any).File = class FilePolyfill extends (global as any).Blob {
      public name: string;
      public lastModified: number;

      constructor(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag) {
        super(fileBits, options);
        this.name = fileName;
        this.lastModified = options?.lastModified || Date.now();
      }
    };
  }

  // FileReader polyfill (essential for file reading)
  if (typeof global.FileReader === 'undefined') {
    (global as any).FileReader = class FileReaderPolyfill {
      public readyState: number = 0;
      public result: any = null;
      public error: any = null;
      private _onload: ((event: any) => void) | null = null;
      private _onerror: ((event: any) => void) | null = null;
      private _onloadend: ((event: any) => void) | null = null;

      static EMPTY = 0;
      static LOADING = 1;
      static DONE = 2;

      readAsText(blob: Blob, encoding?: string) {
        this.readyState = FileReaderPolyfill.LOADING;
        setTimeout(() => {
          this.readyState = FileReaderPolyfill.DONE;
          this.result = '';
          if (this._onload) this._onload({ target: this });
          if (this._onloadend) this._onloadend({ target: this });
        }, 0);
      }

      readAsDataURL(blob: Blob) {
        this.readyState = FileReaderPolyfill.LOADING;
        setTimeout(() => {
          this.readyState = FileReaderPolyfill.DONE;
          this.result = 'data:text/plain;base64,';
          if (this._onload) this._onload({ target: this });
          if (this._onloadend) this._onloadend({ target: this });
        }, 0);
      }

      readAsArrayBuffer(blob: Blob) {
        this.readyState = FileReaderPolyfill.LOADING;
        setTimeout(() => {
          this.readyState = FileReaderPolyfill.DONE;
          this.result = new ArrayBuffer(0);
          if (this._onload) this._onload({ target: this });
          if (this._onloadend) this._onloadend({ target: this });
        }, 0);
      }

      abort() {
        this.readyState = FileReaderPolyfill.DONE;
        this.result = null;
      }

      get onload() {
        return this._onload;
      }

      set onload(handler: ((event: any) => void) | null) {
        this._onload = handler;
      }

      get onerror() {
        return this._onerror;
      }

      set onerror(handler: ((event: any) => void) | null) {
        this._onerror = handler;
      }

      get onloadend() {
        return this._onloadend;
      }

      set onloadend(handler: ((event: any) => void) | null) {
        this._onloadend = handler;
      }

      addEventListener(type: string, listener: (event: any) => void) {
        switch (type) {
          case 'load':
            this._onload = listener;
            break;
          case 'error':
            this._onerror = listener;
            break;
          case 'loadend':
            this._onloadend = listener;
            break;
        }
      }

      removeEventListener(type: string, listener: (event: any) => void) {
        switch (type) {
          case 'load':
            if (this._onload === listener) this._onload = null;
            break;
          case 'error':
            if (this._onerror === listener) this._onerror = null;
            break;
          case 'loadend':
            if (this._onloadend === listener) this._onloadend = null;
            break;
        }
      }
    };
  }

  // XMLHttpRequest polyfill (essential for HTTP requests)
  if (typeof global.XMLHttpRequest === 'undefined') {
    (global as any).XMLHttpRequest = class XMLHttpRequestPolyfill {
      public readyState: number = 0;
      public status: number = 0;
      public statusText: string = '';
      public response: any = null;
      public responseText: string = '';
      public responseType: string = '';
      public responseURL: string = '';
      public responseXML: any = null;
      public upload: any = null;
      public timeout: number = 0;
      public withCredentials: boolean = false;

      private _onreadystatechange: ((event?: any) => void) | null = null;
      private _onload: ((event?: any) => void) | null = null;
      private _onerror: ((event?: any) => void) | null = null;
      private _ontimeout: ((event?: any) => void) | null = null;

      static UNSENT = 0;
      static OPENED = 1;
      static HEADERS_RECEIVED = 2;
      static LOADING = 3;
      static DONE = 4;

      open(method: string, url: string, async?: boolean, user?: string, password?: string) {
        this.readyState = XMLHttpRequestPolyfill.OPENED;
        this.responseURL = url;
        if (this._onreadystatechange) this._onreadystatechange();
      }

      send(data?: any) {
        this.readyState = XMLHttpRequestPolyfill.LOADING;
        if (this._onreadystatechange) this._onreadystatechange();
        
        setTimeout(() => {
          this.readyState = XMLHttpRequestPolyfill.DONE;
          this.status = 200;
          this.statusText = 'OK';
          this.response = '';
          this.responseText = '';
          if (this._onreadystatechange) this._onreadystatechange();
          if (this._onload) this._onload();
        }, 100);
      }

      abort() {
        this.readyState = XMLHttpRequestPolyfill.UNSENT;
        if (this._onreadystatechange) this._onreadystatechange();
      }

      setRequestHeader(name: string, value: string) {
        // Stub implementation
      }

      getResponseHeader(name: string) {
        return null;
      }

      getAllResponseHeaders() {
        return '';
      }

      overrideMimeType(mime: string) {
        // Stub implementation
      }

      get onreadystatechange() {
        return this._onreadystatechange;
      }

      set onreadystatechange(handler: ((event?: any) => void) | null) {
        this._onreadystatechange = handler;
      }

      get onload() {
        return this._onload;
      }

      set onload(handler: ((event?: any) => void) | null) {
        this._onload = handler;
      }

      get onerror() {
        return this._onerror;
      }

      set onerror(handler: ((event?: any) => void) | null) {
        this._onerror = handler;
      }

      get ontimeout() {
        return this._ontimeout;
      }

      set ontimeout(handler: ((event?: any) => void) | null) {
        this._ontimeout = handler;
      }

      addEventListener(type: string, listener: (event: any) => void) {
        switch (type) {
          case 'readystatechange':
            this._onreadystatechange = listener;
            break;
          case 'load':
            this._onload = listener;
            break;
          case 'error':
            this._onerror = listener;
            break;
          case 'timeout':
            this._ontimeout = listener;
            break;
        }
      }

      removeEventListener(type: string, listener: (event: any) => void) {
        switch (type) {
          case 'readystatechange':
            if (this._onreadystatechange === listener) this._onreadystatechange = null;
            break;
          case 'load':
            if (this._onload === listener) this._onload = null;
            break;
          case 'error':
            if (this._onerror === listener) this._onerror = null;
            break;
          case 'timeout':
            if (this._ontimeout === listener) this._ontimeout = null;
            break;
        }
      }
    };
  }

  // ReadableStream polyfill (essential for stream processing)
  if (typeof global.ReadableStream === 'undefined') {
    (global as any).ReadableStream = class ReadableStreamPolyfill {
      private _controller: any;
      private _reader: any;

      constructor(underlyingSource?: UnderlyingSource) {
        this._controller = {
          enqueue: (chunk: any) => {
            console.log('ReadableStream.enqueue (stub):', chunk);
          },
          close: () => {
            console.log('ReadableStream.close (stub)');
          },
          error: (error: any) => {
            console.log('ReadableStream.error (stub):', error);
          }
        };

        if (underlyingSource?.start) {
          underlyingSource.start(this._controller);
        }
      }

      getReader() {
        return {
          read: () => Promise.resolve({ done: true, value: undefined }),
          releaseLock: () => {},
          closed: Promise.resolve()
        };
      }

      pipeTo(destination: any) {
        return Promise.resolve();
      }

      pipeThrough(transform: any) {
        return this;
      }

      tee() {
        return [this, this];
      }

      cancel(reason?: any) {
        return Promise.resolve();
      }

      get locked() {
        return false;
      }
    };
  }

  // WritableStream polyfill (essential for stream processing)
  if (typeof global.WritableStream === 'undefined') {
    (global as any).WritableStream = class WritableStreamPolyfill {
      private _writer: any;

      constructor(underlyingSink?: UnderlyingSink) {
        this._writer = {
          write: (chunk: any) => {
            console.log('WritableStream.write (stub):', chunk);
            return Promise.resolve();
          },
          close: () => {
            console.log('WritableStream.close (stub)');
            return Promise.resolve();
          },
          abort: (reason?: any) => {
            console.log('WritableStream.abort (stub):', reason);
            return Promise.resolve();
          }
        };

        if (underlyingSink?.start) {
          underlyingSink.start(this._writer);
        }
      }

      getWriter() {
        return this._writer;
      }

      close() {
        return Promise.resolve();
      }

      abort(reason?: any) {
        return Promise.resolve();
      }

      get locked() {
        return false;
      }
    };
  }

  // TransformStream polyfill (essential for stream processing)
  if (typeof global.TransformStream === 'undefined') {
    (global as any).TransformStream = class TransformStreamPolyfill {
      public readable: ReadableStream;
      public writable: WritableStream;

      constructor(transformer?: Transformer) {
        this.readable = new ReadableStream();
        this.writable = new WritableStream();
      }
    };
  }

  // MessageChannel polyfill (essential for messaging)
  if (typeof global.MessageChannel === 'undefined') {
    (global as any).MessageChannel = class MessageChannelPolyfill {
      public port1: MessagePort;
      public port2: MessagePort;

      constructor() {
        this.port1 = new (global as any).MessagePort();
        this.port2 = new (global as any).MessagePort();
        (this.port1 as any)._otherPort = this.port2;
        (this.port2 as any)._otherPort = this.port1;
      }
    };
  }

  if (typeof global.MessagePort === 'undefined') {
    (global as any).MessagePort = class MessagePortPolyfill {
      public _otherPort: MessagePortPolyfill | null = null;
      private _onmessage: ((event: MessageEvent) => void) | null = null;

      postMessage(message: any) {
        console.log('MessagePort.postMessage (stub):', message);
        if (this._otherPort && this._otherPort._onmessage) {
          setTimeout(() => {
            this._otherPort!._onmessage!({ data: message } as any);
          }, 0);
        }
      }

      start() {
        console.log('MessagePort.start (stub)');
      }

      close() {
        console.log('MessagePort.close (stub)');
      }

      get onmessage() {
        return this._onmessage;
      }

      set onmessage(handler: ((event: MessageEvent) => void) | null) {
        this._onmessage = handler;
      }

      addEventListener(type: string, listener: (event: MessageEvent) => void) {
        if (type === 'message') {
          this._onmessage = listener;
        }
      }

      removeEventListener(type: string, listener: (event: MessageEvent) => void) {
        if (type === 'message' && this._onmessage === listener) {
          this._onmessage = null;
        }
      }
    };
  }

  // BroadcastChannel polyfill (essential for cross-tab communication)
  if (typeof global.BroadcastChannel === 'undefined') {
    (global as any).BroadcastChannel = class BroadcastChannelPolyfill {
      public name: string;
      private _onmessage: ((event: MessageEvent) => void) | null = null;

      constructor(name: string) {
        this.name = name;
      }

      postMessage(message: any) {
        console.log('BroadcastChannel.postMessage (stub):', message);
      }

      close() {
        console.log('BroadcastChannel.close (stub)');
      }

      get onmessage() {
        return this._onmessage;
      }

      set onmessage(handler: ((event: MessageEvent) => void) | null) {
        this._onmessage = handler;
      }

      addEventListener(type: string, listener: (event: MessageEvent) => void) {
        if (type === 'message') {
          this._onmessage = listener;
        }
      }

      removeEventListener(type: string, listener: (event: MessageEvent) => void) {
        if (type === 'message' && this._onmessage === listener) {
          this._onmessage = null;
        }
      }
    };
  }

  // Worker polyfill (minimal stub for libraries that expect it)
  if (typeof global.Worker === 'undefined') {
    (global as any).Worker = class WorkerPolyfill {
      constructor(scriptURL: string) {
        console.log('Worker (stub):', scriptURL);
      }

      postMessage(message: any) {
        console.log('Worker.postMessage (stub):', message);
      }

      terminate() {
        console.log('Worker.terminate (stub)');
      }

      addEventListener(type: string, listener: Function) {
        console.log('Worker.addEventListener (stub):', type);
      }

      removeEventListener(type: string, listener: Function) {
        console.log('Worker.removeEventListener (stub):', type);
      }
    };
  }

  // SharedArrayBuffer polyfill (minimal stub)
  if (typeof global.SharedArrayBuffer === 'undefined') {
    (global as any).SharedArrayBuffer = class SharedArrayBufferPolyfill {
      public byteLength: number;

      constructor(length: number) {
        this.byteLength = length;
      }

      slice(begin?: number, end?: number) {
        return new SharedArrayBufferPolyfill(0);
      }
    };
  }

  // Atomics polyfill (minimal stub)
  if (typeof global.Atomics === 'undefined') {
    (global as any).Atomics = {
      add: () => 0,
      and: () => 0,
      compareExchange: () => 0,
      exchange: () => 0,
      isLockFree: () => false,
      load: () => 0,
      notify: () => 0,
      or: () => 0,
      store: () => 0,
      sub: () => 0,
      wait: () => 'ok',
      waitAsync: () => ({ value: 'ok', async: false }),
      xor: () => 0
    };
  }

  // WeakRef polyfill (minimal stub)
  if (typeof global.WeakRef === 'undefined') {
    (global as any).WeakRef = class WeakRefPolyfill {
      constructor(target: any) {
        console.log('WeakRef (stub):', target);
      }

      deref() {
        return undefined;
      }
    };
  }

  // FinalizationRegistry polyfill (minimal stub)
  if (typeof global.FinalizationRegistry === 'undefined') {
    (global as any).FinalizationRegistry = class FinalizationRegistryPolyfill {
      constructor(cleanupCallback: (heldValue: any) => void) {
        console.log('FinalizationRegistry (stub):', cleanupCallback);
      }

      register(target: any, heldValue: any, unregisterToken?: any) {
        console.log('FinalizationRegistry.register (stub):', target, heldValue);
      }

      unregister(unregisterToken: any) {
        console.log('FinalizationRegistry.unregister (stub):', unregisterToken);
        return false;
      }
    };
  }

  // Additional browser APIs
  if (typeof global.performance === 'undefined') {
    (global as any).performance = {
      now: () => Date.now(),
      mark: () => {},
      measure: () => {},
      getEntries: () => [],
      getEntriesByName: () => [],
      getEntriesByType: () => [],
      clearMarks: () => {},
      clearMeasures: () => {},
      clearResourceTimings: () => {},
      timing: {
        navigationStart: Date.now(),
        loadEventEnd: Date.now(),
        loadEventStart: Date.now(),
        domContentLoadedEventEnd: Date.now(),
        domContentLoadedEventStart: Date.now(),
        domComplete: Date.now(),
        domInteractive: Date.now(),
        domLoading: Date.now(),
        responseEnd: Date.now(),
        responseStart: Date.now(),
        requestStart: Date.now(),
        connectEnd: Date.now(),
        connectStart: Date.now(),
        domainLookupEnd: Date.now(),
        domainLookupStart: Date.now(),
        fetchStart: Date.now()
      }
    };
  }

  // RequestAnimationFrame polyfill
  if (typeof global.requestAnimationFrame === 'undefined') {
    (global as any).requestAnimationFrame = (callback: FrameRequestCallback) => {
      return setTimeout(callback, 16); // ~60fps
    };
  }

  if (typeof global.cancelAnimationFrame === 'undefined') {
    (global as any).cancelAnimationFrame = (id: number) => {
      clearTimeout(id);
    };
  }

  // IntersectionObserver polyfill (minimal stub)
  if (typeof global.IntersectionObserver === 'undefined') {
    (global as any).IntersectionObserver = class IntersectionObserverPolyfill {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        console.log('IntersectionObserver (stub):', callback, options);
      }

      observe(target: Element) {
        console.log('IntersectionObserver.observe (stub):', target);
      }

      unobserve(target: Element) {
        console.log('IntersectionObserver.unobserve (stub):', target);
      }

      disconnect() {
        console.log('IntersectionObserver.disconnect (stub)');
      }

      takeRecords() {
        return [];
      }
    };
  }

  // ResizeObserver polyfill (minimal stub)
  if (typeof global.ResizeObserver === 'undefined') {
    (global as any).ResizeObserver = class ResizeObserverPolyfill {
      constructor(callback: ResizeObserverCallback) {
        console.log('ResizeObserver (stub):', callback);
      }

      observe(target: Element) {
        console.log('ResizeObserver.observe (stub):', target);
      }

      unobserve(target: Element) {
        console.log('ResizeObserver.unobserve (stub):', target);
      }

      disconnect() {
        console.log('ResizeObserver.disconnect (stub)');
      }
    };
  }

  // MutationObserver polyfill (minimal stub)
  if (typeof global.MutationObserver === 'undefined') {
    (global as any).MutationObserver = class MutationObserverPolyfill {
      constructor(callback: MutationCallback) {
        console.log('MutationObserver (stub):', callback);
      }

      observe(target: Node, options?: MutationObserverInit) {
        console.log('MutationObserver.observe (stub):', target, options);
      }

      disconnect() {
        console.log('MutationObserver.disconnect (stub)');
      }

      takeRecords() {
        return [];
      }
    };
  }

  // WebSocket polyfill for React Native
if (typeof global !== 'undefined' && typeof global.WebSocket === 'undefined') {
  if (typeof WebSocket !== 'undefined') {
    (global as any).WebSocket = WebSocket;
  } else {
      (global as any).WebSocket = class WebSocketPolyfill {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;

        public readyState: number = WebSocketPolyfill.CONNECTING;
        public url: string;
        public protocol: string = '';
        public binaryType: 'blob' | 'arraybuffer' = 'blob';
        public bufferedAmount: number = 0;
        public extensions: string = '';

        private _onopen: ((event: Event) => void) | null = null;
        private _onclose: ((event: CloseEvent) => void) | null = null;
        private _onmessage: ((event: MessageEvent) => void) | null = null;
        private _onerror: ((event: Event) => void) | null = null;

        constructor(url: string, protocols?: string | string[]) {
          this.url = url;
          this.protocol = Array.isArray(protocols) ? protocols[0] : protocols || '';
          
          // Simulate connection
          setTimeout(() => {
            this.readyState = WebSocketPolyfill.OPEN;
            if (this._onopen) {
              this._onopen(new Event('open'));
            }
          }, 100);
        }

        send(data: string | ArrayBuffer | Blob) {
          if (this.readyState !== WebSocketPolyfill.OPEN) {
            throw new Error('WebSocket is not open');
          }
          console.log('WebSocket send (stub):', data);
        }

        close(code?: number, reason?: string) {
          if (this.readyState === WebSocketPolyfill.CLOSED || this.readyState === WebSocketPolyfill.CLOSING) {
            return;
          }
          this.readyState = WebSocketPolyfill.CLOSING;
          setTimeout(() => {
            this.readyState = WebSocketPolyfill.CLOSED;
            if (this._onclose) {
              this._onclose(new CloseEvent('close', { code, reason }));
            }
          }, 100);
        }

        ping(data?: string | Buffer) {
          if (this.readyState === WebSocketPolyfill.OPEN) {
            console.log('WebSocket ping (stub):', data);
          }
        }

        pong(data?: string | Buffer) {
          if (this.readyState === WebSocketPolyfill.OPEN) {
            console.log('WebSocket pong (stub):', data);
          }
        }

        addEventListener(type: string, listener: (event: any) => void, options?: any) {
          switch (type) {
            case 'open':
              this._onopen = listener;
              break;
            case 'close':
              this._onclose = listener;
              break;
            case 'message':
              this._onmessage = listener;
              break;
            case 'error':
              this._onerror = listener;
              break;
          }
        }

        removeEventListener(type: string, listener: (event: any) => void, options?: any) {
          switch (type) {
            case 'open':
              if (this._onopen === listener) this._onopen = null;
              break;
            case 'close':
              if (this._onclose === listener) this._onclose = null;
              break;
            case 'message':
              if (this._onmessage === listener) this._onmessage = null;
              break;
            case 'error':
              if (this._onerror === listener) this._onerror = null;
              break;
          }
        }

        dispatchEvent(event: any) {
          return true;
        }

        get onopen() {
          return this._onopen;
        }

        set onopen(handler: ((event: Event) => void) | null) {
          this._onopen = handler;
        }

        get onclose() {
          return this._onclose;
        }

        set onclose(handler: ((event: CloseEvent) => void) | null) {
          this._onclose = handler;
        }

        get onmessage() {
          return this._onmessage;
        }

        set onmessage(handler: ((event: MessageEvent) => void) | null) {
          this._onmessage = handler;
        }

        get onerror() {
          return this._onerror;
        }

        set onerror(handler: ((event: Event) => void) | null) {
          this._onerror = handler;
        }
      };
    }
  }

  // Additional polyfills for Node.js modules used in React Native
  if (typeof global !== 'undefined') {
    // Polyfill for Node.js 'events' module
    if (typeof (global as any).EventEmitter === 'undefined') {
      (global as any).EventEmitter = class EventEmitterPolyfill {
        private _events: { [key: string]: Function[] } = {};

        on(event: string, listener: Function) {
          if (!this._events[event]) {
            this._events[event] = [];
          }
          this._events[event].push(listener);
          return this;
        }

        once(event: string, listener: Function) {
          const onceWrapper = (...args: any[]) => {
            this.removeListener(event, onceWrapper);
            listener(...args);
          };
          return this.on(event, onceWrapper);
        }

        emit(event: string, ...args: any[]) {
          if (this._events[event]) {
            this._events[event].forEach(listener => listener(...args));
          }
          return this;
        }

        removeListener(event: string, listener: Function) {
          if (this._events[event]) {
            this._events[event] = this._events[event].filter(l => l !== listener);
          }
          return this;
        }

        removeAllListeners(event?: string) {
          if (event) {
            delete this._events[event];
          } else {
            this._events = {};
          }
          return this;
        }

        listenerCount(event: string) {
          return this._events[event] ? this._events[event].length : 0;
        }

        listeners(event: string) {
          return this._events[event] ? [...this._events[event]] : [];
        }
      };
    }

    // Polyfill for Node.js 'util' module
    if (typeof (global as any).util === 'undefined') {
      (global as any).util = {
        inspect: (obj: any) => JSON.stringify(obj, null, 2),
        format: (format: string, ...args: any[]) => {
          return format.replace(/%[sdj%]/g, (match) => {
            if (match === '%%') return '%';
            const arg = args.shift();
            if (match === '%s') return String(arg);
            if (match === '%d') return String(Number(arg));
            if (match === '%j') return JSON.stringify(arg);
            return match;
          });
        },
        promisify: (fn: Function) => {
          return (...args: any[]) => {
            return new Promise((resolve, reject) => {
              fn(...args, (err: any, result: any) => {
                if (err) reject(err);
                else resolve(result);
              });
            });
          };
        },
        callbackify: (fn: Function) => {
          return (...args: any[]) => {
            const callback = args.pop();
            fn(...args).then((result: any) => callback(null, result)).catch(callback);
          };
        }
      };
    }
  }

  // Node.js timer polyfills
  if (typeof global !== 'undefined') {
    if (typeof global.setImmediate === 'undefined') {
      (global as any).setImmediate = (callback: Function, ...args: any[]) => {
        return setTimeout(callback, 0, ...args);
      };
    }
    if (typeof global.clearImmediate === 'undefined') {
      (global as any).clearImmediate = (id: number) => {
        clearTimeout(id);
      };
    }
    if (typeof global.setInterval === 'undefined') {
      (global as any).setInterval = setInterval;
    }
    if (typeof global.clearInterval === 'undefined') {
      (global as any).clearInterval = clearInterval;
    }
    if (typeof global.setTimeout === 'undefined') {
      (global as any).setTimeout = setTimeout;
    }
    if (typeof global.clearTimeout === 'undefined') {
      (global as any).clearTimeout = clearTimeout;
    }
  }

  // Polyfill for Node.js 'os' module
  if (typeof (global as any).os === 'undefined') {
    (global as any).os = {
      platform: () => 'react-native',
      arch: () => 'arm64',
      type: () => 'React Native',
      release: () => '1.0.0',
      uptime: () => 0,
      loadavg: () => [0, 0, 0],
      totalmem: () => 0,
      freemem: () => 0,
      cpus: () => [],
      networkInterfaces: () => ({}),
      homedir: () => '/',
      tmpdir: () => '/tmp',
      hostname: () => 'react-native',
      userInfo: () => ({ username: 'react-native', uid: 0, gid: 0, shell: null, homedir: '/' }),
      endianness: () => 'LE',
      EOL: '\n'
    };
  }

  // Polyfill for Node.js 'path' module
  if (typeof (global as any).path === 'undefined') {
    (global as any).path = {
      sep: '/',
      delimiter: ':',
      posix: {},
      win32: {},
      normalize: (p: string) => p,
      join: (...paths: string[]) => paths.join('/'),
      resolve: (...paths: string[]) => paths.join('/'),
      relative: (from: string, to: string) => to,
      dirname: (p: string) => p.split('/').slice(0, -1).join('/') || '/',
      basename: (p: string, ext?: string) => {
        const base = p.split('/').pop() || '';
        return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base;
      },
      extname: (p: string) => {
        const parts = p.split('/');
        const filename = parts[parts.length - 1];
        const dotIndex = filename.lastIndexOf('.');
        return dotIndex > 0 ? filename.slice(dotIndex) : '';
      },
      format: (pathObject: any) => pathObject.dir + '/' + pathObject.base,
      parse: (pathString: string) => {
        const parts = pathString.split('/');
        const base = parts.pop() || '';
        const dir = parts.join('/') || '/';
        const dotIndex = base.lastIndexOf('.');
        const ext = dotIndex > 0 ? base.slice(dotIndex) : '';
        const name = dotIndex > 0 ? base.slice(0, dotIndex) : base;
        return { root: '/', dir, base, ext, name };
      }
    };
  }

  // Polyfill for Node.js 'url' module
  if (typeof (global as any).url === 'undefined') {
    (global as any).url = {
      parse: (urlString: string) => {
        const url = new URL(urlString);
        return {
          protocol: url.protocol,
          slashes: url.protocol.endsWith(':'),
          auth: url.username ? `${url.username}:${url.password}` : null,
          host: url.host,
          port: url.port,
          hostname: url.hostname,
          hash: url.hash,
          search: url.search,
          query: url.searchParams,
          pathname: url.pathname,
          path: url.pathname + url.search,
          href: url.href
        };
      },
      format: (urlObject: any) => {
        const url = new URL(urlObject.href || 'http://localhost');
        if (urlObject.protocol) url.protocol = urlObject.protocol;
        if (urlObject.hostname) url.hostname = urlObject.hostname;
        if (urlObject.port) url.port = urlObject.port;
        if (urlObject.pathname) url.pathname = urlObject.pathname;
        if (urlObject.search) url.search = urlObject.search;
        if (urlObject.hash) url.hash = urlObject.hash;
        return url.href;
      },
      resolve: (from: string, to: string) => {
        return new URL(to, from).href;
      }
    };
  }

  // Polyfill for Node.js 'querystring' module
  if (typeof (global as any).querystring === 'undefined') {
    (global as any).querystring = {
      parse: (str: string) => {
        const params = new URLSearchParams(str);
        const result: any = {};
        for (const [key, value] of params) {
          result[key] = value;
        }
        return result;
      },
      stringify: (obj: any) => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(obj)) {
          params.append(key, String(value));
        }
        return params.toString();
      },
      escape: (str: string) => encodeURIComponent(str),
      unescape: (str: string) => decodeURIComponent(str)
    };
  }

  // Polyfill for Node.js 'stream' module
  if (typeof (global as any).stream === 'undefined') {
    (global as any).stream = {
      Readable: class ReadablePolyfill {
        constructor() {
          console.log('Readable stream (stub)');
        }
      },
      Writable: class WritablePolyfill {
        constructor() {
          console.log('Writable stream (stub)');
        }
      },
      Duplex: class DuplexPolyfill {
        constructor() {
          console.log('Duplex stream (stub)');
        }
      },
      Transform: class TransformPolyfill {
        constructor() {
          console.log('Transform stream (stub)');
        }
      },
      PassThrough: class PassThroughPolyfill {
      constructor() {
          console.log('PassThrough stream (stub)');
        }
      }
    };
  }

  // Polyfill for Node.js 'fs' module (read-only stub)
  if (typeof (global as any).fs === 'undefined') {
    (global as any).fs = {
      readFile: (path: string, callback: Function) => {
        callback(new Error('fs.readFile not available in React Native'));
      },
      writeFile: (path: string, data: any, callback: Function) => {
        callback(new Error('fs.writeFile not available in React Native'));
      },
      exists: (path: string, callback: Function) => {
        callback(false);
      },
      stat: (path: string, callback: Function) => {
        callback(new Error('fs.stat not available in React Native'));
      },
      readdir: (path: string, callback: Function) => {
        callback(new Error('fs.readdir not available in React Native'));
      },
      mkdir: (path: string, callback: Function) => {
        callback(new Error('fs.mkdir not available in React Native'));
      },
      rmdir: (path: string, callback: Function) => {
        callback(new Error('fs.rmdir not available in React Native'));
      },
      unlink: (path: string, callback: Function) => {
        callback(new Error('fs.unlink not available in React Native'));
      }
    };
  }
}

