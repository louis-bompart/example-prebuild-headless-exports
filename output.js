// index.js
import { something } from "@servicenow/packages";

// node_modules/@coveo/bueno/dist/browser/bueno.esm.js
function buildSchemaValidationError(errors, context) {
  const message = `
  The following properties are invalid:

    ${errors.join("\n	")}
  
  ${context}
  `;
  return new SchemaValidationError(message);
}
var SchemaValidationError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "SchemaValidationError";
  }
};
var Schema = class {
  constructor(definition) {
    this.definition = definition;
  }
  validate(values = {}, message = "") {
    const mergedValues = {
      ...this.default,
      ...values
    };
    const errors = [];
    for (const property in this.definition) {
      const error = this.definition[property].validate(mergedValues[property]);
      error && errors.push(`${property}: ${error}`);
    }
    if (errors.length) {
      throw buildSchemaValidationError(errors, message);
    }
    return mergedValues;
  }
  get default() {
    const defaultValues = {};
    for (const property in this.definition) {
      const defaultValue = this.definition[property].default;
      if (defaultValue !== void 0) {
        defaultValues[property] = defaultValue;
      }
    }
    return defaultValues;
  }
};
var Value = class {
  constructor(baseConfig = {}) {
    this.baseConfig = baseConfig;
  }
  validate(value) {
    if (this.baseConfig.required && isNullOrUndefined(value)) {
      return "value is required.";
    }
    return null;
  }
  get default() {
    return this.baseConfig.default instanceof Function ? this.baseConfig.default() : this.baseConfig.default;
  }
  get required() {
    return this.baseConfig.required === true;
  }
};
function isUndefined(value) {
  return value === void 0;
}
function isNull(value) {
  return value === null;
}
function isNullOrUndefined(value) {
  return isUndefined(value) || isNull(value);
}
var NumberValue = class {
  constructor(config = {}) {
    this.config = config;
    this.value = new Value(config);
  }
  value;
  validate(value) {
    const valueValidation = this.value.validate(value);
    if (valueValidation) {
      return valueValidation;
    }
    if (!isNumberOrUndefined(value)) {
      return "value is not a number.";
    }
    if (value < this.config.min) {
      return `minimum value of ${this.config.min} not respected.`;
    }
    if (value > this.config.max) {
      return `maximum value of ${this.config.max} not respected.`;
    }
    return null;
  }
  get default() {
    return this.value.default;
  }
  get required() {
    return this.value.required;
  }
};
function isNumberOrUndefined(value) {
  return isUndefined(value) || isNumber(value);
}
function isNumber(value) {
  return typeof value === "number" && !isNaN(value);
}
var BooleanValue = class {
  value;
  constructor(config = {}) {
    this.value = new Value(config);
  }
  validate(value) {
    const valueValidation = this.value.validate(value);
    if (valueValidation) {
      return valueValidation;
    }
    if (!isBooleanOrUndefined(value)) {
      return "value is not a boolean.";
    }
    return null;
  }
  get default() {
    return this.value.default;
  }
  get required() {
    return this.value.required;
  }
};
function isBooleanOrUndefined(value) {
  return isUndefined(value) || isBoolean(value);
}
function isBoolean(value) {
  return typeof value === "boolean";
}
var urlRegex = /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i;
var ISODateStringRegex = /^\d{4}(-\d\d(-\d\d(T\d\d:\d\d(:\d\d)?(\.\d+)?(([+-]\d\d:\d\d)|Z)?)?)?)?$/i;
var StringValue = class {
  value;
  config;
  constructor(config = {}) {
    this.config = {
      emptyAllowed: true,
      url: false,
      ...config
    };
    this.value = new Value(this.config);
  }
  validate(value) {
    const { emptyAllowed, url, regex, constrainTo, ISODate } = this.config;
    const valueValidation = this.value.validate(value);
    if (valueValidation) {
      return valueValidation;
    }
    if (isUndefined(value)) {
      return null;
    }
    if (!isString(value)) {
      return "value is not a string.";
    }
    if (!emptyAllowed && !value.length) {
      return "value is an empty string.";
    }
    if (url && !urlRegex.test(value)) {
      return "value is not a valid URL.";
    }
    if (regex && !regex.test(value)) {
      return `value did not match provided regex ${regex}`;
    }
    if (constrainTo && !constrainTo.includes(value)) {
      const values = constrainTo.join(", ");
      return `value should be one of: ${values}.`;
    }
    if (ISODate && !(ISODateStringRegex.test(value) && new Date(value).toString() !== "Invalid Date")) {
      return "value is not a valid ISO8601 date string";
    }
    return null;
  }
  get default() {
    return this.value.default;
  }
  get required() {
    return this.value.required;
  }
};
function isString(value) {
  return Object.prototype.toString.call(value) === "[object String]";
}
var RecordValue = class {
  config;
  constructor(config = {}) {
    this.config = {
      options: { required: false },
      values: {},
      ...config
    };
  }
  validate(input) {
    if (isUndefined(input)) {
      return this.config.options.required ? "value is required and is currently undefined" : null;
    }
    if (!isRecord(input)) {
      return "value is not an object";
    }
    for (const [k, v] of Object.entries(this.config.values)) {
      if (v.required && isNullOrUndefined(input[k])) {
        return `value does not contain ${k}`;
      }
    }
    let out = "";
    for (const [key, validator] of Object.entries(this.config.values)) {
      const value = input[key];
      const invalidValue = validator.validate(value);
      if (invalidValue !== null) {
        out += " " + invalidValue;
      }
    }
    return out === "" ? null : out;
  }
  get default() {
    return void 0;
  }
  get required() {
    return !!this.config.options.required;
  }
};
function isRecord(value) {
  return value !== void 0 && typeof value === "object";
}
var ArrayValue = class {
  constructor(config = {}) {
    this.config = config;
    this.value = new Value(this.config);
  }
  value;
  validate(input) {
    if (!isNullOrUndefined(input) && !Array.isArray(input)) {
      return "value is not an array";
    }
    const invalid = this.value.validate(input);
    if (invalid !== null) {
      return invalid;
    }
    if (isNullOrUndefined(input)) {
      return null;
    }
    if (this.config.max !== void 0 && input.length > this.config.max) {
      return `value contains more than ${this.config.max}`;
    }
    if (this.config.min !== void 0 && input.length < this.config.min) {
      return `value contains less than ${this.config.min}`;
    }
    if (this.config.each !== void 0) {
      let out = "";
      input.forEach((el2) => {
        if (this.config.each.required && isNullOrUndefined(el2)) {
          out = `value is null or undefined: ${input.join(",")}`;
        }
        const isInvalid = this.validatePrimitiveValue(el2, this.config.each);
        if (isInvalid !== null) {
          out += " " + isInvalid;
        }
      });
      return out === "" ? null : out;
    }
    return null;
  }
  validatePrimitiveValue(v, validator) {
    if (isBoolean(v)) {
      return validator.validate(v);
    } else if (isString(v)) {
      return validator.validate(v);
    } else if (isNumber(v)) {
      return validator.validate(v);
    } else if (isRecord(v)) {
      return validator.validate(v);
    }
    return "value is not a primitive value";
  }
  get default() {
    return void 0;
  }
  get required() {
    return this.value.required;
  }
};
function isArray(value) {
  return Array.isArray(value);
}
var EnumValue = class {
  constructor(config) {
    this.config = config;
    this.value = new Value(config);
  }
  value;
  validate(value) {
    const invalid = this.value.validate(value);
    if (invalid !== null) {
      return invalid;
    }
    if (isUndefined(value)) {
      return null;
    }
    const valueInEnum = Object.values(this.config.enum).find(
      (enumValue) => enumValue === value
    );
    if (!valueInEnum) {
      return "value is not in enum.";
    }
    return null;
  }
  get default() {
    return this.value.default;
  }
  get required() {
    return this.value.required;
  }
};

// node_modules/@coveo/headless/dist/browser/insight/headless.esm.js
var Nx = Object.create;
var Ri = Object.defineProperty;
var Mx = Object.getOwnPropertyDescriptor;
var Qx = Object.getOwnPropertyNames;
var Lx = Object.getPrototypeOf;
var Bx = Object.prototype.hasOwnProperty;
var Ux = (e4, t, r) => t in e4 ? Ri(e4, t, { enumerable: true, configurable: true, writable: true, value: r }) : e4[t] = r;
var be = (e4, t) => () => (t || e4((t = { exports: {} }).exports, t), t.exports);
var _x = (e4, t) => {
  for (var r in t) Ri(e4, r, { get: t[r], enumerable: true });
};
var jx = (e4, t, r, n) => {
  if (t && typeof t == "object" || typeof t == "function") for (let o of Qx(t)) !Bx.call(e4, o) && o !== r && Ri(e4, o, { get: () => t[o], enumerable: !(n = Mx(t, o)) || n.enumerable });
  return e4;
};
var bt = (e4, t, r) => (r = e4 != null ? Nx(Lx(e4)) : {}, jx(t || !e4 || !e4.__esModule ? Ri(r, "default", { value: e4, enumerable: true }) : r, e4));
var ye = (e4, t, r) => Ux(e4, typeof t != "symbol" ? t + "" : t, r);
var cg = be((ia) => {
  "use strict";
  var Ei = ia && ia.__assign || function() {
    return Ei = Object.assign || function(e4) {
      for (var t, r = 1, n = arguments.length; r < n; r++) {
        t = arguments[r];
        for (var o in t) Object.prototype.hasOwnProperty.call(t, o) && (e4[o] = t[o]);
      }
      return e4;
    }, Ei.apply(this, arguments);
  };
  Object.defineProperty(ia, "__esModule", { value: true });
  var tF = { delayFirstAttempt: false, jitter: "none", maxDelay: 1 / 0, numOfAttempts: 10, retry: function() {
    return true;
  }, startingDelay: 100, timeMultiple: 2 };
  function rF(e4) {
    var t = Ei(Ei({}, tF), e4);
    return t.numOfAttempts < 1 && (t.numOfAttempts = 1), t;
  }
  ia.getSanitizedOptions = rF;
});
var ug = be((Kl) => {
  "use strict";
  Object.defineProperty(Kl, "__esModule", { value: true });
  function nF(e4) {
    var t = Math.random() * e4;
    return Math.round(t);
  }
  Kl.fullJitter = nF;
});
var lg = be((Jl) => {
  "use strict";
  Object.defineProperty(Jl, "__esModule", { value: true });
  function oF(e4) {
    return e4;
  }
  Jl.noJitter = oF;
});
var dg = be((Xl) => {
  "use strict";
  Object.defineProperty(Xl, "__esModule", { value: true });
  var aF = ug(), iF = lg();
  function sF(e4) {
    switch (e4.jitter) {
      case "full":
        return aF.fullJitter;
      case "none":
      default:
        return iF.noJitter;
    }
  }
  Xl.JitterFactory = sF;
});
var ed = be((Zl) => {
  "use strict";
  Object.defineProperty(Zl, "__esModule", { value: true });
  var cF = dg(), uF = function() {
    function e4(t) {
      this.options = t, this.attempt = 0;
    }
    return e4.prototype.apply = function() {
      var t = this;
      return new Promise(function(r) {
        return setTimeout(r, t.jitteredDelay);
      });
    }, e4.prototype.setAttemptNumber = function(t) {
      this.attempt = t;
    }, Object.defineProperty(e4.prototype, "jitteredDelay", { get: function() {
      var t = cF.JitterFactory(this.options);
      return t(this.delay);
    }, enumerable: true, configurable: true }), Object.defineProperty(e4.prototype, "delay", { get: function() {
      var t = this.options.startingDelay, r = this.options.timeMultiple, n = this.numOfDelayedAttempts, o = t * Math.pow(r, n);
      return Math.min(o, this.options.maxDelay);
    }, enumerable: true, configurable: true }), Object.defineProperty(e4.prototype, "numOfDelayedAttempts", { get: function() {
      return this.attempt;
    }, enumerable: true, configurable: true }), e4;
  }();
  Zl.Delay = uF;
});
var pg = be((rr) => {
  "use strict";
  var lF = rr && rr.__extends || /* @__PURE__ */ function() {
    var e4 = function(t, r) {
      return e4 = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(n, o) {
        n.__proto__ = o;
      } || function(n, o) {
        for (var a in o) o.hasOwnProperty(a) && (n[a] = o[a]);
      }, e4(t, r);
    };
    return function(t, r) {
      e4(t, r);
      function n() {
        this.constructor = t;
      }
      t.prototype = r === null ? Object.create(r) : (n.prototype = r.prototype, new n());
    };
  }(), dF = rr && rr.__awaiter || function(e4, t, r, n) {
    function o(a) {
      return a instanceof r ? a : new r(function(i) {
        i(a);
      });
    }
    return new (r || (r = Promise))(function(a, i) {
      function s(d) {
        try {
          c(n.next(d));
        } catch (m) {
          i(m);
        }
      }
      function u(d) {
        try {
          c(n.throw(d));
        } catch (m) {
          i(m);
        }
      }
      function c(d) {
        d.done ? a(d.value) : o(d.value).then(s, u);
      }
      c((n = n.apply(e4, t || [])).next());
    });
  }, pF = rr && rr.__generator || function(e4, t) {
    var r = { label: 0, sent: function() {
      if (a[0] & 1) throw a[1];
      return a[1];
    }, trys: [], ops: [] }, n, o, a, i;
    return i = { next: s(0), throw: s(1), return: s(2) }, typeof Symbol == "function" && (i[Symbol.iterator] = function() {
      return this;
    }), i;
    function s(c) {
      return function(d) {
        return u([c, d]);
      };
    }
    function u(c) {
      if (n) throw new TypeError("Generator is already executing.");
      for (; r; ) try {
        if (n = 1, o && (a = c[0] & 2 ? o.return : c[0] ? o.throw || ((a = o.return) && a.call(o), 0) : o.next) && !(a = a.call(o, c[1])).done) return a;
        switch (o = 0, a && (c = [c[0] & 2, a.value]), c[0]) {
          case 0:
          case 1:
            a = c;
            break;
          case 4:
            return r.label++, { value: c[1], done: false };
          case 5:
            r.label++, o = c[1], c = [0];
            continue;
          case 7:
            c = r.ops.pop(), r.trys.pop();
            continue;
          default:
            if (a = r.trys, !(a = a.length > 0 && a[a.length - 1]) && (c[0] === 6 || c[0] === 2)) {
              r = 0;
              continue;
            }
            if (c[0] === 3 && (!a || c[1] > a[0] && c[1] < a[3])) {
              r.label = c[1];
              break;
            }
            if (c[0] === 6 && r.label < a[1]) {
              r.label = a[1], a = c;
              break;
            }
            if (a && r.label < a[2]) {
              r.label = a[2], r.ops.push(c);
              break;
            }
            a[2] && r.ops.pop(), r.trys.pop();
            continue;
        }
        c = t.call(e4, r);
      } catch (d) {
        c = [6, d], o = 0;
      } finally {
        n = a = 0;
      }
      if (c[0] & 5) throw c[1];
      return { value: c[0] ? c[1] : void 0, done: true };
    }
  };
  Object.defineProperty(rr, "__esModule", { value: true });
  var mF = ed(), gF = function(e4) {
    lF(t, e4);
    function t() {
      return e4 !== null && e4.apply(this, arguments) || this;
    }
    return t.prototype.apply = function() {
      return dF(this, void 0, void 0, function() {
        return pF(this, function(r) {
          return [2, this.isFirstAttempt ? true : e4.prototype.apply.call(this)];
        });
      });
    }, Object.defineProperty(t.prototype, "isFirstAttempt", { get: function() {
      return this.attempt === 0;
    }, enumerable: true, configurable: true }), Object.defineProperty(t.prototype, "numOfDelayedAttempts", { get: function() {
      return this.attempt - 1;
    }, enumerable: true, configurable: true }), t;
  }(mF.Delay);
  rr.SkipFirstDelay = gF;
});
var mg = be((sa) => {
  "use strict";
  var fF = sa && sa.__extends || /* @__PURE__ */ function() {
    var e4 = function(t, r) {
      return e4 = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(n, o) {
        n.__proto__ = o;
      } || function(n, o) {
        for (var a in o) o.hasOwnProperty(a) && (n[a] = o[a]);
      }, e4(t, r);
    };
    return function(t, r) {
      e4(t, r);
      function n() {
        this.constructor = t;
      }
      t.prototype = r === null ? Object.create(r) : (n.prototype = r.prototype, new n());
    };
  }();
  Object.defineProperty(sa, "__esModule", { value: true });
  var hF = ed(), yF = function(e4) {
    fF(t, e4);
    function t() {
      return e4 !== null && e4.apply(this, arguments) || this;
    }
    return t;
  }(hF.Delay);
  sa.AlwaysDelay = yF;
});
var gg = be((td) => {
  "use strict";
  Object.defineProperty(td, "__esModule", { value: true });
  var SF = pg(), CF = mg();
  function AF(e4, t) {
    var r = RF(e4);
    return r.setAttemptNumber(t), r;
  }
  td.DelayFactory = AF;
  function RF(e4) {
    return e4.delayFirstAttempt ? new CF.AlwaysDelay(e4) : new SF.SkipFirstDelay(e4);
  }
});
var fg = be((dn) => {
  "use strict";
  var rd = dn && dn.__awaiter || function(e4, t, r, n) {
    function o(a) {
      return a instanceof r ? a : new r(function(i) {
        i(a);
      });
    }
    return new (r || (r = Promise))(function(a, i) {
      function s(d) {
        try {
          c(n.next(d));
        } catch (m) {
          i(m);
        }
      }
      function u(d) {
        try {
          c(n.throw(d));
        } catch (m) {
          i(m);
        }
      }
      function c(d) {
        d.done ? a(d.value) : o(d.value).then(s, u);
      }
      c((n = n.apply(e4, t || [])).next());
    });
  }, nd = dn && dn.__generator || function(e4, t) {
    var r = { label: 0, sent: function() {
      if (a[0] & 1) throw a[1];
      return a[1];
    }, trys: [], ops: [] }, n, o, a, i;
    return i = { next: s(0), throw: s(1), return: s(2) }, typeof Symbol == "function" && (i[Symbol.iterator] = function() {
      return this;
    }), i;
    function s(c) {
      return function(d) {
        return u([c, d]);
      };
    }
    function u(c) {
      if (n) throw new TypeError("Generator is already executing.");
      for (; r; ) try {
        if (n = 1, o && (a = c[0] & 2 ? o.return : c[0] ? o.throw || ((a = o.return) && a.call(o), 0) : o.next) && !(a = a.call(o, c[1])).done) return a;
        switch (o = 0, a && (c = [c[0] & 2, a.value]), c[0]) {
          case 0:
          case 1:
            a = c;
            break;
          case 4:
            return r.label++, { value: c[1], done: false };
          case 5:
            r.label++, o = c[1], c = [0];
            continue;
          case 7:
            c = r.ops.pop(), r.trys.pop();
            continue;
          default:
            if (a = r.trys, !(a = a.length > 0 && a[a.length - 1]) && (c[0] === 6 || c[0] === 2)) {
              r = 0;
              continue;
            }
            if (c[0] === 3 && (!a || c[1] > a[0] && c[1] < a[3])) {
              r.label = c[1];
              break;
            }
            if (c[0] === 6 && r.label < a[1]) {
              r.label = a[1], a = c;
              break;
            }
            if (a && r.label < a[2]) {
              r.label = a[2], r.ops.push(c);
              break;
            }
            a[2] && r.ops.pop(), r.trys.pop();
            continue;
        }
        c = t.call(e4, r);
      } catch (d) {
        c = [6, d], o = 0;
      } finally {
        n = a = 0;
      }
      if (c[0] & 5) throw c[1];
      return { value: c[0] ? c[1] : void 0, done: true };
    }
  };
  Object.defineProperty(dn, "__esModule", { value: true });
  var xF = cg(), FF = gg();
  function bF(e4, t) {
    return t === void 0 && (t = {}), rd(this, void 0, void 0, function() {
      var r, n;
      return nd(this, function(o) {
        switch (o.label) {
          case 0:
            return r = xF.getSanitizedOptions(t), n = new vF(e4, r), [4, n.execute()];
          case 1:
            return [2, o.sent()];
        }
      });
    });
  }
  dn.backOff = bF;
  var vF = function() {
    function e4(t, r) {
      this.request = t, this.options = r, this.attemptNumber = 0;
    }
    return e4.prototype.execute = function() {
      return rd(this, void 0, void 0, function() {
        var t, r;
        return nd(this, function(n) {
          switch (n.label) {
            case 0:
              if (this.attemptLimitReached) return [3, 7];
              n.label = 1;
            case 1:
              return n.trys.push([1, 4, , 6]), [4, this.applyDelay()];
            case 2:
              return n.sent(), [4, this.request()];
            case 3:
              return [2, n.sent()];
            case 4:
              return t = n.sent(), this.attemptNumber++, [4, this.options.retry(t, this.attemptNumber)];
            case 5:
              if (r = n.sent(), !r || this.attemptLimitReached) throw t;
              return [3, 6];
            case 6:
              return [3, 0];
            case 7:
              throw new Error("Something went wrong.");
          }
        });
      });
    }, Object.defineProperty(e4.prototype, "attemptLimitReached", { get: function() {
      return this.attemptNumber >= this.options.numOfAttempts;
    }, enumerable: true, configurable: true }), e4.prototype.applyDelay = function() {
      return rd(this, void 0, void 0, function() {
        var t;
        return nd(this, function(r) {
          switch (r.label) {
            case 0:
              return t = FF.DelayFactory(this.options, this.attemptNumber), [4, t.apply()];
            case 1:
              return r.sent(), [2];
          }
        });
      });
    }, e4;
  }();
});
var ys = be((tp, rp) => {
  "use strict";
  (function(e4, t) {
    typeof tp == "object" && typeof rp < "u" ? rp.exports = t() : typeof define == "function" && define.amd ? define(t) : (e4 = typeof globalThis < "u" ? globalThis : e4 || self).dayjs = t();
  })(tp, function() {
    "use strict";
    var e4 = 1e3, t = 6e4, r = 36e5, n = "millisecond", o = "second", a = "minute", i = "hour", s = "day", u = "week", c = "month", d = "quarter", m = "year", p = "date", l = "Invalid Date", g = /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/, A = /\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g, y = { name: "en", weekdays: "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"), months: "January_February_March_April_May_June_July_August_September_October_November_December".split("_"), ordinal: function(k) {
      var q = ["th", "st", "nd", "rd"], O = k % 100;
      return "[" + k + (q[(O - 20) % 10] || q[O] || q[0]) + "]";
    } }, R = function(k, q, O) {
      var Q = String(k);
      return !Q || Q.length >= q ? k : "" + Array(q + 1 - Q.length).join(O) + k;
    }, f = { s: R, z: function(k) {
      var q = -k.utcOffset(), O = Math.abs(q), Q = Math.floor(O / 60), D = O % 60;
      return (q <= 0 ? "+" : "-") + R(Q, 2, "0") + ":" + R(D, 2, "0");
    }, m: function k(q, O) {
      if (q.date() < O.date()) return -k(O, q);
      var Q = 12 * (O.year() - q.year()) + (O.month() - q.month()), D = q.clone().add(Q, c), j = O - D < 0, U = q.clone().add(Q + (j ? -1 : 1), c);
      return +(-(Q + (O - D) / (j ? D - U : U - D)) || 0);
    }, a: function(k) {
      return k < 0 ? Math.ceil(k) || 0 : Math.floor(k);
    }, p: function(k) {
      return { M: c, y: m, w: u, d: s, D: p, h: i, m: a, s: o, ms: n, Q: d }[k] || String(k || "").toLowerCase().replace(/s$/, "");
    }, u: function(k) {
      return k === void 0;
    } }, h = "en", C = {};
    C[h] = y;
    var b = "$isDayjsObject", w = function(k) {
      return k instanceof M || !(!k || !k[b]);
    }, v = function k(q, O, Q) {
      var D;
      if (!q) return h;
      if (typeof q == "string") {
        var j = q.toLowerCase();
        C[j] && (D = j), O && (C[j] = O, D = j);
        var U = q.split("-");
        if (!D && U.length > 1) return k(U[0]);
      } else {
        var J = q.name;
        C[J] = q, D = J;
      }
      return !Q && D && (h = D), D || !Q && h;
    }, P = function(k, q) {
      if (w(k)) return k.clone();
      var O = typeof q == "object" ? q : {};
      return O.date = k, O.args = arguments, new M(O);
    }, T = f;
    T.l = v, T.i = w, T.w = function(k, q) {
      return P(k, { locale: q.$L, utc: q.$u, x: q.$x, $offset: q.$offset });
    };
    var M = function() {
      function k(O) {
        this.$L = v(O.locale, null, true), this.parse(O), this.$x = this.$x || O.x || {}, this[b] = true;
      }
      var q = k.prototype;
      return q.parse = function(O) {
        this.$d = function(Q) {
          var D = Q.date, j = Q.utc;
          if (D === null) return /* @__PURE__ */ new Date(NaN);
          if (T.u(D)) return /* @__PURE__ */ new Date();
          if (D instanceof Date) return new Date(D);
          if (typeof D == "string" && !/Z$/i.test(D)) {
            var U = D.match(g);
            if (U) {
              var J = U[2] - 1 || 0, te = (U[7] || "0").substring(0, 3);
              return j ? new Date(Date.UTC(U[1], J, U[3] || 1, U[4] || 0, U[5] || 0, U[6] || 0, te)) : new Date(U[1], J, U[3] || 1, U[4] || 0, U[5] || 0, U[6] || 0, te);
            }
          }
          return new Date(D);
        }(O), this.init();
      }, q.init = function() {
        var O = this.$d;
        this.$y = O.getFullYear(), this.$M = O.getMonth(), this.$D = O.getDate(), this.$W = O.getDay(), this.$H = O.getHours(), this.$m = O.getMinutes(), this.$s = O.getSeconds(), this.$ms = O.getMilliseconds();
      }, q.$utils = function() {
        return T;
      }, q.isValid = function() {
        return this.$d.toString() !== l;
      }, q.isSame = function(O, Q) {
        var D = P(O);
        return this.startOf(Q) <= D && D <= this.endOf(Q);
      }, q.isAfter = function(O, Q) {
        return P(O) < this.startOf(Q);
      }, q.isBefore = function(O, Q) {
        return this.endOf(Q) < P(O);
      }, q.$g = function(O, Q, D) {
        return T.u(O) ? this[Q] : this.set(D, O);
      }, q.unix = function() {
        return Math.floor(this.valueOf() / 1e3);
      }, q.valueOf = function() {
        return this.$d.getTime();
      }, q.startOf = function(O, Q) {
        var D = this, j = !!T.u(Q) || Q, U = T.p(O), J = function(pt, Re) {
          var Ye = T.w(D.$u ? Date.UTC(D.$y, Re, pt) : new Date(D.$y, Re, pt), D);
          return j ? Ye : Ye.endOf(s);
        }, te = function(pt, Re) {
          return T.w(D.toDate()[pt].apply(D.toDate("s"), (j ? [0, 0, 0, 0] : [23, 59, 59, 999]).slice(Re)), D);
        }, ue = this.$W, Z = this.$M, re = this.$D, hr = "set" + (this.$u ? "UTC" : "");
        switch (U) {
          case m:
            return j ? J(1, 0) : J(31, 11);
          case c:
            return j ? J(1, Z) : J(0, Z + 1);
          case u:
            var Ft = this.$locale().weekStart || 0, er = (ue < Ft ? ue + 7 : ue) - Ft;
            return J(j ? re - er : re + (6 - er), Z);
          case s:
          case p:
            return te(hr + "Hours", 0);
          case i:
            return te(hr + "Minutes", 1);
          case a:
            return te(hr + "Seconds", 2);
          case o:
            return te(hr + "Milliseconds", 3);
          default:
            return this.clone();
        }
      }, q.endOf = function(O) {
        return this.startOf(O, false);
      }, q.$set = function(O, Q) {
        var D, j = T.p(O), U = "set" + (this.$u ? "UTC" : ""), J = (D = {}, D[s] = U + "Date", D[p] = U + "Date", D[c] = U + "Month", D[m] = U + "FullYear", D[i] = U + "Hours", D[a] = U + "Minutes", D[o] = U + "Seconds", D[n] = U + "Milliseconds", D)[j], te = j === s ? this.$D + (Q - this.$W) : Q;
        if (j === c || j === m) {
          var ue = this.clone().set(p, 1);
          ue.$d[J](te), ue.init(), this.$d = ue.set(p, Math.min(this.$D, ue.daysInMonth())).$d;
        } else J && this.$d[J](te);
        return this.init(), this;
      }, q.set = function(O, Q) {
        return this.clone().$set(O, Q);
      }, q.get = function(O) {
        return this[T.p(O)]();
      }, q.add = function(O, Q) {
        var D, j = this;
        O = Number(O);
        var U = T.p(Q), J = function(Z) {
          var re = P(j);
          return T.w(re.date(re.date() + Math.round(Z * O)), j);
        };
        if (U === c) return this.set(c, this.$M + O);
        if (U === m) return this.set(m, this.$y + O);
        if (U === s) return J(1);
        if (U === u) return J(7);
        var te = (D = {}, D[a] = t, D[i] = r, D[o] = e4, D)[U] || 1, ue = this.$d.getTime() + O * te;
        return T.w(ue, this);
      }, q.subtract = function(O, Q) {
        return this.add(-1 * O, Q);
      }, q.format = function(O) {
        var Q = this, D = this.$locale();
        if (!this.isValid()) return D.invalidDate || l;
        var j = O || "YYYY-MM-DDTHH:mm:ssZ", U = T.z(this), J = this.$H, te = this.$m, ue = this.$M, Z = D.weekdays, re = D.months, hr = D.meridiem, Ft = function(Re, Ye, tr, yr) {
          return Re && (Re[Ye] || Re(Q, j)) || tr[Ye].slice(0, yr);
        }, er = function(Re) {
          return T.s(J % 12 || 12, Re, "0");
        }, pt = hr || function(Re, Ye, tr) {
          var yr = Re < 12 ? "AM" : "PM";
          return tr ? yr.toLowerCase() : yr;
        };
        return j.replace(A, function(Re, Ye) {
          return Ye || function(tr) {
            switch (tr) {
              case "YY":
                return String(Q.$y).slice(-2);
              case "YYYY":
                return T.s(Q.$y, 4, "0");
              case "M":
                return ue + 1;
              case "MM":
                return T.s(ue + 1, 2, "0");
              case "MMM":
                return Ft(D.monthsShort, ue, re, 3);
              case "MMMM":
                return Ft(re, ue);
              case "D":
                return Q.$D;
              case "DD":
                return T.s(Q.$D, 2, "0");
              case "d":
                return String(Q.$W);
              case "dd":
                return Ft(D.weekdaysMin, Q.$W, Z, 2);
              case "ddd":
                return Ft(D.weekdaysShort, Q.$W, Z, 3);
              case "dddd":
                return Z[Q.$W];
              case "H":
                return String(J);
              case "HH":
                return T.s(J, 2, "0");
              case "h":
                return er(1);
              case "hh":
                return er(2);
              case "a":
                return pt(J, te, true);
              case "A":
                return pt(J, te, false);
              case "m":
                return String(te);
              case "mm":
                return T.s(te, 2, "0");
              case "s":
                return String(Q.$s);
              case "ss":
                return T.s(Q.$s, 2, "0");
              case "SSS":
                return T.s(Q.$ms, 3, "0");
              case "Z":
                return U;
            }
            return null;
          }(Re) || U.replace(":", "");
        });
      }, q.utcOffset = function() {
        return 15 * -Math.round(this.$d.getTimezoneOffset() / 15);
      }, q.diff = function(O, Q, D) {
        var j, U = this, J = T.p(Q), te = P(O), ue = (te.utcOffset() - this.utcOffset()) * t, Z = this - te, re = function() {
          return T.m(U, te);
        };
        switch (J) {
          case m:
            j = re() / 12;
            break;
          case c:
            j = re();
            break;
          case d:
            j = re() / 3;
            break;
          case u:
            j = (Z - ue) / 6048e5;
            break;
          case s:
            j = (Z - ue) / 864e5;
            break;
          case i:
            j = Z / r;
            break;
          case a:
            j = Z / t;
            break;
          case o:
            j = Z / e4;
            break;
          default:
            j = Z;
        }
        return D ? j : T.a(j);
      }, q.daysInMonth = function() {
        return this.endOf(c).$D;
      }, q.$locale = function() {
        return C[this.$L];
      }, q.locale = function(O, Q) {
        if (!O) return this.$L;
        var D = this.clone(), j = v(O, Q, true);
        return j && (D.$L = j), D;
      }, q.clone = function() {
        return T.w(this.$d, this);
      }, q.toDate = function() {
        return new Date(this.valueOf());
      }, q.toJSON = function() {
        return this.isValid() ? this.toISOString() : null;
      }, q.toISOString = function() {
        return this.$d.toISOString();
      }, q.toString = function() {
        return this.$d.toUTCString();
      }, k;
    }(), z = M.prototype;
    return P.prototype = z, [["$ms", n], ["$s", o], ["$m", a], ["$H", i], ["$W", s], ["$M", c], ["$y", m], ["$D", p]].forEach(function(k) {
      z[k[1]] = function(q) {
        return this.$g(q, k[0], k[1]);
      };
    }), P.extend = function(k, q) {
      return k.$i || (k(q, M, P), k.$i = true), P;
    }, P.locale = v, P.isDayjs = w, P.unix = function(k) {
      return P(1e3 * k);
    }, P.en = C[h], P.Ls = C, P.p = {}, P;
  });
});
var Ah = be((np, op) => {
  "use strict";
  (function(e4, t) {
    typeof np == "object" && typeof op < "u" ? op.exports = t() : typeof define == "function" && define.amd ? define(t) : (e4 = typeof globalThis < "u" ? globalThis : e4 || self).dayjs_plugin_quarterOfYear = t();
  })(np, function() {
    "use strict";
    var e4 = "month", t = "quarter";
    return function(r, n) {
      var o = n.prototype;
      o.quarter = function(s) {
        return this.$utils().u(s) ? Math.ceil((this.month() + 1) / 3) : this.month(this.month() % 3 + 3 * (s - 1));
      };
      var a = o.add;
      o.add = function(s, u) {
        return s = Number(s), this.$utils().p(u) === t ? this.add(3 * s, e4) : a.bind(this)(s, u);
      };
      var i = o.startOf;
      o.startOf = function(s, u) {
        var c = this.$utils(), d = !!c.u(u) || u;
        if (c.p(s) === t) {
          var m = this.quarter() - 1;
          return d ? this.month(3 * m).startOf(e4).startOf("day") : this.month(3 * m + 2).endOf(e4).endOf("day");
        }
        return i.bind(this)(s, u);
      };
    };
  });
});
var Rh = be((ap, ip) => {
  "use strict";
  (function(e4, t) {
    typeof ap == "object" && typeof ip < "u" ? ip.exports = t() : typeof define == "function" && define.amd ? define(t) : (e4 = typeof globalThis < "u" ? globalThis : e4 || self).dayjs_plugin_customParseFormat = t();
  })(ap, function() {
    "use strict";
    var e4 = { LTS: "h:mm:ss A", LT: "h:mm A", L: "MM/DD/YYYY", LL: "MMMM D, YYYY", LLL: "MMMM D, YYYY h:mm A", LLLL: "dddd, MMMM D, YYYY h:mm A" }, t = /(\[[^[]*\])|([-_:/.,()\s]+)|(A|a|YYYY|YY?|MM?M?M?|Do|DD?|hh?|HH?|mm?|ss?|S{1,3}|z|ZZ?)/g, r = /\d\d/, n = /\d\d?/, o = /\d*[^-_:/,()\s\d]+/, a = {}, i = function(l) {
      return (l = +l) + (l > 68 ? 1900 : 2e3);
    }, s = function(l) {
      return function(g) {
        this[l] = +g;
      };
    }, u = [/[+-]\d\d:?(\d\d)?|Z/, function(l) {
      (this.zone || (this.zone = {})).offset = function(g) {
        if (!g || g === "Z") return 0;
        var A = g.match(/([+-]|\d\d)/g), y = 60 * A[1] + (+A[2] || 0);
        return y === 0 ? 0 : A[0] === "+" ? -y : y;
      }(l);
    }], c = function(l) {
      var g = a[l];
      return g && (g.indexOf ? g : g.s.concat(g.f));
    }, d = function(l, g) {
      var A, y = a.meridiem;
      if (y) {
        for (var R = 1; R <= 24; R += 1) if (l.indexOf(y(R, 0, g)) > -1) {
          A = R > 12;
          break;
        }
      } else A = l === (g ? "pm" : "PM");
      return A;
    }, m = { A: [o, function(l) {
      this.afternoon = d(l, false);
    }], a: [o, function(l) {
      this.afternoon = d(l, true);
    }], S: [/\d/, function(l) {
      this.milliseconds = 100 * +l;
    }], SS: [r, function(l) {
      this.milliseconds = 10 * +l;
    }], SSS: [/\d{3}/, function(l) {
      this.milliseconds = +l;
    }], s: [n, s("seconds")], ss: [n, s("seconds")], m: [n, s("minutes")], mm: [n, s("minutes")], H: [n, s("hours")], h: [n, s("hours")], HH: [n, s("hours")], hh: [n, s("hours")], D: [n, s("day")], DD: [r, s("day")], Do: [o, function(l) {
      var g = a.ordinal, A = l.match(/\d+/);
      if (this.day = A[0], g) for (var y = 1; y <= 31; y += 1) g(y).replace(/\[|\]/g, "") === l && (this.day = y);
    }], M: [n, s("month")], MM: [r, s("month")], MMM: [o, function(l) {
      var g = c("months"), A = (c("monthsShort") || g.map(function(y) {
        return y.slice(0, 3);
      })).indexOf(l) + 1;
      if (A < 1) throw new Error();
      this.month = A % 12 || A;
    }], MMMM: [o, function(l) {
      var g = c("months").indexOf(l) + 1;
      if (g < 1) throw new Error();
      this.month = g % 12 || g;
    }], Y: [/[+-]?\d+/, s("year")], YY: [r, function(l) {
      this.year = i(l);
    }], YYYY: [/\d{4}/, s("year")], Z: u, ZZ: u };
    function p(l) {
      var g, A;
      g = l, A = a && a.formats;
      for (var y = (l = g.replace(/(\[[^\]]+])|(LTS?|l{1,4}|L{1,4})/g, function(v, P, T) {
        var M = T && T.toUpperCase();
        return P || A[T] || e4[T] || A[M].replace(/(\[[^\]]+])|(MMMM|MM|DD|dddd)/g, function(z, k, q) {
          return k || q.slice(1);
        });
      })).match(t), R = y.length, f = 0; f < R; f += 1) {
        var h = y[f], C = m[h], b = C && C[0], w = C && C[1];
        y[f] = w ? { regex: b, parser: w } : h.replace(/^\[|\]$/g, "");
      }
      return function(v) {
        for (var P = {}, T = 0, M = 0; T < R; T += 1) {
          var z = y[T];
          if (typeof z == "string") M += z.length;
          else {
            var k = z.regex, q = z.parser, O = v.slice(M), Q = k.exec(O)[0];
            q.call(P, Q), v = v.replace(Q, "");
          }
        }
        return function(D) {
          var j = D.afternoon;
          if (j !== void 0) {
            var U = D.hours;
            j ? U < 12 && (D.hours += 12) : U === 12 && (D.hours = 0), delete D.afternoon;
          }
        }(P), P;
      };
    }
    return function(l, g, A) {
      A.p.customParseFormat = true, l && l.parseTwoDigitYear && (i = l.parseTwoDigitYear);
      var y = g.prototype, R = y.parse;
      y.parse = function(f) {
        var h = f.date, C = f.utc, b = f.args;
        this.$u = C;
        var w = b[1];
        if (typeof w == "string") {
          var v = b[2] === true, P = b[3] === true, T = v || P, M = b[2];
          P && (M = b[2]), a = this.$locale(), !v && M && (a = A.Ls[M]), this.$d = function(O, Q, D) {
            try {
              if (["x", "X"].indexOf(Q) > -1) return new Date((Q === "X" ? 1e3 : 1) * O);
              var j = p(Q)(O), U = j.year, J = j.month, te = j.day, ue = j.hours, Z = j.minutes, re = j.seconds, hr = j.milliseconds, Ft = j.zone, er = /* @__PURE__ */ new Date(), pt = te || (U || J ? 1 : er.getDate()), Re = U || er.getFullYear(), Ye = 0;
              U && !J || (Ye = J > 0 ? J - 1 : er.getMonth());
              var tr = ue || 0, yr = Z || 0, jl = re || 0, $l = hr || 0;
              return Ft ? new Date(Date.UTC(Re, Ye, pt, tr, yr, jl, $l + 60 * Ft.offset * 1e3)) : D ? new Date(Date.UTC(Re, Ye, pt, tr, yr, jl, $l)) : new Date(Re, Ye, pt, tr, yr, jl, $l);
            } catch {
              return /* @__PURE__ */ new Date("");
            }
          }(h, w, C), this.init(), M && M !== true && (this.$L = this.locale(M).$L), T && h != this.format(w) && (this.$d = /* @__PURE__ */ new Date("")), a = {};
        } else if (w instanceof Array) for (var z = w.length, k = 1; k <= z; k += 1) {
          b[1] = w[k - 1];
          var q = A.apply(this, b);
          if (q.isValid()) {
            this.$d = q.$d, this.$L = q.$L, this.init();
            break;
          }
          k === z && (this.$d = /* @__PURE__ */ new Date(""));
        }
        else R.call(this, f);
      };
    };
  });
});
var tS = be((EG, eS) => {
  "use strict";
  var YP = /(^|; )Coveo-Pendragon=([^;]*)/;
  eS.exports = () => YP.exec(document.cookie)?.pop() || null;
});
var oS = be((Qp, Lp) => {
  "use strict";
  (function(e4, t) {
    typeof Qp == "object" && typeof Lp < "u" ? Lp.exports = t() : typeof define == "function" && define.amd ? define(t) : (e4 = typeof globalThis < "u" ? globalThis : e4 || self).dayjs_plugin_timezone = t();
  })(Qp, function() {
    "use strict";
    var e4 = { year: 0, month: 1, day: 2, hour: 3, minute: 4, second: 5 }, t = {};
    return function(r, n, o) {
      var a, i = function(d, m, p) {
        p === void 0 && (p = {});
        var l = new Date(d), g = function(A, y) {
          y === void 0 && (y = {});
          var R = y.timeZoneName || "short", f = A + "|" + R, h = t[f];
          return h || (h = new Intl.DateTimeFormat("en-US", { hour12: false, timeZone: A, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: R }), t[f] = h), h;
        }(m, p);
        return g.formatToParts(l);
      }, s = function(d, m) {
        for (var p = i(d, m), l = [], g = 0; g < p.length; g += 1) {
          var A = p[g], y = A.type, R = A.value, f = e4[y];
          f >= 0 && (l[f] = parseInt(R, 10));
        }
        var h = l[3], C = h === 24 ? 0 : h, b = l[0] + "-" + l[1] + "-" + l[2] + " " + C + ":" + l[4] + ":" + l[5] + ":000", w = +d;
        return (o.utc(b).valueOf() - (w -= w % 1e3)) / 6e4;
      }, u = n.prototype;
      u.tz = function(d, m) {
        d === void 0 && (d = a);
        var p, l = this.utcOffset(), g = this.toDate(), A = g.toLocaleString("en-US", { timeZone: d }), y = Math.round((g - new Date(A)) / 1e3 / 60), R = 15 * -Math.round(g.getTimezoneOffset() / 15) - y;
        if (!Number(R)) p = this.utcOffset(0, m);
        else if (p = o(A, { locale: this.$L }).$set("millisecond", this.$ms).utcOffset(R, true), m) {
          var f = p.utcOffset();
          p = p.add(l - f, "minute");
        }
        return p.$x.$timezone = d, p;
      }, u.offsetName = function(d) {
        var m = this.$x.$timezone || o.tz.guess(), p = i(this.valueOf(), m, { timeZoneName: d }).find(function(l) {
          return l.type.toLowerCase() === "timezonename";
        });
        return p && p.value;
      };
      var c = u.startOf;
      u.startOf = function(d, m) {
        if (!this.$x || !this.$x.$timezone) return c.call(this, d, m);
        var p = o(this.format("YYYY-MM-DD HH:mm:ss:SSS"), { locale: this.$L });
        return c.call(p, d, m).tz(this.$x.$timezone, true);
      }, o.tz = function(d, m, p) {
        var l = p && m, g = p || m || a, A = s(+o(), g);
        if (typeof d != "string") return o(d).tz(g);
        var y = function(C, b, w) {
          var v = C - 60 * b * 1e3, P = s(v, w);
          if (b === P) return [v, b];
          var T = s(v -= 60 * (P - b) * 1e3, w);
          return P === T ? [v, P] : [C - 60 * Math.min(P, T) * 1e3, Math.max(P, T)];
        }(o.utc(d, l).valueOf(), A, g), R = y[0], f = y[1], h = o(R).utcOffset(f);
        return h.$x.$timezone = g, h;
      }, o.tz.guess = function() {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
      }, o.tz.setDefault = function(d) {
        a = d;
      };
    };
  });
});
var aS = be((Bp, Up) => {
  "use strict";
  (function(e4, t) {
    typeof Bp == "object" && typeof Up < "u" ? Up.exports = t() : typeof define == "function" && define.amd ? define(t) : (e4 = typeof globalThis < "u" ? globalThis : e4 || self).dayjs_plugin_utc = t();
  })(Bp, function() {
    "use strict";
    var e4 = "minute", t = /[+-]\d\d(?::?\d\d)?/g, r = /([+-]|\d\d)/g;
    return function(n, o, a) {
      var i = o.prototype;
      a.utc = function(l) {
        var g = { date: l, utc: true, args: arguments };
        return new o(g);
      }, i.utc = function(l) {
        var g = a(this.toDate(), { locale: this.$L, utc: true });
        return l ? g.add(this.utcOffset(), e4) : g;
      }, i.local = function() {
        return a(this.toDate(), { locale: this.$L, utc: false });
      };
      var s = i.parse;
      i.parse = function(l) {
        l.utc && (this.$u = true), this.$utils().u(l.$offset) || (this.$offset = l.$offset), s.call(this, l);
      };
      var u = i.init;
      i.init = function() {
        if (this.$u) {
          var l = this.$d;
          this.$y = l.getUTCFullYear(), this.$M = l.getUTCMonth(), this.$D = l.getUTCDate(), this.$W = l.getUTCDay(), this.$H = l.getUTCHours(), this.$m = l.getUTCMinutes(), this.$s = l.getUTCSeconds(), this.$ms = l.getUTCMilliseconds();
        } else u.call(this);
      };
      var c = i.utcOffset;
      i.utcOffset = function(l, g) {
        var A = this.$utils().u;
        if (A(l)) return this.$u ? 0 : A(this.$offset) ? c.call(this) : this.$offset;
        if (typeof l == "string" && (l = function(h) {
          h === void 0 && (h = "");
          var C = h.match(t);
          if (!C) return null;
          var b = ("" + C[0]).match(r) || ["-", 0, 0], w = b[0], v = 60 * +b[1] + +b[2];
          return v === 0 ? 0 : w === "+" ? v : -v;
        }(l), l === null)) return this;
        var y = Math.abs(l) <= 16 ? 60 * l : l, R = this;
        if (g) return R.$offset = y, R.$u = l === 0, R;
        if (l !== 0) {
          var f = this.$u ? this.toDate().getTimezoneOffset() : -1 * this.utcOffset();
          (R = this.local().add(y + f, e4)).$offset = y, R.$x.$localOffset = f;
        } else R = this.utc();
        return R;
      };
      var d = i.format;
      i.format = function(l) {
        var g = l || (this.$u ? "YYYY-MM-DDTHH:mm:ss[Z]" : "");
        return d.call(this, g);
      }, i.valueOf = function() {
        var l = this.$utils().u(this.$offset) ? 0 : this.$offset + (this.$x.$localOffset || this.$d.getTimezoneOffset());
        return this.$d.valueOf() - 6e4 * l;
      }, i.isUTC = function() {
        return !!this.$u;
      }, i.toISOString = function() {
        return this.toDate().toISOString();
      }, i.toString = function() {
        return this.toDate().toUTCString();
      };
      var m = i.toDate;
      i.toDate = function(l) {
        return l === "s" && this.$offset ? a(this.format("YYYY-MM-DD HH:mm:ss:SSS")).toDate() : m.call(this);
      };
      var p = i.diff;
      i.diff = function(l, g, A) {
        if (l && this.$u === l.$u) return p.call(this, l, g, A);
        var y = this.local(), R = a(l).local();
        return p.call(y, R, g, A);
      };
    };
  });
});
var yS = be(($z, hS) => {
  "use strict";
  function sE(e4) {
    try {
      return JSON.stringify(e4);
    } catch {
      return '"[Circular]"';
    }
  }
  hS.exports = cE;
  function cE(e4, t, r) {
    var n = r && r.stringify || sE, o = 1;
    if (typeof e4 == "object" && e4 !== null) {
      var a = t.length + o;
      if (a === 1) return e4;
      var i = new Array(a);
      i[0] = n(e4);
      for (var s = 1; s < a; s++) i[s] = n(t[s]);
      return i.join(" ");
    }
    if (typeof e4 != "string") return e4;
    var u = t.length;
    if (u === 0) return e4;
    for (var c = "", d = 1 - o, m = -1, p = e4 && e4.length || 0, l = 0; l < p; ) {
      if (e4.charCodeAt(l) === 37 && l + 1 < p) {
        switch (m = m > -1 ? m : 0, e4.charCodeAt(l + 1)) {
          case 100:
          case 102:
            if (d >= u || t[d] == null) break;
            m < l && (c += e4.slice(m, l)), c += Number(t[d]), m = l + 2, l++;
            break;
          case 105:
            if (d >= u || t[d] == null) break;
            m < l && (c += e4.slice(m, l)), c += Math.floor(Number(t[d])), m = l + 2, l++;
            break;
          case 79:
          case 111:
          case 106:
            if (d >= u || t[d] === void 0) break;
            m < l && (c += e4.slice(m, l));
            var g = typeof t[d];
            if (g === "string") {
              c += "'" + t[d] + "'", m = l + 2, l++;
              break;
            }
            if (g === "function") {
              c += t[d].name || "<anonymous>", m = l + 2, l++;
              break;
            }
            c += n(t[d]), m = l + 2, l++;
            break;
          case 115:
            if (d >= u) break;
            m < l && (c += e4.slice(m, l)), c += String(t[d]), m = l + 2, l++;
            break;
          case 37:
            m < l && (c += e4.slice(m, l)), c += "%", m = l + 2, l++, d--;
            break;
        }
        ++d;
      }
      ++l;
    }
    return m === -1 ? e4 : (m < p && (c += e4.slice(m)), c);
  }
});
var FS = be((Gz, Ac) => {
  "use strict";
  var SS = yS();
  Ac.exports = cr;
  var Ba = FE().console || {}, uE = { mapHttpRequest: yc, mapHttpResponse: yc, wrapRequestSerializer: Gp, wrapResponseSerializer: Gp, wrapErrorSerializer: Gp, req: yc, res: yc, err: AS, errWithCause: AS };
  function Sc(e4, t) {
    return e4 === "silent" ? 1 / 0 : t.levels.values[e4];
  }
  var Wp = Symbol("pino.logFuncs"), zp = Symbol("pino.hierarchy"), lE = { error: "log", fatal: "error", warn: "error", info: "log", debug: "log", trace: "log" };
  function CS(e4, t) {
    let r = { logger: t, parent: e4[zp] };
    t[zp] = r;
  }
  function dE(e4, t, r) {
    let n = {};
    t.forEach((o) => {
      n[o] = r[o] ? r[o] : Ba[o] || Ba[lE[o] || "log"] || Ua;
    }), e4[Wp] = n;
  }
  function pE(e4, t) {
    return Array.isArray(e4) ? e4.filter(function(n) {
      return n !== "!stdSerializers.err";
    }) : e4 === true ? Object.keys(t) : false;
  }
  function cr(e4) {
    e4 = e4 || {}, e4.browser = e4.browser || {};
    let t = e4.browser.transmit;
    if (t && typeof t.send != "function") throw Error("pino: transmit option must have a send function");
    let r = e4.browser.write || Ba;
    e4.browser.write && (e4.browser.asObject = true);
    let n = e4.serializers || {}, o = pE(e4.browser.serialize, n), a = e4.browser.serialize;
    Array.isArray(e4.browser.serialize) && e4.browser.serialize.indexOf("!stdSerializers.err") > -1 && (a = false);
    let i = Object.keys(e4.customLevels || {}), s = ["error", "fatal", "warn", "info", "debug", "trace"].concat(i);
    typeof r == "function" && s.forEach(function(A) {
      r[A] = r;
    }), (e4.enabled === false || e4.browser.disabled) && (e4.level = "silent");
    let u = e4.level || "info", c = Object.create(r);
    c.log || (c.log = Ua), dE(c, s, r), CS({}, c), Object.defineProperty(c, "levelVal", { get: m }), Object.defineProperty(c, "level", { get: p, set: l });
    let d = { transmit: t, serialize: o, asObject: e4.browser.asObject, formatters: e4.browser.formatters, levels: s, timestamp: AE(e4) };
    c.levels = mE(e4), c.level = u, c.setMaxListeners = c.getMaxListeners = c.emit = c.addListener = c.on = c.prependListener = c.once = c.prependOnceListener = c.removeListener = c.removeAllListeners = c.listeners = c.listenerCount = c.eventNames = c.write = c.flush = Ua, c.serializers = n, c._serialize = o, c._stdErrSerialize = a, c.child = g, t && (c._logEvent = Hp());
    function m() {
      return Sc(this.level, this);
    }
    function p() {
      return this._level;
    }
    function l(A) {
      if (A !== "silent" && !this.levels.values[A]) throw Error("unknown level " + A);
      this._level = A, In(this, d, c, "error"), In(this, d, c, "fatal"), In(this, d, c, "warn"), In(this, d, c, "info"), In(this, d, c, "debug"), In(this, d, c, "trace"), i.forEach((y) => {
        In(this, d, c, y);
      });
    }
    function g(A, y) {
      if (!A) throw new Error("missing bindings for child Pino");
      y = y || {}, o && A.serializers && (y.serializers = A.serializers);
      let R = y.serializers;
      if (o && R) {
        var f = Object.assign({}, n, R), h = e4.browser.serialize === true ? Object.keys(f) : o;
        delete A.serializers, Cc([A], h, f, this._stdErrSerialize);
      }
      function C(w) {
        this._childLevel = (w._childLevel | 0) + 1, this.bindings = A, f && (this.serializers = f, this._serialize = h), t && (this._logEvent = Hp([].concat(w._logEvent.bindings, A)));
      }
      C.prototype = this;
      let b = new C(this);
      return CS(this, b), b.level = this.level, b;
    }
    return c;
  }
  function mE(e4) {
    let t = e4.customLevels || {}, r = Object.assign({}, cr.levels.values, t), n = Object.assign({}, cr.levels.labels, gE(t));
    return { values: r, labels: n };
  }
  function gE(e4) {
    let t = {};
    return Object.keys(e4).forEach(function(r) {
      t[e4[r]] = r;
    }), t;
  }
  cr.levels = { values: { fatal: 60, error: 50, warn: 40, info: 30, debug: 20, trace: 10 }, labels: { 10: "trace", 20: "debug", 30: "info", 40: "warn", 50: "error", 60: "fatal" } };
  cr.stdSerializers = uE;
  cr.stdTimeFunctions = Object.assign({}, { nullTime: RS, epochTime: xS, unixTime: RE, isoTime: xE });
  function fE(e4) {
    let t = [];
    e4.bindings && t.push(e4.bindings);
    let r = e4[zp];
    for (; r.parent; ) r = r.parent, r.logger.bindings && t.push(r.logger.bindings);
    return t.reverse();
  }
  function In(e4, t, r, n) {
    if (Object.defineProperty(e4, n, { value: Sc(e4.level, r) > Sc(n, r) ? Ua : r[Wp][n], writable: true, enumerable: true, configurable: true }), !t.transmit && e4[n] === Ua) return;
    e4[n] = yE(e4, t, r, n);
    let o = fE(e4);
    o.length !== 0 && (e4[n] = hE(o, e4[n]));
  }
  function hE(e4, t) {
    return function() {
      return t.apply(this, [...e4, ...arguments]);
    };
  }
  function yE(e4, t, r, n) {
    return /* @__PURE__ */ function(o) {
      return function() {
        let i = t.timestamp(), s = new Array(arguments.length), u = Object.getPrototypeOf && Object.getPrototypeOf(this) === Ba ? Ba : this;
        for (var c = 0; c < s.length; c++) s[c] = arguments[c];
        if (t.serialize && !t.asObject && Cc(s, this._serialize, this.serializers, this._stdErrSerialize), t.asObject || t.formatters ? o.call(u, SE(this, n, s, i, t.formatters)) : o.apply(u, s), t.transmit) {
          let d = t.transmit.level || e4._level, m = r.levels.values[d], p = r.levels.values[n];
          if (p < m) return;
          CE(this, { ts: i, methodLevel: n, methodValue: p, transmitLevel: d, transmitValue: r.levels.values[t.transmit.level || e4._level], send: t.transmit.send, val: Sc(e4._level, r) }, s);
        }
      };
    }(e4[Wp][n]);
  }
  function SE(e4, t, r, n, o = {}) {
    let { level: a = () => e4.levels.values[t], log: i = (p) => p } = o;
    e4._serialize && Cc(r, e4._serialize, e4.serializers, e4._stdErrSerialize);
    let s = r.slice(), u = s[0], c = {};
    n && (c.time = n), c.level = a(t, e4.levels.values[t]);
    let d = (e4._childLevel | 0) + 1;
    if (d < 1 && (d = 1), u !== null && typeof u == "object") {
      for (; d-- && typeof s[0] == "object"; ) Object.assign(c, s.shift());
      u = s.length ? SS(s.shift(), s) : void 0;
    } else typeof u == "string" && (u = SS(s.shift(), s));
    return u !== void 0 && (c.msg = u), i(c);
  }
  function Cc(e4, t, r, n) {
    for (let o in e4) if (n && e4[o] instanceof Error) e4[o] = cr.stdSerializers.err(e4[o]);
    else if (typeof e4[o] == "object" && !Array.isArray(e4[o])) for (let a in e4[o]) t && t.indexOf(a) > -1 && a in r && (e4[o][a] = r[a](e4[o][a]));
  }
  function CE(e4, t, r) {
    let n = t.send, o = t.ts, a = t.methodLevel, i = t.methodValue, s = t.val, u = e4._logEvent.bindings;
    Cc(r, e4._serialize || Object.keys(e4.serializers), e4.serializers, e4._stdErrSerialize === void 0 ? true : e4._stdErrSerialize), e4._logEvent.ts = o, e4._logEvent.messages = r.filter(function(c) {
      return u.indexOf(c) === -1;
    }), e4._logEvent.level.label = a, e4._logEvent.level.value = i, n(a, e4._logEvent, s), e4._logEvent = Hp(u);
  }
  function Hp(e4) {
    return { ts: 0, messages: [], bindings: e4 || [], level: { label: "", value: 0 } };
  }
  function AS(e4) {
    let t = { type: e4.constructor.name, msg: e4.message, stack: e4.stack };
    for (let r in e4) t[r] === void 0 && (t[r] = e4[r]);
    return t;
  }
  function AE(e4) {
    return typeof e4.timestamp == "function" ? e4.timestamp : e4.timestamp === false ? RS : xS;
  }
  function yc() {
    return {};
  }
  function Gp(e4) {
    return e4;
  }
  function Ua() {
  }
  function RS() {
    return false;
  }
  function xS() {
    return Date.now();
  }
  function RE() {
    return Math.round(Date.now() / 1e3);
  }
  function xE() {
    return new Date(Date.now()).toISOString();
  }
  function FE() {
    function e4(t) {
      return typeof t < "u" && t;
    }
    try {
      return typeof globalThis < "u" || Object.defineProperty(Object.prototype, "globalThis", { get: function() {
        return delete Object.prototype.globalThis, this.globalThis = this;
      }, configurable: true }), globalThis;
    } catch {
      return e4(self) || e4(window) || e4(this) || {};
    }
  }
  Ac.exports.default = cr;
  Ac.exports.pino = cr;
});
var eg = {};
_x(eg, { escape: () => Mn, getHighlightedSuggestion: () => zl, highlightString: () => Hx });
function Fi(e4) {
  return Array.isArray(e4);
}
function bi(e4) {
  return e4.trim() === "";
}
function Km(e4, t) {
  return [...e4.reduce((r, n) => {
    let o = t(n);
    return r.has(o) || r.set(o, n), r;
  }, /* @__PURE__ */ new Map()).values()];
}
function $x(e4) {
  return btoa(encodeURI(e4));
}
function Nn(e4) {
  return $x(JSON.stringify(e4));
}
function na(e4) {
  if (typeof e4 != "object" || !e4) return e4;
  try {
    return JSON.parse(JSON.stringify(e4));
  } catch {
    return e4;
  }
}
function Hx(e4) {
  if (bi(e4.openingDelimiter) || bi(e4.closingDelimiter)) throw Error("delimiters should be a non-empty string");
  if (isNullOrUndefined(e4.content) || bi(e4.content)) return e4.content;
  if (e4.highlights.length === 0) return Mn(e4.content);
  let t = e4.content.length, r = "", n = 0;
  for (let o = 0; o < e4.highlights.length; o++) {
    let a = e4.highlights[o], i = a.offset, s = i + a.length;
    if (s > t) break;
    r += Mn(e4.content.slice(n, i)), r += e4.openingDelimiter, r += Mn(e4.content.slice(i, s)), r += e4.closingDelimiter, n = s;
  }
  return n !== t && (r += Mn(e4.content.slice(n))), r;
}
function zl(e4, t) {
  return e4 = Mn(e4), e4.replace(/\[(.*?)\]|\{(.*?)\}|\((.*?)\)/g, (r, n, o, a) => n ? Gl(n, t.notMatchDelimiters) : o ? Gl(o, t.exactMatchDelimiters) : a ? Gl(a, t.correctionDelimiters) : r);
}
function Gl(e4, t) {
  return t ? t.open + e4 + t.close : e4;
}
function Mn(e4) {
  let t = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;", "`": "&#x60;" }, r = "(?:" + Object.keys(t).join("|") + ")", n = RegExp(r), o = RegExp(r, "g");
  return n.test(e4) ? e4.replace(o, (a) => t[a]) : e4;
}
async function rg(e4, t) {
  let r = e4.getReader(), n;
  for (; !(n = await r.read()).done; ) t(n.value);
}
function ng(e4) {
  let t, r, n, o = false;
  return function(i) {
    t === void 0 ? (t = i, r = 0, n = -1) : t = Wx(t, i);
    let s = t.length, u = 0;
    for (; r < s; ) {
      o && (t[r] === 10 && (u = ++r), o = false);
      let c = -1;
      for (; r < s && c === -1; ++r) switch (t[r]) {
        case 58:
          n === -1 && (n = r - u);
          break;
        case 13:
          o = true;
        case 10:
          c = r;
          break;
      }
      if (c === -1) break;
      e4(t.subarray(u, c), n), u = r, n = -1;
    }
    u === s ? t = void 0 : u !== 0 && (t = t.subarray(u), r -= u);
  };
}
function og(e4, t, r) {
  let n = tg(), o = new TextDecoder();
  return function(i, s) {
    if (i.length === 0) r?.(n), n = tg();
    else if (s > 0) {
      let u = o.decode(i.subarray(0, s)), c = s + (i[s + 1] === 32 ? 2 : 1), d = o.decode(i.subarray(c));
      switch (u) {
        case "data":
          n.data = n.data ? n.data + `
` + d : d;
          break;
        case "event":
          n.event = d;
          break;
        case "id":
          e4(n.id = d);
          break;
        case "retry":
          let m = parseInt(d, 10);
          isNaN(m) || t(n.retry = m);
          break;
      }
    }
  };
}
function Wx(e4, t) {
  let r = new Uint8Array(e4.length + t.length);
  return r.set(e4), r.set(t, e4.length), r;
}
function tg() {
  return { data: "", event: "", id: "", retry: void 0 };
}
var Yx = function(e4, t) {
  var r = {};
  for (var n in e4) Object.prototype.hasOwnProperty.call(e4, n) && t.indexOf(n) < 0 && (r[n] = e4[n]);
  if (e4 != null && typeof Object.getOwnPropertySymbols == "function") for (var o = 0, n = Object.getOwnPropertySymbols(e4); o < n.length; o++) t.indexOf(n[o]) < 0 && Object.prototype.propertyIsEnumerable.call(e4, n[o]) && (r[n[o]] = e4[n[o]]);
  return r;
};
var Ii = "text/event-stream";
var Kx = 1e3;
var ag = "last-event-id";
function ig() {
  typeof window < "u";
}
function oa(e4, t) {
  var { signal: r, headers: n, onopen: o, onmessage: a, onclose: i, onerror: s, openWhenHidden: u, fetch: c } = t, d = Yx(t, ["signal", "headers", "onopen", "onmessage", "onclose", "onerror", "openWhenHidden", "fetch"]);
  return new Promise((m, p) => {
    let l = Object.assign({}, n);
    l.accept || (l.accept = Ii);
    let g;
    function A() {
      g?.abort(), document.hidden || b();
    }
    !u && ig() && document.addEventListener("visibilitychange", A);
    let y = Kx, R = 0;
    function f() {
      ig() && document.removeEventListener("visibilitychange", A), clearTimeout(R), g?.abort();
    }
    r?.addEventListener("abort", () => {
      f(), m();
    });
    let h = c ?? h, C = o ?? Jx;
    async function b() {
      var w;
      g = typeof AbortController > "u" ? null : new AbortController();
      try {
        let v = await h(e4, Object.assign(Object.assign({}, d), { headers: l, signal: g?.signal }));
        await C(v), await rg(v.body, ng(og((P) => {
          P ? l[ag] = P : delete l[ag];
        }, (P) => {
          y = P;
        }, a))), i?.(), f(), m();
      } catch (v) {
        if (!g?.signal.aborted) try {
          let P = (w = s?.(v)) !== null && w !== void 0 ? w : y;
          clearTimeout(R), R = setTimeout(b, P);
        } catch (P) {
          f(), p(P);
        }
      }
    }
    b();
  });
}
function Jx(e4) {
  let t = e4.headers.get("content-type");
  if (!t?.startsWith(Ii)) throw new Error(`Expected content-type to be ${Ii}, Actual: ${t}`);
}
var ln = class {
  constructor(t) {
    ye(this, "_basePath");
    ye(this, "_params", {});
    this._basePath = t;
  }
  addParam(t, r) {
    this._params = { ...this.params, [t]: r };
  }
  get basePath() {
    return this._basePath;
  }
  get params() {
    return this._params;
  }
  get hasParams() {
    return Object.entries(this._params).length;
  }
  get href() {
    return this.hasParams ? `${this.basePath}?${Object.entries(this.params).map(([t, r]) => `${t}=${encodeURIComponent(r)}`).join("&")}` : this.basePath;
  }
};
var Yl = 1;
var Cg = bt(fg(), 1);
var B = new Error("Failed to load reducers.");
function de(e4, t = "prod", r = "platform") {
  let n = t === "prod" ? "" : t, o = r === "platform" ? "" : `.${r}`;
  return `https://${e4}${o}.org${n}.coveo.com`;
}
function Le(e4, t = "prod") {
  return `${de(e4, t)}/rest/search/v2`;
}
function od(e4, t = "prod") {
  return `${de(e4, t, "analytics")}/rest/organizations/${e4}/events/v1`;
}
function Ln() {
  return { answerSnippet: "", documentId: { contentIdKey: "", contentIdValue: "" }, question: "", relatedQuestions: [], score: 0 };
}
function xe() {
  return { response: { results: [], searchUid: "", totalCountFiltered: 0, facets: [], generateAutomaticFacets: { facets: [] }, queryCorrections: [], triggers: [], questionAnswer: Ln(), pipeline: "", splitTestRun: "", termsToHighlight: {}, phrasesToHighlight: {}, extendedResults: {} }, duration: 0, queryExecuted: "", error: null, automaticallyCorrected: false, isLoading: false, results: [], searchResponseId: "", requestId: "", questionAnswer: Ln(), extendedResults: {} };
}
var Ag = (e4, t) => {
  let r = new ln(`${e4.url}${t}`);
  return r.addParam("access_token", e4.accessToken), r.addParam("organizationId", e4.organizationId), r.addParam("uniqueId", e4.uniqueId), e4.q !== void 0 && r.addParam("q", e4.q), e4.enableNavigation !== void 0 && r.addParam("enableNavigation", `${e4.enableNavigation}`), e4.requestedOutputSize !== void 0 && r.addParam("requestedOutputSize", `${e4.requestedOutputSize}`), e4.visitorId !== void 0 && r.addParam("visitorId", `${e4.visitorId}`), r.href;
};
var Sr = (e4) => e4.success !== void 0;
var oe = (e4) => e4.error !== void 0;
var E = new StringValue({ required: true, emptyAllowed: false });
var ne = new StringValue({ required: false, emptyAllowed: false });
var se = new StringValue({ required: true, emptyAllowed: true });
var Eg = new StringValue({ required: false, emptyAllowed: true });
var Oi = new ArrayValue({ each: E, required: true });
var Tg = new StringValue({ required: false, emptyAllowed: false, regex: /^\d+\.\d+\.\d+$/ });
var mt = ({ message: e4, name: t, stack: r }) => ({ message: e4, name: t, stack: r });
var nt = (e4, t) => {
  if ("required" in t) return { payload: new Schema({ value: t }).validate({ value: e4 }).value };
  let o = new RecordValue({ options: { required: true }, values: t }).validate(e4);
  if (o) throw new SchemaValidationError(o);
  return { payload: e4 };
};
var x = (e4, t) => {
  try {
    return nt(e4, t);
  } catch (r) {
    return { payload: e4, error: mt(r) };
  }
};
function ve(e4) {
  return `Minified Redux error #${e4}; visit https://redux.js.org/Errors?code=${e4} for the full message or use the non-minified dev environment for full errors. `;
}
var UF = typeof Symbol == "function" && Symbol.observable || "@@observable";
var sd = () => Math.random().toString(36).substring(7).split("").join(".");
var _F = { INIT: `@@redux/INIT${sd()}`, REPLACE: `@@redux/REPLACE${sd()}`, PROBE_UNKNOWN_ACTION: () => `@@redux/PROBE_UNKNOWN_ACTION${sd()}` };
var qi = _F;
function wt(e4) {
  if (typeof e4 != "object" || e4 === null) return false;
  let t = e4;
  for (; Object.getPrototypeOf(t) !== null; ) t = Object.getPrototypeOf(t);
  return Object.getPrototypeOf(e4) === t || Object.getPrototypeOf(e4) === null;
}
function jF(e4) {
  Object.keys(e4).forEach((t) => {
    let r = e4[t];
    if (typeof r(void 0, { type: qi.INIT }) > "u") throw new Error(ve(12));
    if (typeof r(void 0, { type: qi.PROBE_UNKNOWN_ACTION() }) > "u") throw new Error(ve(13));
  });
}
function Bn(e4) {
  let t = Object.keys(e4), r = {};
  for (let i = 0; i < t.length; i++) {
    let s = t[i];
    typeof e4[s] == "function" && (r[s] = e4[s]);
  }
  let n = Object.keys(r), o, a;
  try {
    jF(r);
  } catch (i) {
    a = i;
  }
  return function(s = {}, u) {
    if (a) throw a;
    let c = false, d = {};
    for (let m = 0; m < n.length; m++) {
      let p = n[m], l = r[p], g = s[p], A = l(g, u);
      if (typeof A > "u") {
        let y = u && u.type;
        throw new Error(ve(14));
      }
      d[p] = A, c = c || A !== g;
    }
    return c = c || n.length !== Object.keys(s).length, c ? d : s;
  };
}
function Un(...e4) {
  return e4.length === 0 ? (t) => t : e4.length === 1 ? e4[0] : e4.reduce((t, r) => (...n) => t(r(...n)));
}
function Di(e4) {
  return wt(e4) && "type" in e4 && typeof e4.type == "string";
}
var Sd = Symbol.for("immer-nothing");
var la = Symbol.for("immer-draftable");
var Be = Symbol.for("immer-state");
function Ie(e4, ...t) {
  throw new Error(`[Immer] minified error nr: ${e4}. Full error at: https://bit.ly/3cXEKWf`);
}
var fn = Object.getPrototypeOf;
function Ke(e4) {
  return !!e4 && !!e4[Be];
}
function Ue(e4) {
  return e4 ? Qg(e4) || Array.isArray(e4) || !!e4[la] || !!e4.constructor?.[la] || fa(e4) || ha(e4) : false;
}
var $F = Object.prototype.constructor.toString();
function Qg(e4) {
  if (!e4 || typeof e4 != "object") return false;
  let t = fn(e4);
  if (t === null) return true;
  let r = Object.hasOwnProperty.call(t, "constructor") && t.constructor;
  return r === Object ? true : typeof r == "function" && Function.toString.call(r) === $F;
}
function Cd(e4) {
  return Ke(e4) || Ie(15, e4), e4[Be].base_;
}
function da(e4, t) {
  hn(e4) === 0 ? Reflect.ownKeys(e4).forEach((r) => {
    t(r, e4[r], e4);
  }) : e4.forEach((r, n) => t(n, r, e4));
}
function hn(e4) {
  let t = e4[Be];
  return t ? t.type_ : Array.isArray(e4) ? 1 : fa(e4) ? 2 : ha(e4) ? 3 : 0;
}
function pa(e4, t) {
  return hn(e4) === 2 ? e4.has(t) : Object.prototype.hasOwnProperty.call(e4, t);
}
function ud(e4, t) {
  return hn(e4) === 2 ? e4.get(t) : e4[t];
}
function Lg(e4, t, r) {
  let n = hn(e4);
  n === 2 ? e4.set(t, r) : n === 3 ? e4.add(r) : e4[t] = r;
}
function GF(e4, t) {
  return e4 === t ? e4 !== 0 || 1 / e4 === 1 / t : e4 !== e4 && t !== t;
}
function fa(e4) {
  return e4 instanceof Map;
}
function ha(e4) {
  return e4 instanceof Set;
}
function gn(e4) {
  return e4.copy_ || e4.base_;
}
function pd(e4, t) {
  if (fa(e4)) return new Map(e4);
  if (ha(e4)) return new Set(e4);
  if (Array.isArray(e4)) return Array.prototype.slice.call(e4);
  let r = Qg(e4);
  if (t === true || t === "class_only" && !r) {
    let n = Object.getOwnPropertyDescriptors(e4);
    delete n[Be];
    let o = Reflect.ownKeys(n);
    for (let a = 0; a < o.length; a++) {
      let i = o[a], s = n[i];
      s.writable === false && (s.writable = true, s.configurable = true), (s.get || s.set) && (n[i] = { configurable: true, writable: true, enumerable: s.enumerable, value: e4[i] });
    }
    return Object.create(fn(e4), n);
  } else {
    let n = fn(e4);
    if (n !== null && r) return { ...e4 };
    let o = Object.create(n);
    return Object.assign(o, e4);
  }
}
function Mi(e4, t = false) {
  return Qi(e4) || Ke(e4) || !Ue(e4) || (hn(e4) > 1 && (e4.set = e4.add = e4.clear = e4.delete = zF), Object.freeze(e4), t && Object.entries(e4).forEach(([r, n]) => Mi(n, true))), e4;
}
function zF() {
  Ie(2);
}
function Qi(e4) {
  return Object.isFrozen(e4);
}
var md = {};
function yn(e4) {
  let t = md[e4];
  return t || Ie(0, e4), t;
}
function HF(e4, t) {
  md[e4] || (md[e4] = t);
}
var ma;
function Bg() {
  return ma;
}
function WF(e4, t) {
  return { drafts_: [], parent_: e4, immer_: t, canAutoFreeze_: true, unfinalizedDrafts_: 0 };
}
function Dg(e4, t) {
  t && (yn("Patches"), e4.patches_ = [], e4.inversePatches_ = [], e4.patchListener_ = t);
}
function gd(e4) {
  fd(e4), e4.drafts_.forEach(YF), e4.drafts_ = null;
}
function fd(e4) {
  e4 === ma && (ma = e4.parent_);
}
function Vg(e4) {
  return ma = WF(ma, e4);
}
function YF(e4) {
  let t = e4[Be];
  t.type_ === 0 || t.type_ === 1 ? t.revoke_() : t.revoked_ = true;
}
function Ng(e4, t) {
  t.unfinalizedDrafts_ = t.drafts_.length;
  let r = t.drafts_[0];
  return e4 !== void 0 && e4 !== r ? (r[Be].modified_ && (gd(t), Ie(4)), Ue(e4) && (e4 = Vi(t, e4), t.parent_ || Ni(t, e4)), t.patches_ && yn("Patches").generateReplacementPatches_(r[Be].base_, e4, t.patches_, t.inversePatches_)) : e4 = Vi(t, r, []), gd(t), t.patches_ && t.patchListener_(t.patches_, t.inversePatches_), e4 !== Sd ? e4 : void 0;
}
function Vi(e4, t, r) {
  if (Qi(t)) return t;
  let n = t[Be];
  if (!n) return da(t, (o, a) => Mg(e4, n, t, o, a, r)), t;
  if (n.scope_ !== e4) return t;
  if (!n.modified_) return Ni(e4, n.base_, true), n.base_;
  if (!n.finalized_) {
    n.finalized_ = true, n.scope_.unfinalizedDrafts_--;
    let o = n.copy_, a = o, i = false;
    n.type_ === 3 && (a = new Set(o), o.clear(), i = true), da(a, (s, u) => Mg(e4, n, o, s, u, r, i)), Ni(e4, o, false), r && e4.patches_ && yn("Patches").generatePatches_(n, r, e4.patches_, e4.inversePatches_);
  }
  return n.copy_;
}
function Mg(e4, t, r, n, o, a, i) {
  if (Ke(o)) {
    let s = a && t && t.type_ !== 3 && !pa(t.assigned_, n) ? a.concat(n) : void 0, u = Vi(e4, o, s);
    if (Lg(r, n, u), Ke(u)) e4.canAutoFreeze_ = false;
    else return;
  } else i && r.add(o);
  if (Ue(o) && !Qi(o)) {
    if (!e4.immer_.autoFreeze_ && e4.unfinalizedDrafts_ < 1) return;
    Vi(e4, o), (!t || !t.scope_.parent_) && typeof n != "symbol" && Object.prototype.propertyIsEnumerable.call(r, n) && Ni(e4, o);
  }
}
function Ni(e4, t, r = false) {
  !e4.parent_ && e4.immer_.autoFreeze_ && e4.canAutoFreeze_ && Mi(t, r);
}
function KF(e4, t) {
  let r = Array.isArray(e4), n = { type_: r ? 1 : 0, scope_: t ? t.scope_ : Bg(), modified_: false, finalized_: false, assigned_: {}, parent_: t, base_: e4, draft_: null, copy_: null, revoke_: null, isManual_: false }, o = n, a = Ad;
  r && (o = [n], a = ga);
  let { revoke: i, proxy: s } = Proxy.revocable(o, a);
  return n.draft_ = s, n.revoke_ = i, s;
}
var Ad = { get(e4, t) {
  if (t === Be) return e4;
  let r = gn(e4);
  if (!pa(r, t)) return JF(e4, r, t);
  let n = r[t];
  return e4.finalized_ || !Ue(n) ? n : n === ld(e4.base_, t) ? (dd(e4), e4.copy_[t] = yd(n, e4)) : n;
}, has(e4, t) {
  return t in gn(e4);
}, ownKeys(e4) {
  return Reflect.ownKeys(gn(e4));
}, set(e4, t, r) {
  let n = Ug(gn(e4), t);
  if (n?.set) return n.set.call(e4.draft_, r), true;
  if (!e4.modified_) {
    let o = ld(gn(e4), t), a = o?.[Be];
    if (a && a.base_ === r) return e4.copy_[t] = r, e4.assigned_[t] = false, true;
    if (GF(r, o) && (r !== void 0 || pa(e4.base_, t))) return true;
    dd(e4), hd(e4);
  }
  return e4.copy_[t] === r && (r !== void 0 || t in e4.copy_) || Number.isNaN(r) && Number.isNaN(e4.copy_[t]) || (e4.copy_[t] = r, e4.assigned_[t] = true), true;
}, deleteProperty(e4, t) {
  return ld(e4.base_, t) !== void 0 || t in e4.base_ ? (e4.assigned_[t] = false, dd(e4), hd(e4)) : delete e4.assigned_[t], e4.copy_ && delete e4.copy_[t], true;
}, getOwnPropertyDescriptor(e4, t) {
  let r = gn(e4), n = Reflect.getOwnPropertyDescriptor(r, t);
  return n && { writable: true, configurable: e4.type_ !== 1 || t !== "length", enumerable: n.enumerable, value: r[t] };
}, defineProperty() {
  Ie(11);
}, getPrototypeOf(e4) {
  return fn(e4.base_);
}, setPrototypeOf() {
  Ie(12);
} };
var ga = {};
da(Ad, (e4, t) => {
  ga[e4] = function() {
    return arguments[0] = arguments[0][0], t.apply(this, arguments);
  };
});
ga.deleteProperty = function(e4, t) {
  return ga.set.call(this, e4, t, void 0);
};
ga.set = function(e4, t, r) {
  return Ad.set.call(this, e4[0], t, r, e4[0]);
};
function ld(e4, t) {
  let r = e4[Be];
  return (r ? gn(r) : e4)[t];
}
function JF(e4, t, r) {
  let n = Ug(t, r);
  return n ? "value" in n ? n.value : n.get?.call(e4.draft_) : void 0;
}
function Ug(e4, t) {
  if (!(t in e4)) return;
  let r = fn(e4);
  for (; r; ) {
    let n = Object.getOwnPropertyDescriptor(r, t);
    if (n) return n;
    r = fn(r);
  }
}
function hd(e4) {
  e4.modified_ || (e4.modified_ = true, e4.parent_ && hd(e4.parent_));
}
function dd(e4) {
  e4.copy_ || (e4.copy_ = pd(e4.base_, e4.scope_.immer_.useStrictShallowCopy_));
}
var XF = class {
  constructor(e4) {
    this.autoFreeze_ = true, this.useStrictShallowCopy_ = false, this.produce = (t, r, n) => {
      if (typeof t == "function" && typeof r != "function") {
        let a = r;
        r = t;
        let i = this;
        return function(u = a, ...c) {
          return i.produce(u, (d) => r.call(this, d, ...c));
        };
      }
      typeof r != "function" && Ie(6), n !== void 0 && typeof n != "function" && Ie(7);
      let o;
      if (Ue(t)) {
        let a = Vg(this), i = yd(t, void 0), s = true;
        try {
          o = r(i), s = false;
        } finally {
          s ? gd(a) : fd(a);
        }
        return Dg(a, n), Ng(o, a);
      } else if (!t || typeof t != "object") {
        if (o = r(t), o === void 0 && (o = t), o === Sd && (o = void 0), this.autoFreeze_ && Mi(o, true), n) {
          let a = [], i = [];
          yn("Patches").generateReplacementPatches_(t, o, a, i), n(a, i);
        }
        return o;
      } else Ie(1, t);
    }, this.produceWithPatches = (t, r) => {
      if (typeof t == "function") return (i, ...s) => this.produceWithPatches(i, (u) => t(u, ...s));
      let n, o;
      return [this.produce(t, r, (i, s) => {
        n = i, o = s;
      }), n, o];
    }, typeof e4?.autoFreeze == "boolean" && this.setAutoFreeze(e4.autoFreeze), typeof e4?.useStrictShallowCopy == "boolean" && this.setUseStrictShallowCopy(e4.useStrictShallowCopy);
  }
  createDraft(e4) {
    Ue(e4) || Ie(8), Ke(e4) && (e4 = _g(e4));
    let t = Vg(this), r = yd(e4, void 0);
    return r[Be].isManual_ = true, fd(t), r;
  }
  finishDraft(e4, t) {
    let r = e4 && e4[Be];
    (!r || !r.isManual_) && Ie(9);
    let { scope_: n } = r;
    return Dg(n, t), Ng(void 0, n);
  }
  setAutoFreeze(e4) {
    this.autoFreeze_ = e4;
  }
  setUseStrictShallowCopy(e4) {
    this.useStrictShallowCopy_ = e4;
  }
  applyPatches(e4, t) {
    let r;
    for (r = t.length - 1; r >= 0; r--) {
      let o = t[r];
      if (o.path.length === 0 && o.op === "replace") {
        e4 = o.value;
        break;
      }
    }
    r > -1 && (t = t.slice(r + 1));
    let n = yn("Patches").applyPatches_;
    return Ke(e4) ? n(e4, t) : this.produce(e4, (o) => n(o, t));
  }
};
function yd(e4, t) {
  let r = fa(e4) ? yn("MapSet").proxyMap_(e4, t) : ha(e4) ? yn("MapSet").proxySet_(e4, t) : KF(e4, t);
  return (t ? t.scope_ : Bg()).drafts_.push(r), r;
}
function _g(e4) {
  return Ke(e4) || Ie(10, e4), jg(e4);
}
function jg(e4) {
  if (!Ue(e4) || Qi(e4)) return e4;
  let t = e4[Be], r;
  if (t) {
    if (!t.modified_) return t.base_;
    t.finalized_ = true, r = pd(e4, t.scope_.immer_.useStrictShallowCopy_);
  } else r = pd(e4, true);
  return da(r, (n, o) => {
    Lg(r, n, jg(o));
  }), t && (t.finalized_ = false), r;
}
function $g() {
  let t = "replace", r = "add", n = "remove";
  function o(p, l, g, A) {
    switch (p.type_) {
      case 0:
      case 2:
        return i(p, l, g, A);
      case 1:
        return a(p, l, g, A);
      case 3:
        return s(p, l, g, A);
    }
  }
  function a(p, l, g, A) {
    let { base_: y, assigned_: R } = p, f = p.copy_;
    f.length < y.length && ([y, f] = [f, y], [g, A] = [A, g]);
    for (let h = 0; h < y.length; h++) if (R[h] && f[h] !== y[h]) {
      let C = l.concat([h]);
      g.push({ op: t, path: C, value: m(f[h]) }), A.push({ op: t, path: C, value: m(y[h]) });
    }
    for (let h = y.length; h < f.length; h++) {
      let C = l.concat([h]);
      g.push({ op: r, path: C, value: m(f[h]) });
    }
    for (let h = f.length - 1; y.length <= h; --h) {
      let C = l.concat([h]);
      A.push({ op: n, path: C });
    }
  }
  function i(p, l, g, A) {
    let { base_: y, copy_: R } = p;
    da(p.assigned_, (f, h) => {
      let C = ud(y, f), b = ud(R, f), w = h ? pa(y, f) ? t : r : n;
      if (C === b && w === t) return;
      let v = l.concat(f);
      g.push(w === n ? { op: w, path: v } : { op: w, path: v, value: b }), A.push(w === r ? { op: n, path: v } : w === n ? { op: r, path: v, value: m(C) } : { op: t, path: v, value: m(C) });
    });
  }
  function s(p, l, g, A) {
    let { base_: y, copy_: R } = p, f = 0;
    y.forEach((h) => {
      if (!R.has(h)) {
        let C = l.concat([f]);
        g.push({ op: n, path: C, value: h }), A.unshift({ op: r, path: C, value: h });
      }
      f++;
    }), f = 0, R.forEach((h) => {
      if (!y.has(h)) {
        let C = l.concat([f]);
        g.push({ op: r, path: C, value: h }), A.unshift({ op: n, path: C, value: h });
      }
      f++;
    });
  }
  function u(p, l, g, A) {
    g.push({ op: t, path: [], value: l === Sd ? void 0 : l }), A.push({ op: t, path: [], value: p });
  }
  function c(p, l) {
    return l.forEach((g) => {
      let { path: A, op: y } = g, R = p;
      for (let b = 0; b < A.length - 1; b++) {
        let w = hn(R), v = A[b];
        typeof v != "string" && typeof v != "number" && (v = "" + v), (w === 0 || w === 1) && (v === "__proto__" || v === "constructor") && Ie(19), typeof R == "function" && v === "prototype" && Ie(19), R = ud(R, v), typeof R != "object" && Ie(18, A.join("/"));
      }
      let f = hn(R), h = d(g.value), C = A[A.length - 1];
      switch (y) {
        case t:
          switch (f) {
            case 2:
              return R.set(C, h);
            case 3:
              Ie(16);
            default:
              return R[C] = h;
          }
        case r:
          switch (f) {
            case 1:
              return C === "-" ? R.push(h) : R.splice(C, 0, h);
            case 2:
              return R.set(C, h);
            case 3:
              return R.add(h);
            default:
              return R[C] = h;
          }
        case n:
          switch (f) {
            case 1:
              return R.splice(C, 1);
            case 2:
              return R.delete(C);
            case 3:
              return R.delete(g.value);
            default:
              return delete R[C];
          }
        default:
          Ie(17, y);
      }
    }), p;
  }
  function d(p) {
    if (!Ue(p)) return p;
    if (Array.isArray(p)) return p.map(d);
    if (fa(p)) return new Map(Array.from(p.entries()).map(([g, A]) => [g, d(A)]));
    if (ha(p)) return new Set(Array.from(p).map(d));
    let l = Object.create(fn(p));
    for (let g in p) l[g] = d(p[g]);
    return pa(p, la) && (l[la] = p[la]), l;
  }
  function m(p) {
    return Ke(p) ? d(p) : p;
  }
  HF("Patches", { applyPatches_: c, generatePatches_: o, generateReplacementPatches_: u });
}
var Je = new XF();
var nr = Je.produce;
var Li = Je.produceWithPatches.bind(Je);
var EM = Je.setAutoFreeze.bind(Je);
var TM = Je.setUseStrictShallowCopy.bind(Je);
var Rd = Je.applyPatches.bind(Je);
var kM = Je.createDraft.bind(Je);
var OM = Je.finishDraft.bind(Je);
function ZF(e4, t = `expected a function, instead received ${typeof e4}`) {
  if (typeof e4 != "function") throw new TypeError(t);
}
function eb(e4, t = `expected an object, instead received ${typeof e4}`) {
  if (typeof e4 != "object") throw new TypeError(t);
}
function tb(e4, t = "expected all items to be functions, instead received the following types: ") {
  if (!e4.every((r) => typeof r == "function")) {
    let r = e4.map((n) => typeof n == "function" ? `function ${n.name || "unnamed"}()` : typeof n).join(", ");
    throw new TypeError(`${t}[${r}]`);
  }
}
var Gg = (e4) => Array.isArray(e4) ? e4 : [e4];
function rb(e4) {
  let t = Array.isArray(e4[0]) ? e4[0] : e4;
  return tb(t, "createSelector expects all input-selectors to be functions, but received the following types: "), t;
}
function nb(e4, t) {
  let r = [], { length: n } = e4;
  for (let o = 0; o < n; o++) r.push(e4[o].apply(null, t));
  return r;
}
var VM = Symbol();
var NM = Object.getPrototypeOf({});
var ob = class {
  constructor(e4) {
    this.value = e4;
  }
  deref() {
    return this.value;
  }
};
var ab = typeof WeakRef < "u" ? WeakRef : ob;
var ib = 0;
var zg = 1;
function Bi() {
  return { s: ib, v: void 0, o: null, p: null };
}
function _n(e4, t = {}) {
  let r = Bi(), { resultEqualityCheck: n } = t, o, a = 0;
  function i() {
    let s = r, { length: u } = arguments;
    for (let m = 0, p = u; m < p; m++) {
      let l = arguments[m];
      if (typeof l == "function" || typeof l == "object" && l !== null) {
        let g = s.o;
        g === null && (s.o = g = /* @__PURE__ */ new WeakMap());
        let A = g.get(l);
        A === void 0 ? (s = Bi(), g.set(l, s)) : s = A;
      } else {
        let g = s.p;
        g === null && (s.p = g = /* @__PURE__ */ new Map());
        let A = g.get(l);
        A === void 0 ? (s = Bi(), g.set(l, s)) : s = A;
      }
    }
    let c = s, d;
    if (s.s === zg) d = s.v;
    else if (d = e4.apply(null, arguments), a++, n) {
      let m = o?.deref?.() ?? o;
      m != null && n(m, d) && (d = m, a !== 0 && a--), o = typeof d == "object" && d !== null || typeof d == "function" ? new ab(d) : d;
    }
    return c.s = zg, c.v = d, d;
  }
  return i.clearCache = () => {
    r = Bi(), i.resetResultsCount();
  }, i.resultsCount = () => a, i.resetResultsCount = () => {
    a = 0;
  }, i;
}
function Hg(e4, ...t) {
  let r = typeof e4 == "function" ? { memoize: e4, memoizeOptions: t } : e4, n = (...o) => {
    let a = 0, i = 0, s, u = {}, c = o.pop();
    typeof c == "object" && (u = c, c = o.pop()), ZF(c, `createSelector expects an output function after the inputs, but received: [${typeof c}]`);
    let d = { ...r, ...u }, { memoize: m, memoizeOptions: p = [], argsMemoize: l = _n, argsMemoizeOptions: g = [], devModeChecks: A = {} } = d, y = Gg(p), R = Gg(g), f = rb(o), h = m(function() {
      return a++, c.apply(null, arguments);
    }, ...y), C = true, b = l(function() {
      i++;
      let v = nb(f, arguments);
      return s = h.apply(null, v), s;
    }, ...R);
    return Object.assign(b, { resultFunc: c, memoizedResultFunc: h, dependencies: f, dependencyRecomputations: () => i, resetDependencyRecomputations: () => {
      i = 0;
    }, lastResult: () => s, recomputations: () => a, resetRecomputations: () => {
      a = 0;
    }, memoize: m, argsMemoize: l });
  };
  return Object.assign(n, { withTypes: () => n }), n;
}
var W = Hg(_n);
var sb = Object.assign((e4, t = W) => {
  eb(e4, `createStructuredSelector expects first argument to be an object where each property is a selector, instead received a ${typeof e4}`);
  let r = Object.keys(e4), n = r.map((a) => e4[a]);
  return t(n, (...a) => a.reduce((i, s, u) => (i[r[u]] = s, i), {}));
}, { withTypes: () => sb });
function Wg(e4) {
  return ({ dispatch: r, getState: n }) => (o) => (a) => typeof a == "function" ? a(r, n, e4) : o(a);
}
var Yg = Wg();
var cb = typeof window < "u" && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ : function() {
  if (arguments.length !== 0) return typeof arguments[0] == "object" ? Un : Un.apply(null, arguments);
};
var zM = typeof window < "u" && window.__REDUX_DEVTOOLS_EXTENSION__ ? window.__REDUX_DEVTOOLS_EXTENSION__ : function() {
  return function(e4) {
    return e4;
  };
};
var ub = (e4) => e4 && typeof e4.match == "function";
function S(e4, t) {
  function r(...n) {
    if (t) {
      let o = t(...n);
      if (!o) throw new Error(Xe(0));
      return { type: e4, payload: o.payload, ..."meta" in o && { meta: o.meta }, ..."error" in o && { error: o.error } };
    }
    return { type: e4, payload: n[0] };
  }
  return r.toString = () => `${e4}`, r.type = e4, r.match = (n) => Di(n) && n.type === e4, r;
}
function Jg(e4) {
  return Ue(e4) ? nr(e4, () => {
  }) : e4;
}
function Xg(e4, t, r) {
  if (e4.has(t)) {
    let o = e4.get(t);
    return r.update && (o = r.update(o, t, e4), e4.set(t, o)), o;
  }
  if (!r.insert) throw new Error(Xe(10));
  let n = r.insert(t, e4);
  return e4.set(t, n), n;
}
var Cn = "RTK_autoBatch";
var $n = () => (e4) => ({ payload: e4, meta: { [Cn]: true } });
var tf = (e4) => (t) => {
  setTimeout(t, e4);
};
var pb = typeof window < "u" && window.requestAnimationFrame ? window.requestAnimationFrame : tf(10);
function nf(e4) {
  let t = {}, r = [], n, o = { addCase(a, i) {
    let s = typeof a == "string" ? a : a.type;
    if (!s) throw new Error(Xe(28));
    if (s in t) throw new Error(Xe(29));
    return t[s] = i, o;
  }, addMatcher(a, i) {
    return r.push({ matcher: a, reducer: i }), o;
  }, addDefaultCase(a) {
    return n = a, o;
  } };
  return e4(o), [t, r, n];
}
function fb(e4) {
  return typeof e4 == "function";
}
function $(e4, t) {
  let [r, n, o] = nf(t), a;
  if (fb(e4)) a = () => Jg(e4());
  else {
    let s = Jg(e4);
    a = () => s;
  }
  function i(s = a(), u) {
    let c = [r[u.type], ...n.filter(({ matcher: d }) => d(u)).map(({ reducer: d }) => d)];
    return c.filter((d) => !!d).length === 0 && (c = [o]), c.reduce((d, m) => {
      if (m) if (Ke(d)) {
        let l = m(d, u);
        return l === void 0 ? d : l;
      } else {
        if (Ue(d)) return nr(d, (p) => m(p, u));
        {
          let p = m(d, u);
          if (p === void 0) {
            if (d === null) return d;
            throw new Error(Xe(9));
          }
          return p;
        }
      }
      return d;
    }, s);
  }
  return i.getInitialState = a, i;
}
var of = (e4, t) => ub(e4) ? e4.match(t) : e4(t);
function Pt(...e4) {
  return (t) => e4.some((r) => of(r, t));
}
function jn(...e4) {
  return (t) => e4.every((r) => of(r, t));
}
function _i(e4, t) {
  if (!e4 || !e4.meta) return false;
  let r = typeof e4.meta.requestId == "string", n = t.indexOf(e4.meta.requestStatus) > -1;
  return r && n;
}
function Sa(e4) {
  return typeof e4[0] == "function" && "pending" in e4[0] && "fulfilled" in e4[0] && "rejected" in e4[0];
}
function ji(...e4) {
  return e4.length === 0 ? (t) => _i(t, ["pending"]) : Sa(e4) ? Pt(...e4.map((t) => t.pending)) : ji()(e4[0]);
}
function Sn(...e4) {
  return e4.length === 0 ? (t) => _i(t, ["rejected"]) : Sa(e4) ? Pt(...e4.map((t) => t.rejected)) : Sn()(e4[0]);
}
function Ca(...e4) {
  let t = (r) => r && r.meta && r.meta.rejectedWithValue;
  return e4.length === 0 ? jn(Sn(...e4), t) : Sa(e4) ? jn(Sn(...e4), t) : Ca()(e4[0]);
}
function or(...e4) {
  return e4.length === 0 ? (t) => _i(t, ["fulfilled"]) : Sa(e4) ? Pt(...e4.map((t) => t.fulfilled)) : or()(e4[0]);
}
function $i(...e4) {
  return e4.length === 0 ? (t) => _i(t, ["pending", "fulfilled", "rejected"]) : Sa(e4) ? Pt(...e4.flatMap((t) => [t.pending, t.rejected, t.fulfilled])) : $i()(e4[0]);
}
var hb = "ModuleSymbhasOwnPr-0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZXIjQW";
var Fd = (e4 = 21) => {
  let t = "", r = e4;
  for (; r--; ) t += hb[Math.random() * 64 | 0];
  return t;
};
var yb = ["name", "message", "stack", "code"];
var xd = class {
  constructor(e4, t) {
    ye(this, "_type");
    this.payload = e4, this.meta = t;
  }
};
var Zg = class {
  constructor(e4, t) {
    ye(this, "_type");
    this.payload = e4, this.meta = t;
  }
};
var Sb = (e4) => {
  if (typeof e4 == "object" && e4 !== null) {
    let t = {};
    for (let r of yb) typeof e4[r] == "string" && (t[r] = e4[r]);
    return t;
  }
  return { message: String(e4) };
};
var L = (() => {
  function e4(t, r, n) {
    let o = S(t + "/fulfilled", (u, c, d, m) => ({ payload: u, meta: { ...m || {}, arg: d, requestId: c, requestStatus: "fulfilled" } })), a = S(t + "/pending", (u, c, d) => ({ payload: void 0, meta: { ...d || {}, arg: c, requestId: u, requestStatus: "pending" } })), i = S(t + "/rejected", (u, c, d, m, p) => ({ payload: m, error: (n && n.serializeError || Sb)(u || "Rejected"), meta: { ...p || {}, arg: d, requestId: c, rejectedWithValue: !!m, requestStatus: "rejected", aborted: u?.name === "AbortError", condition: u?.name === "ConditionError" } }));
    function s(u) {
      return (c, d, m) => {
        let p = n?.idGenerator ? n.idGenerator(u) : Fd(), l = new AbortController(), g, A;
        function y(f) {
          A = f, l.abort();
        }
        let R = async function() {
          let f;
          try {
            let C = n?.condition?.(u, { getState: d, extra: m });
            if (Ab(C) && (C = await C), C === false || l.signal.aborted) throw { name: "ConditionError", message: "Aborted due to condition callback returning false." };
            let b = new Promise((w, v) => {
              g = () => {
                v({ name: "AbortError", message: A || "Aborted" });
              }, l.signal.addEventListener("abort", g);
            });
            c(a(p, u, n?.getPendingMeta?.({ requestId: p, arg: u }, { getState: d, extra: m }))), f = await Promise.race([b, Promise.resolve(r(u, { dispatch: c, getState: d, extra: m, requestId: p, signal: l.signal, abort: y, rejectWithValue: (w, v) => new xd(w, v), fulfillWithValue: (w, v) => new Zg(w, v) })).then((w) => {
              if (w instanceof xd) throw w;
              return w instanceof Zg ? o(w.payload, p, u, w.meta) : o(w, p, u);
            })]);
          } catch (C) {
            f = C instanceof xd ? i(null, p, u, C.payload, C.meta) : i(C, p, u);
          } finally {
            g && l.signal.removeEventListener("abort", g);
          }
          return n && !n.dispatchConditionRejection && i.match(f) && f.meta.condition || c(f), f;
        }();
        return Object.assign(R, { abort: y, requestId: p, arg: u, unwrap() {
          return R.then(Cb);
        } });
      };
    }
    return Object.assign(s, { pending: a, rejected: i, fulfilled: o, settled: Pt(i, o), typePrefix: t });
  }
  return e4.withTypes = () => e4, e4;
})();
function Cb(e4) {
  if (e4.meta && e4.meta.rejectedWithValue) throw e4.payload;
  if (e4.error) throw e4.error;
  return e4.payload;
}
function Ab(e4) {
  return e4 !== null && typeof e4 == "object" && typeof e4.then == "function";
}
var af = Symbol.for("rtk-slice-createasyncthunk");
var JM = { [af]: L };
function Rb(e4, t) {
  return `${e4}/${t}`;
}
function xb({ creators: e4 } = {}) {
  let t = e4?.asyncThunk?.[af];
  return function(n) {
    let { name: o, reducerPath: a = o } = n;
    if (!o) throw new Error(Xe(11));
    typeof process < "u";
    let i = (typeof n.reducers == "function" ? n.reducers(bb()) : n.reducers) || {}, s = Object.keys(i), u = { sliceCaseReducersByName: {}, sliceCaseReducersByType: {}, actionCreators: {}, sliceMatchers: [] }, c = { addCase(f, h) {
      let C = typeof f == "string" ? f : f.type;
      if (!C) throw new Error(Xe(12));
      if (C in u.sliceCaseReducersByType) throw new Error(Xe(13));
      return u.sliceCaseReducersByType[C] = h, c;
    }, addMatcher(f, h) {
      return u.sliceMatchers.push({ matcher: f, reducer: h }), c;
    }, exposeAction(f, h) {
      return u.actionCreators[f] = h, c;
    }, exposeCaseReducer(f, h) {
      return u.sliceCaseReducersByName[f] = h, c;
    } };
    s.forEach((f) => {
      let h = i[f], C = { reducerName: f, type: Rb(o, f), createNotation: typeof n.reducers == "function" };
      Ib(h) ? Pb(C, h, c, t) : vb(C, h, c);
    });
    function d() {
      let [f = {}, h = [], C = void 0] = typeof n.extraReducers == "function" ? nf(n.extraReducers) : [n.extraReducers], b = { ...f, ...u.sliceCaseReducersByType };
      return $(n.initialState, (w) => {
        for (let v in b) w.addCase(v, b[v]);
        for (let v of u.sliceMatchers) w.addMatcher(v.matcher, v.reducer);
        for (let v of h) w.addMatcher(v.matcher, v.reducer);
        C && w.addDefaultCase(C);
      });
    }
    let m = (f) => f, p = /* @__PURE__ */ new Map(), l;
    function g(f, h) {
      return l || (l = d()), l(f, h);
    }
    function A() {
      return l || (l = d()), l.getInitialState();
    }
    function y(f, h = false) {
      function C(w) {
        let v = w[f];
        return typeof v > "u" && h && (v = A()), v;
      }
      function b(w = m) {
        let v = Xg(p, h, { insert: () => /* @__PURE__ */ new WeakMap() });
        return Xg(v, w, { insert: () => {
          let P = {};
          for (let [T, M] of Object.entries(n.selectors ?? {})) P[T] = Fb(M, w, A, h);
          return P;
        } });
      }
      return { reducerPath: f, getSelectors: b, get selectors() {
        return b(C);
      }, selectSlice: C };
    }
    let R = { name: o, reducer: g, actions: u.actionCreators, caseReducers: u.sliceCaseReducersByName, getInitialState: A, ...y(a), injectInto(f, { reducerPath: h, ...C } = {}) {
      let b = h ?? a;
      return f.inject({ reducerPath: b, reducer: g }, C), { ...R, ...y(b, true) };
    } };
    return R;
  };
}
function Fb(e4, t, r, n) {
  function o(a, ...i) {
    let s = t(a);
    return typeof s > "u" && n && (s = r()), e4(s, ...i);
  }
  return o.unwrapped = e4, o;
}
var An = xb();
function bb() {
  function e4(t, r) {
    return { _reducerDefinitionType: "asyncThunk", payloadCreator: t, ...r };
  }
  return e4.withTypes = () => e4, { reducer(t) {
    return Object.assign({ [t.name](...r) {
      return t(...r);
    } }[t.name], { _reducerDefinitionType: "reducer" });
  }, preparedReducer(t, r) {
    return { _reducerDefinitionType: "reducerWithPrepare", prepare: t, reducer: r };
  }, asyncThunk: e4 };
}
function vb({ type: e4, reducerName: t, createNotation: r }, n, o) {
  let a, i;
  if ("reducer" in n) {
    if (r && !wb(n)) throw new Error(Xe(17));
    a = n.reducer, i = n.prepare;
  } else a = n;
  o.addCase(e4, a).exposeCaseReducer(t, a).exposeAction(t, i ? S(e4, i) : S(e4));
}
function Ib(e4) {
  return e4._reducerDefinitionType === "asyncThunk";
}
function wb(e4) {
  return e4._reducerDefinitionType === "reducerWithPrepare";
}
function Pb({ type: e4, reducerName: t }, r, n, o) {
  if (!o) throw new Error(Xe(18));
  let { payloadCreator: a, fulfilled: i, pending: s, rejected: u, settled: c, options: d } = r, m = o(e4, a, d);
  n.exposeAction(t, m), i && n.addCase(m.fulfilled, i), s && n.addCase(m.pending, s), u && n.addCase(m.rejected, u), c && n.addMatcher(m.settled, c), n.exposeCaseReducer(t, { fulfilled: i || Ui, pending: s || Ui, rejected: u || Ui, settled: c || Ui });
}
function Ui() {
}
var sf = "listener";
var cf = "completed";
var uf = "cancelled";
var XM = `task-${uf}`;
var ZM = `task-${cf}`;
var eQ = `${sf}-${uf}`;
var tQ = `${sf}-${cf}`;
var { assign: lf } = Object;
var bd = "listenerMiddleware";
var Eb = lf(S(`${bd}/add`), { withTypes: () => Eb });
var rQ = S(`${bd}/removeAll`);
var Tb = lf(S(`${bd}/remove`), { withTypes: () => Tb });
var nQ = Symbol.for("rtk-state-proxy-original");
function Xe(e4) {
  return `Minified Redux Toolkit error #${e4}; visit https://redux-toolkit.js.org/Errors?code=${e4} for the full message or use the non-minified dev environment for full errors. `;
}
function kb({ config: e4, environment: t, event: r, listenerManager: n }) {
  let { url: o, token: a, mode: i } = e4;
  i !== "disabled" && (n.call(r), t.send(o, a, r));
}
var Ob = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
function qb(e4) {
  return typeof e4 == "string" && Ob.test(e4);
}
function Db(e4) {
  return { getClientId: () => {
    let t = "visitorId", r = e4.get(), n = r.storage, o = n.getItem(t), a = o && qb(o) ? o : r.generateUUID();
    return n.setItem(t, a), a;
  } };
}
var pf = "0.7.10";
function Vb(e4) {
  let { trackingId: t } = e4;
  return { trackingId: t };
}
function Nb(e4) {
  return (e4.source || []).concat([`relay@${pf}`]);
}
function mf(e4, t, r, n) {
  let { getReferrer: o, getLocation: a, getUserAgent: i } = r, s = Vb(t), u = n.getClientId();
  return Object.freeze({ type: e4, config: s, ts: Date.now(), source: Nb(t), clientId: u, userAgent: i(), referrer: o(), location: a() });
}
function Mb(e4, t, r, n, o) {
  return { ...t, meta: mf(e4, r, n, o) };
}
var Qb = "*";
function Lb() {
  let e4 = [];
  function t({ type: u, callback: c }) {
    return e4.findIndex((d) => d.type === u && d.callback === c);
  }
  function r(u, c) {
    return u.type === "*" || c === u.type;
  }
  function n(u) {
    return t(u) < 0 && e4.push(u), () => s(u.type, u.callback);
  }
  function o(u) {
    e4.forEach((c) => {
      if (r(c, u.meta.type)) try {
        c.callback(u);
      } catch (d) {
        console.error(d);
      }
    });
  }
  function a(u) {
    if (u === Qb) e4.length = 0;
    else for (let c = e4.length - 1; c >= 0; c--) e4[c].type === u && e4.splice(c, 1);
  }
  function i(u) {
    let c = t(u);
    c >= 0 && e4.splice(c, 1);
  }
  function s(u, c) {
    c ? i({ type: u, callback: c }) : a(u);
  }
  return { add: n, call: o, remove: s };
}
function df({ url: e4, token: t, trackingId: r, ...n }) {
  return Object.freeze({ url: e4, token: t, trackingId: r, ...!!n.mode && { mode: n.mode }, ...!!n.source && { source: n.source } });
}
function Bb(e4) {
  let t = df(e4);
  return { get: () => t, update: (r) => {
    t = df({ ...t, ...r });
  } };
}
function Ub() {
  let e4 = typeof window < "u";
  return { sendMessage(t) {
    e4 && window.postMessage(t, "*");
  } };
}
var vd = _b();
function _b() {
  let e4 = "coveo_", t = (r) => {
    let n = r.split(".").slice(-2);
    return n.length == 2 ? n.join(".") : "";
  };
  return { getItem(r) {
    let n = `${e4}${r}=`, o = document.cookie.split(";");
    for (let a of o) {
      let i = a.replace(/^\s+/, "");
      if (i.lastIndexOf(n, 0) === 0) return i.substring(n.length, i.length);
    }
    return null;
  }, setItem(r, n, o) {
    let a = t(window.location.hostname), i = `;expires=${new Date((/* @__PURE__ */ new Date()).getTime() + o).toUTCString()}`, s = a ? `;domain=${a}` : "";
    document.cookie = `${e4}${r}=${n}${i}${s};path=/;SameSite=Lax`;
  }, removeItem(r) {
    this.setItem(r, "", -1);
  } };
}
function jb() {
  return { getItem(e4) {
    return vd.getItem(e4) || localStorage.getItem(e4);
  }, removeItem(e4) {
    vd.removeItem(e4), localStorage.removeItem(e4);
  }, setItem(e4, t) {
    localStorage.setItem(e4, t), vd.setItem(e4, t, 31556952e3);
  } };
}
function $b() {
  let e4 = document.referrer;
  return e4 === "" ? null : e4;
}
function Gb() {
  return { runtime: "browser", send: (e4, t, r) => {
    let n = navigator.sendBeacon(`${e4}?access_token=${t}`, new Blob([JSON.stringify([r])], { type: "application/json" }));
    if (Ub().sendMessage({ kind: "EVENT_PROTOCOL", event: r, url: e4, token: t }), !n) throw new Error("Failed to send the event(s) because the payload size exceeded the maximum allowed size (32 KB). Please contact support if the problem persists.");
  }, getReferrer: () => $b(), getLocation: () => window.location.href, getUserAgent: () => navigator.userAgent, generateUUID: () => crypto.randomUUID(), storage: jb() };
}
function zb() {
  try {
    let e4 = "__storage_test__";
    return localStorage.setItem(e4, e4), localStorage.removeItem(e4), true;
  } catch (e4) {
    return e4 instanceof DOMException && e4.name === "QuotaExceededError" && localStorage && localStorage.length !== 0;
  }
}
function Hb() {
  return { getItem() {
    return null;
  }, removeItem() {
  }, setItem() {
  } };
}
function Wb() {
  return { runtime: "null", send: () => {
  }, getReferrer: () => null, getLocation: () => null, getUserAgent: () => null, generateUUID: () => "", storage: Hb() };
}
function Yb(e4) {
  return e4.get().mode !== "disabled" && Kb() && zb() ? Gb() : Wb();
}
function Kb() {
  try {
    return typeof window == "object";
  } catch {
    return false;
  }
}
function Jb(e4) {
  return { get: () => Object.freeze(Yb(e4)) };
}
function gf(e4) {
  let t = Bb(e4), r = Lb(), n = Jb(t), o = Db(n);
  return { emit: (a, i) => {
    let s = t.get(), u = n.get(), c = Mb(a, i, s, u, o);
    return kb({ config: s, environment: u, event: c, listenerManager: r });
  }, getMeta: (a) => mf(a, t.get(), n.get(), o), on: (a, i) => r.add({ type: a, callback: i }), off: (a, i) => r.remove(a, i), updateConfig: (a) => t.update(a), version: pf };
}
var Gn = "3.1.3";
var ff = ["@coveo/atomic", "@coveo/quantic"];
var Et = W((e4) => e4.source, (e4) => Object.entries(e4).map(([t, r]) => `${t}@${r}`).concat(`@coveo/headless@${Gn}`));
var zn = W((e4) => e4.configuration.organizationId, (e4) => e4.configuration.environment, (e4) => e4.configuration.accessToken, (e4) => e4.configuration.analytics, (e4) => Et(e4.configuration.analytics), (e4, t, r, { trackingId: n, apiBaseUrl: o, enabled: a }, i) => gf({ mode: a ? "emit" : "disabled", url: o ?? od(e4, t), token: r, trackingId: n, source: i }));
function Tt(e4, t) {
  var r = {};
  for (var n in e4) Object.prototype.hasOwnProperty.call(e4, n) && t.indexOf(n) < 0 && (r[n] = e4[n]);
  if (e4 != null && typeof Object.getOwnPropertySymbols == "function") for (var o = 0, n = Object.getOwnPropertySymbols(e4); o < n.length; o++) t.indexOf(n[o]) < 0 && Object.prototype.propertyIsEnumerable.call(e4, n[o]) && (r[n[o]] = e4[n[o]]);
  return r;
}
function I(e4, t, r, n) {
  function o(a) {
    return a instanceof r ? a : new r(function(i) {
      i(a);
    });
  }
  return new (r || (r = Promise))(function(a, i) {
    function s(d) {
      try {
        c(n.next(d));
      } catch (m) {
        i(m);
      }
    }
    function u(d) {
      try {
        c(n.throw(d));
      } catch (m) {
        i(m);
      }
    }
    function c(d) {
      d.done ? a(d.value) : o(d.value).then(s, u);
    }
    c((n = n.apply(e4, t || [])).next());
  });
}
var ee;
(function(e4) {
  e4.search = "search", e4.click = "click", e4.custom = "custom", e4.view = "view", e4.collect = "collect";
})(ee || (ee = {}));
function hf() {
  return typeof window < "u";
}
function Ud() {
  return typeof navigator < "u";
}
function Hn() {
  return typeof document < "u";
}
function Pd() {
  try {
    return typeof localStorage < "u";
  } catch {
    return false;
  }
}
function Xb() {
  try {
    return typeof sessionStorage < "u";
  } catch {
    return false;
  }
}
function Pf() {
  return Ud() && navigator.cookieEnabled;
}
var Zb = [ee.click, ee.custom, ee.search, ee.view];
var ev = (e4, t) => Zb.indexOf(e4) !== -1 ? Object.assign({ language: Hn() ? document.documentElement.lang : "unknown", userAgent: Ud() ? navigator.userAgent : "unknown" }, t) : t;
var xa = class e {
  static set(t, r, n) {
    var o, a, i, s;
    n && (a = /* @__PURE__ */ new Date(), a.setTime(a.getTime() + n)), s = window.location.hostname, s.indexOf(".") === -1 ? yf(t, r, a) : (i = s.split("."), o = i[i.length - 2] + "." + i[i.length - 1], yf(t, r, a, o));
  }
  static get(t) {
    for (var r = t + "=", n = document.cookie.split(";"), o = 0; o < n.length; o++) {
      var a = n[o];
      if (a = a.replace(/^\s+/, ""), a.lastIndexOf(r, 0) === 0) return a.substring(r.length, a.length);
    }
    return null;
  }
  static erase(t) {
    e.set(t, "", -1);
  }
};
function yf(e4, t, r, n) {
  document.cookie = `${e4}=${t}` + (r ? `;expires=${r.toUTCString()}` : "") + (n ? `;domain=${n}` : "") + ";path=/;SameSite=Lax";
}
function tv() {
  return Pd() ? localStorage : Pf() ? new Fa() : Xb() ? sessionStorage : new Yn();
}
var Fa = class e2 {
  getItem(t) {
    return xa.get(`${e2.prefix}${t}`);
  }
  removeItem(t) {
    xa.erase(`${e2.prefix}${t}`);
  }
  setItem(t, r, n) {
    xa.set(`${e2.prefix}${t}`, r, n);
  }
};
Fa.prefix = "coveo_";
var Ed = class {
  constructor() {
    this.cookieStorage = new Fa();
  }
  getItem(t) {
    return localStorage.getItem(t) || this.cookieStorage.getItem(t);
  }
  removeItem(t) {
    this.cookieStorage.removeItem(t), localStorage.removeItem(t);
  }
  setItem(t, r) {
    localStorage.setItem(t, r), this.cookieStorage.setItem(t, r, 31556926e3);
  }
};
var Yn = class {
  getItem(t) {
    return null;
  }
  removeItem(t) {
  }
  setItem(t, r) {
  }
};
var Aa = "__coveo.analytics.history";
var Ef = 20;
var Tf = 1e3 * 60;
var kf = 75;
var Kn = class {
  constructor(t) {
    this.store = t || tv();
  }
  addElement(t) {
    t.internalTime = (/* @__PURE__ */ new Date()).getTime(), t = this.cropQueryElement(this.stripEmptyQuery(t));
    let r = this.getHistoryWithInternalTime();
    r != null ? this.isValidEntry(t) && this.setHistory([t].concat(r)) : this.setHistory([t]);
  }
  addElementAsync(t) {
    return I(this, void 0, void 0, function* () {
      t.internalTime = (/* @__PURE__ */ new Date()).getTime(), t = this.cropQueryElement(this.stripEmptyQuery(t));
      let r = yield this.getHistoryWithInternalTimeAsync();
      r != null ? this.isValidEntry(t) && this.setHistory([t].concat(r)) : this.setHistory([t]);
    });
  }
  getHistory() {
    let t = this.getHistoryWithInternalTime();
    return this.stripEmptyQueries(this.stripInternalTime(t));
  }
  getHistoryAsync() {
    return I(this, void 0, void 0, function* () {
      let t = yield this.getHistoryWithInternalTimeAsync();
      return this.stripEmptyQueries(this.stripInternalTime(t));
    });
  }
  getHistoryWithInternalTime() {
    try {
      let t = this.store.getItem(Aa);
      return t && typeof t == "string" ? JSON.parse(t) : [];
    } catch {
      return [];
    }
  }
  getHistoryWithInternalTimeAsync() {
    return I(this, void 0, void 0, function* () {
      try {
        let t = yield this.store.getItem(Aa);
        return t ? JSON.parse(t) : [];
      } catch {
        return [];
      }
    });
  }
  setHistory(t) {
    try {
      this.store.setItem(Aa, JSON.stringify(t.slice(0, Ef)));
    } catch {
    }
  }
  clear() {
    try {
      this.store.removeItem(Aa);
    } catch {
    }
  }
  getMostRecentElement() {
    let t = this.getHistoryWithInternalTime();
    return Array.isArray(t) ? t.sort((n, o) => (o.internalTime || 0) - (n.internalTime || 0))[0] : null;
  }
  cropQueryElement(t) {
    return t.name && t.value && t.name.toLowerCase() === "query" && (t.value = t.value.slice(0, kf)), t;
  }
  isValidEntry(t) {
    let r = this.getMostRecentElement();
    return r && r.value == t.value ? (t.internalTime || 0) - (r.internalTime || 0) > Tf : true;
  }
  stripInternalTime(t) {
    return Array.isArray(t) ? t.map((r) => {
      let { name: n, time: o, value: a } = r;
      return { name: n, time: o, value: a };
    }) : [];
  }
  stripEmptyQuery(t) {
    let { name: r, time: n, value: o } = t;
    return r && typeof o == "string" && r.toLowerCase() === "query" && o.trim() === "" ? { name: r, time: n } : t;
  }
  stripEmptyQueries(t) {
    return t.map((r) => this.stripEmptyQuery(r));
  }
};
var Of = Object.freeze({ __proto__: null, HistoryStore: Kn, MAX_NUMBER_OF_HISTORY_ELEMENTS: Ef, MAX_VALUE_SIZE: kf, MIN_THRESHOLD_FOR_DUPLICATE_VALUE: Tf, STORE_KEY: Aa, default: Kn });
var rv = (e4, t) => I(void 0, void 0, void 0, function* () {
  return e4 === ee.view ? (yield nv(t.contentIdValue), Object.assign({ location: window.location.toString(), referrer: document.referrer, title: document.title }, t)) : t;
});
var nv = (e4) => I(void 0, void 0, void 0, function* () {
  let t = new Kn(), r = { name: "PageView", value: e4, time: (/* @__PURE__ */ new Date()).toISOString() };
  yield t.addElementAsync(r);
});
var Gi;
var ov = new Uint8Array(16);
function av() {
  if (!Gi && (Gi = typeof crypto < "u" && crypto.getRandomValues && crypto.getRandomValues.bind(crypto), !Gi)) throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
  return Gi(ov);
}
var iv = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
function Hi(e4) {
  return typeof e4 == "string" && iv.test(e4);
}
var we = [];
for (let e4 = 0; e4 < 256; ++e4) we.push((e4 + 256).toString(16).slice(1));
function qf(e4, t = 0) {
  return (we[e4[t + 0]] + we[e4[t + 1]] + we[e4[t + 2]] + we[e4[t + 3]] + "-" + we[e4[t + 4]] + we[e4[t + 5]] + "-" + we[e4[t + 6]] + we[e4[t + 7]] + "-" + we[e4[t + 8]] + we[e4[t + 9]] + "-" + we[e4[t + 10]] + we[e4[t + 11]] + we[e4[t + 12]] + we[e4[t + 13]] + we[e4[t + 14]] + we[e4[t + 15]]).toLowerCase();
}
function sv(e4) {
  if (!Hi(e4)) throw TypeError("Invalid UUID");
  let t, r = new Uint8Array(16);
  return r[0] = (t = parseInt(e4.slice(0, 8), 16)) >>> 24, r[1] = t >>> 16 & 255, r[2] = t >>> 8 & 255, r[3] = t & 255, r[4] = (t = parseInt(e4.slice(9, 13), 16)) >>> 8, r[5] = t & 255, r[6] = (t = parseInt(e4.slice(14, 18), 16)) >>> 8, r[7] = t & 255, r[8] = (t = parseInt(e4.slice(19, 23), 16)) >>> 8, r[9] = t & 255, r[10] = (t = parseInt(e4.slice(24, 36), 16)) / 1099511627776 & 255, r[11] = t / 4294967296 & 255, r[12] = t >>> 24 & 255, r[13] = t >>> 16 & 255, r[14] = t >>> 8 & 255, r[15] = t & 255, r;
}
function cv(e4) {
  e4 = unescape(encodeURIComponent(e4));
  let t = [];
  for (let r = 0; r < e4.length; ++r) t.push(e4.charCodeAt(r));
  return t;
}
var uv = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
var lv = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
function dv(e4, t, r) {
  function n(o, a, i, s) {
    var u;
    if (typeof o == "string" && (o = cv(o)), typeof a == "string" && (a = sv(a)), ((u = a) === null || u === void 0 ? void 0 : u.length) !== 16) throw TypeError("Namespace must be array-like (16 iterable integer values, 0-255)");
    let c = new Uint8Array(16 + o.length);
    if (c.set(a), c.set(o, a.length), c = r(c), c[6] = c[6] & 15 | t, c[8] = c[8] & 63 | 128, i) {
      s = s || 0;
      for (let d = 0; d < 16; ++d) i[s + d] = c[d];
      return i;
    }
    return qf(c);
  }
  try {
    n.name = e4;
  } catch {
  }
  return n.DNS = uv, n.URL = lv, n;
}
var pv = typeof crypto < "u" && crypto.randomUUID && crypto.randomUUID.bind(crypto);
var Sf = { randomUUID: pv };
function Rn(e4, t, r) {
  if (Sf.randomUUID && !t && !e4) return Sf.randomUUID();
  e4 = e4 || {};
  let n = e4.random || (e4.rng || av)();
  if (n[6] = n[6] & 15 | 64, n[8] = n[8] & 63 | 128, t) {
    r = r || 0;
    for (let o = 0; o < 16; ++o) t[r + o] = n[o];
    return t;
  }
  return qf(n);
}
function mv(e4, t, r, n) {
  switch (e4) {
    case 0:
      return t & r ^ ~t & n;
    case 1:
      return t ^ r ^ n;
    case 2:
      return t & r ^ t & n ^ r & n;
    case 3:
      return t ^ r ^ n;
  }
}
function Id(e4, t) {
  return e4 << t | e4 >>> 32 - t;
}
function gv(e4) {
  let t = [1518500249, 1859775393, 2400959708, 3395469782], r = [1732584193, 4023233417, 2562383102, 271733878, 3285377520];
  if (typeof e4 == "string") {
    let i = unescape(encodeURIComponent(e4));
    e4 = [];
    for (let s = 0; s < i.length; ++s) e4.push(i.charCodeAt(s));
  } else Array.isArray(e4) || (e4 = Array.prototype.slice.call(e4));
  e4.push(128);
  let n = e4.length / 4 + 2, o = Math.ceil(n / 16), a = new Array(o);
  for (let i = 0; i < o; ++i) {
    let s = new Uint32Array(16);
    for (let u = 0; u < 16; ++u) s[u] = e4[i * 64 + u * 4] << 24 | e4[i * 64 + u * 4 + 1] << 16 | e4[i * 64 + u * 4 + 2] << 8 | e4[i * 64 + u * 4 + 3];
    a[i] = s;
  }
  a[o - 1][14] = (e4.length - 1) * 8 / Math.pow(2, 32), a[o - 1][14] = Math.floor(a[o - 1][14]), a[o - 1][15] = (e4.length - 1) * 8 & 4294967295;
  for (let i = 0; i < o; ++i) {
    let s = new Uint32Array(80);
    for (let l = 0; l < 16; ++l) s[l] = a[i][l];
    for (let l = 16; l < 80; ++l) s[l] = Id(s[l - 3] ^ s[l - 8] ^ s[l - 14] ^ s[l - 16], 1);
    let u = r[0], c = r[1], d = r[2], m = r[3], p = r[4];
    for (let l = 0; l < 80; ++l) {
      let g = Math.floor(l / 20), A = Id(u, 5) + mv(g, c, d, m) + p + t[g] + s[l] >>> 0;
      p = m, m = d, d = Id(c, 30) >>> 0, c = u, u = A;
    }
    r[0] = r[0] + u >>> 0, r[1] = r[1] + c >>> 0, r[2] = r[2] + d >>> 0, r[3] = r[3] + m >>> 0, r[4] = r[4] + p >>> 0;
  }
  return [r[0] >> 24 & 255, r[0] >> 16 & 255, r[0] >> 8 & 255, r[0] & 255, r[1] >> 24 & 255, r[1] >> 16 & 255, r[1] >> 8 & 255, r[1] & 255, r[2] >> 24 & 255, r[2] >> 16 & 255, r[2] >> 8 & 255, r[2] & 255, r[3] >> 24 & 255, r[3] >> 16 & 255, r[3] >> 8 & 255, r[3] & 255, r[4] >> 24 & 255, r[4] >> 16 & 255, r[4] >> 8 & 255, r[4] & 255];
}
var fv = dv("v5", 80, gv);
var Cf = fv;
var Df = "2.30.38";
var Af = (e4) => `${e4.protocol}//${e4.hostname}${e4.pathname.indexOf("/") === 0 ? e4.pathname : `/${e4.pathname}`}${e4.search}`;
var Ra = { pageview: "pageview", event: "event" };
var Wi = class {
  constructor({ client: t, uuidGenerator: r = Rn }) {
    this.client = t, this.uuidGenerator = r;
  }
};
var Td = class extends Wi {
  constructor({ client: t, uuidGenerator: r = Rn }) {
    super({ client: t, uuidGenerator: r }), this.actionData = {}, this.pageViewId = r(), this.nextPageViewId = this.pageViewId, this.currentLocation = Af(window.location), this.lastReferrer = Hn() ? document.referrer : "", this.addHooks();
  }
  getApi(t) {
    switch (t) {
      case "setAction":
        return this.setAction;
      default:
        return null;
    }
  }
  setAction(t, r) {
    this.action = t, this.actionData = r;
  }
  clearData() {
    this.clearPluginData(), this.action = void 0, this.actionData = {};
  }
  getLocationInformation(t, r) {
    return Object.assign({ hitType: t }, this.getNextValues(t, r));
  }
  updateLocationInformation(t, r) {
    this.updateLocationForNextPageView(t, r);
  }
  getDefaultContextInformation(t) {
    let r = { title: Hn() ? document.title : "", encoding: Hn() ? document.characterSet : "UTF-8" }, n = { screenResolution: `${screen.width}x${screen.height}`, screenColor: `${screen.colorDepth}-bit` }, o = { language: navigator.language, userAgent: navigator.userAgent }, a = { time: Date.now(), eventId: this.uuidGenerator() };
    return Object.assign(Object.assign(Object.assign(Object.assign({}, a), n), o), r);
  }
  updateLocationForNextPageView(t, r) {
    let { pageViewId: n, referrer: o, location: a } = this.getNextValues(t, r);
    this.lastReferrer = o, this.pageViewId = n, this.currentLocation = a, t === Ra.pageview && (this.nextPageViewId = this.uuidGenerator(), this.hasSentFirstPageView = true);
  }
  getNextValues(t, r) {
    return { pageViewId: t === Ra.pageview ? this.nextPageViewId : this.pageViewId, referrer: t === Ra.pageview && this.hasSentFirstPageView ? this.currentLocation : this.lastReferrer, location: t === Ra.pageview ? this.getCurrentLocationFromPayload(r) : this.currentLocation };
  }
  getCurrentLocationFromPayload(t) {
    if (t.page) {
      let r = (o) => o.replace(/^\/?(.*)$/, "/$1");
      return `${((o) => o.split("/").slice(0, 3).join("/"))(this.currentLocation)}${r(t.page)}`;
    } else return Af(window.location);
  }
};
var Cr = class e3 {
  constructor(t, r) {
    if (!Hi(t)) throw Error("Not a valid uuid");
    this.clientId = t, this.creationDate = Math.floor(r / 1e3);
  }
  toString() {
    return this.clientId.replace(/-/g, "") + "." + this.creationDate.toString();
  }
  get expired() {
    let t = Math.floor(Date.now() / 1e3) - this.creationDate;
    return t < 0 || t > e3.expirationTime;
  }
  validate(t, r) {
    return !this.expired && this.matchReferrer(t, r);
  }
  matchReferrer(t, r) {
    try {
      let n = new URL(t);
      return r.some((o) => new RegExp(o.replace(/\\/g, "\\\\").replace(/\./g, "\\.").replace(/\*/g, ".*") + "$").test(n.host));
    } catch {
      return false;
    }
  }
  static fromString(t) {
    let r = t.split(".");
    if (r.length !== 2) return null;
    let [n, o] = r;
    if (n.length !== 32 || isNaN(parseInt(o))) return null;
    let a = n.substring(0, 8) + "-" + n.substring(8, 12) + "-" + n.substring(12, 16) + "-" + n.substring(16, 20) + "-" + n.substring(20, 32);
    return Hi(a) ? new e3(a, Number.parseInt(o) * 1e3) : null;
  }
};
Cr.cvo_cid = "cvo_cid";
Cr.expirationTime = 120;
var kd = class extends Wi {
  constructor({ client: t, uuidGenerator: r = Rn }) {
    super({ client: t, uuidGenerator: r });
  }
  getApi(t) {
    switch (t) {
      case "decorate":
        return this.decorate;
      case "acceptFrom":
        return this.acceptFrom;
      default:
        return null;
    }
  }
  decorate(t) {
    return I(this, void 0, void 0, function* () {
      if (!this.client.getCurrentVisitorId) throw new Error("Could not retrieve current clientId");
      try {
        let r = new URL(t), n = yield this.client.getCurrentVisitorId();
        return r.searchParams.set(Cr.cvo_cid, new Cr(n, Date.now()).toString()), r.toString();
      } catch {
        throw new Error("Invalid URL provided");
      }
    });
  }
  acceptFrom(t) {
    this.client.setAcceptedLinkReferrers(t);
  }
};
kd.Id = "link";
var at = Object.keys;
function zi(e4) {
  return e4 !== null && typeof e4 == "object" && !Array.isArray(e4);
}
var wd = 128;
var Vf = 192;
var Rf = 224;
var xf = 240;
function hv(e4) {
  return (e4 & 248) === xf ? 4 : (e4 & xf) === Rf ? 3 : (e4 & Rf) === Vf ? 2 : 1;
}
function yv(e4, t) {
  if (t < 0 || e4.length <= t) return e4;
  let r = e4.indexOf("%", t - 2);
  for (r < 0 || r > t ? r = t : t = r; r > 2 && e4.charAt(r - 3) == "%"; ) {
    let n = Number.parseInt(e4.substring(r - 2, r), 16);
    if ((n & wd) != wd) break;
    if (r -= 3, (n & Vf) != wd) {
      t - r >= hv(n) * 3 && (r = t);
      break;
    }
  }
  return e4.substring(0, r);
}
var Od = { id: "svc_ticket_id", subject: "svc_ticket_subject", description: "svc_ticket_description", category: "svc_ticket_category", productId: "svc_ticket_product_id", custom: "svc_ticket_custom" };
var Sv = at(Od).map((e4) => Od[e4]);
var Cv = [...Sv].join("|");
var Av = new RegExp(`^(${Cv}$)`);
var Rv = { svcAction: "svc_action", svcActionData: "svc_action_data" };
var xv = (e4) => at(e4).filter((t) => e4[t] !== void 0).reduce((t, r) => {
  let n = Od[r] || r;
  return Object.assign(Object.assign({}, t), { [n]: e4[r] });
}, {});
var Fv = (e4) => Av.test(e4);
var bv = [Fv];
var Ff = { id: "id", name: "nm", brand: "br", category: "ca", variant: "va", price: "pr", quantity: "qt", coupon: "cc", position: "ps", group: "group" };
var bf = { id: "id", name: "nm", brand: "br", category: "ca", variant: "va", position: "ps", price: "pr", group: "group" };
var Te = { action: "pa", list: "pal", listSource: "pls" };
var Yi = { id: "ti", revenue: "tr", tax: "tt", shipping: "ts", coupon: "tcc", affiliation: "ta", step: "cos", option: "col" };
var vv = ["loyaltyCardId", "loyaltyTier", "thirdPartyPersona", "companyName", "favoriteStore", "storeName", "userIndustry", "userRole", "userDepartment", "businessUnit"];
var qd = { id: "quoteId", affiliation: "quoteAffiliation" };
var Dd = { id: "reviewId", rating: "reviewRating", comment: "reviewComment" };
var Iv = { add: Te, bookmark_add: Te, bookmark_remove: Te, click: Te, checkout: Te, checkout_option: Te, detail: Te, impression: Te, remove: Te, refund: Object.assign(Object.assign({}, Te), Yi), purchase: Object.assign(Object.assign({}, Te), Yi), quickview: Te, quote: Object.assign(Object.assign({}, Te), qd), review: Object.assign(Object.assign({}, Te), Dd) };
var wv = at(Ff).map((e4) => Ff[e4]);
var Pv = at(bf).map((e4) => bf[e4]);
var Ev = at(Te).map((e4) => Te[e4]);
var Tv = at(Yi).map((e4) => Yi[e4]);
var kv = at(Dd).map((e4) => Dd[e4]);
var Ov = at(qd).map((e4) => qd[e4]);
var qv = [...wv, "custom"].join("|");
var Dv = [...Pv, "custom"].join("|");
var Nf = "(pr[0-9]+)";
var Mf = "(il[0-9]+pi[0-9]+)";
var Vv = new RegExp(`^${Nf}(${qv})$`);
var Nv = new RegExp(`^(${Mf}(${Dv}))|(il[0-9]+nm)$`);
var Mv = new RegExp(`^(${Ev.join("|")})$`);
var Qv = new RegExp(`^(${Tv.join("|")})$`);
var Lv = new RegExp(`^${Nf}custom$`);
var Bv = new RegExp(`^${Mf}custom$`);
var Uv = new RegExp(`^(${[...vv, ...kv, ...Ov].join("|")})$`);
var _v = (e4) => Vv.test(e4);
var jv = (e4) => Nv.test(e4);
var $v = (e4) => Mv.test(e4);
var Gv = (e4) => Qv.test(e4);
var zv = (e4) => Uv.test(e4);
var Hv = [jv, _v, $v, Gv, zv];
var Wv = [Lv, Bv];
var Yv = { anonymizeIp: "aip" };
var Kv = { eventCategory: "ec", eventAction: "ea", eventLabel: "el", eventValue: "ev", page: "dp", visitorId: "cid", clientId: "cid", userId: "uid", currencyCode: "cu" };
var Jv = { hitType: "t", pageViewId: "pid", encoding: "de", location: "dl", referrer: "dr", screenColor: "sd", screenResolution: "sr", title: "dt", userAgent: "ua", language: "ul", eventId: "z", time: "tm" };
var Xv = ["contentId", "contentIdKey", "contentType", "searchHub", "tab", "searchUid", "permanentId", "contentLocale", "trackingId"];
var Zv = Object.assign(Object.assign(Object.assign(Object.assign({}, Yv), Kv), Jv), Xv.reduce((e4, t) => Object.assign(Object.assign({}, e4), { [t]: t }), {}));
var Vd = Object.assign(Object.assign({}, Zv), Rv);
var eI = (e4) => {
  let t = !!e4.action && Iv[e4.action] || {};
  return at(e4).reduce((r, n) => {
    let o = t[n] || Vd[n] || n;
    return Object.assign(Object.assign({}, r), { [o]: e4[n] });
  }, {});
};
var tI = at(Vd).map((e4) => Vd[e4]);
var rI = (e4) => tI.indexOf(e4) !== -1;
var nI = (e4) => e4 === "custom";
var oI = (e4) => [...Hv, ...bv, rI, nI].some((t) => t(e4));
var aI = (e4) => at(e4).reduce((t, r) => {
  let n = iI(r);
  return n ? Object.assign(Object.assign({}, t), sI(n, e4[r])) : Object.assign(Object.assign({}, t), { [r]: e4[r] });
}, {});
var iI = (e4) => {
  let t;
  return [...Wv].every((r) => {
    var n;
    return t = (n = r.exec(e4)) === null || n === void 0 ? void 0 : n[1], !t;
  }), t;
};
var sI = (e4, t) => at(t).reduce((r, n) => Object.assign(Object.assign({}, r), { [`${e4}${n}`]: t[n] }), {});
var Nd = class {
  constructor(t) {
    this.opts = t;
  }
  sendEvent(t, r) {
    return I(this, void 0, void 0, function* () {
      if (!this.isAvailable()) throw new Error('navigator.sendBeacon is not supported in this browser. Consider adding a polyfill like "sendbeacon-polyfill".');
      let { baseUrl: n, preprocessRequest: o } = this.opts, a = yield this.getQueryParamsForEventType(t), { url: i, payload: s } = yield this.preProcessRequestAsPotentialJSONString(`${n}/analytics/${t}?${a}`, r, o), u = this.encodeForEventType(t, s), c = new Blob([u], { type: "application/x-www-form-urlencoded" });
      navigator.sendBeacon(i, c);
    });
  }
  isAvailable() {
    return "sendBeacon" in navigator;
  }
  deleteHttpCookieVisitorId() {
    return Promise.resolve();
  }
  preProcessRequestAsPotentialJSONString(t, r, n) {
    return I(this, void 0, void 0, function* () {
      let o = t, a = r;
      if (n) {
        let i = yield n({ url: t, body: JSON.stringify(r) }, "analyticsBeacon"), { url: s, body: u } = i;
        o = s || t;
        try {
          a = JSON.parse(u);
        } catch (c) {
          console.error("Unable to process the request body as a JSON string", c);
        }
      }
      return { payload: a, url: o };
    });
  }
  encodeForEventType(t, r) {
    return this.isEventTypeLegacy(t) ? this.encodeEventToJson(t, r) : this.encodeEventToJson(t, r, this.opts.token);
  }
  getQueryParamsForEventType(t) {
    return I(this, void 0, void 0, function* () {
      let { token: r, visitorIdProvider: n } = this.opts, o = yield n.getCurrentVisitorId();
      return [r && this.isEventTypeLegacy(t) ? `access_token=${r}` : "", o ? `visitorId=${o}` : "", "discardVisitInfo=true"].filter((a) => !!a).join("&");
    });
  }
  isEventTypeLegacy(t) {
    return [ee.click, ee.custom, ee.search, ee.view].indexOf(t) !== -1;
  }
  encodeEventToJson(t, r, n) {
    let o = `${t}Event=${encodeURIComponent(JSON.stringify(r))}`;
    return n && (o = `access_token=${encodeURIComponent(n)}&${o}`), o;
  }
};
var Md = class {
  sendEvent(t, r) {
    return I(this, void 0, void 0, function* () {
      return Promise.resolve();
    });
  }
  deleteHttpCookieVisitorId() {
    return I(this, void 0, void 0, function* () {
      return Promise.resolve();
    });
  }
};
var Ki = class {
  constructor(t) {
    this.opts = t;
  }
  sendEvent(t, r) {
    return I(this, void 0, void 0, function* () {
      let { baseUrl: n, visitorIdProvider: o, preprocessRequest: a } = this.opts, i = this.shouldAppendVisitorId(t) ? yield this.getVisitorIdParam() : "", s = { url: `${n}/analytics/${t}${i}`, credentials: "include", mode: "cors", headers: this.getHeaders(), method: "POST", body: JSON.stringify(r) }, u = Object.assign(Object.assign({}, s), a ? yield a(s, "analyticsFetch") : {}), { url: c } = u, d = Tt(u, ["url"]), m;
      try {
        m = yield fetch(c, d);
      } catch (p) {
        console.error("An error has occured when sending the event.", p);
        return;
      }
      if (m.ok) {
        let p = yield m.json();
        return p.visitorId && o.setCurrentVisitorId(p.visitorId), p;
      } else {
        try {
          m.json();
        } catch {
        }
        throw console.error(`An error has occured when sending the "${t}" event.`, m, r), new Error(`An error has occurred when sending the "${t}" event. Check the console logs for more details.`);
      }
    });
  }
  deleteHttpCookieVisitorId() {
    return I(this, void 0, void 0, function* () {
      let { baseUrl: t } = this.opts, r = `${t}/analytics/visit`;
      yield fetch(r, { headers: this.getHeaders(), method: "DELETE" });
    });
  }
  shouldAppendVisitorId(t) {
    return [ee.click, ee.custom, ee.search, ee.view].indexOf(t) !== -1;
  }
  getVisitorIdParam() {
    return I(this, void 0, void 0, function* () {
      let { visitorIdProvider: t } = this.opts, r = yield t.getCurrentVisitorId();
      return r ? `?visitor=${r}` : "";
    });
  }
  getHeaders() {
    let { token: t } = this.opts;
    return Object.assign(Object.assign({}, t ? { Authorization: `Bearer ${t}` } : {}), { "Content-Type": "application/json" });
  }
};
var Qd = class {
  constructor(t, r) {
    Pd() && Pf() ? this.storage = new Ed() : Pd() ? this.storage = localStorage : (console.warn("BrowserRuntime detected no valid storage available.", this), this.storage = new Yn()), this.client = new Ki(t), this.beaconClient = new Nd(t), window.addEventListener("beforeunload", () => {
      let n = r();
      for (let { eventType: o, payload: a } of n) this.beaconClient.sendEvent(o, a);
    });
  }
  getClientDependingOnEventType(t) {
    return t === "click" && this.beaconClient.isAvailable() ? this.beaconClient : this.client;
  }
};
var Ld = class {
  constructor(t, r) {
    this.storage = r || new Yn(), this.client = new Ki(t);
  }
  getClientDependingOnEventType(t) {
    return this.client;
  }
};
var Ji = class {
  constructor() {
    this.storage = new Yn(), this.client = new Md();
  }
  getClientDependingOnEventType(t) {
    return this.client;
  }
};
var cI = "xx";
var uI = (e4) => e4?.startsWith(cI) || false;
var lI = `
        We've detected you're using React Native but have not provided the corresponding runtime, 
        for an optimal experience please use the "coveo.analytics/react-native" subpackage.
        Follow the Readme on how to set it up: https://github.com/coveo/coveo.analytics.js#using-react-native
    `;
function dI() {
  return typeof navigator < "u" && navigator.product == "ReactNative";
}
var pI = ["1", 1, "yes", true];
function ba() {
  return Ud() && [navigator.globalPrivacyControl, navigator.doNotTrack, navigator.msDoNotTrack, window.doNotTrack].some((e4) => pI.indexOf(e4) !== -1);
}
var Qf = "v15";
var Lf = { default: "https://analytics.cloud.coveo.com/rest/ua", production: "https://analytics.cloud.coveo.com/rest/ua", hipaa: "https://analyticshipaa.cloud.coveo.com/rest/ua" };
function mI(e4 = Lf.default, t = Qf, r = false) {
  if (e4 = e4.replace(/\/$/, ""), r) return `${e4}/${t}`;
  let n = e4.endsWith("/rest") || e4.endsWith("/rest/ua");
  return `${e4}${n ? "" : "/rest"}/${t}`;
}
var gI = "38824e1f-37f5-42d3-8372-a4b8fa9df946";
var ot = class {
  get defaultOptions() {
    return { endpoint: Lf.default, isCustomEndpoint: false, token: "", version: Qf, beforeSendHooks: [], afterSendHooks: [] };
  }
  get version() {
    return Df;
  }
  constructor(t) {
    if (this.acceptedLinkReferrers = [], !t) throw new Error("You have to pass options to this constructor");
    this.options = Object.assign(Object.assign({}, this.defaultOptions), t), this.visitorId = "", this.bufferedRequests = [], this.beforeSendHooks = [rv, ev].concat(this.options.beforeSendHooks), this.afterSendHooks = this.options.afterSendHooks, this.eventTypeMapping = {};
    let r = { baseUrl: this.baseUrl, token: this.options.token, visitorIdProvider: this, preprocessRequest: this.options.preprocessRequest };
    ba() ? this.runtime = new Ji() : this.runtime = this.options.runtimeEnvironment || this.initRuntime(r), this.addEventTypeMapping(ee.view, { newEventType: ee.view, addClientIdParameter: true }), this.addEventTypeMapping(ee.click, { newEventType: ee.click, addClientIdParameter: true }), this.addEventTypeMapping(ee.custom, { newEventType: ee.custom, addClientIdParameter: true }), this.addEventTypeMapping(ee.search, { newEventType: ee.search, addClientIdParameter: true });
  }
  initRuntime(t) {
    return hf() && Hn() ? new Qd(t, () => {
      let r = [...this.bufferedRequests];
      return this.bufferedRequests = [], r;
    }) : (dI() && console.warn(lI), new Ld(t));
  }
  get storage() {
    return this.runtime.storage;
  }
  determineVisitorId() {
    return I(this, void 0, void 0, function* () {
      try {
        return hf() && this.extractClientIdFromLink(window.location.href) || (yield this.storage.getItem("visitorId")) || Rn();
      } catch (t) {
        return console.log("Could not get visitor ID from the current runtime environment storage. Using a random ID instead.", t), Rn();
      }
    });
  }
  getCurrentVisitorId() {
    return I(this, void 0, void 0, function* () {
      if (!this.visitorId) {
        let t = yield this.determineVisitorId();
        yield this.setCurrentVisitorId(t);
      }
      return this.visitorId;
    });
  }
  setCurrentVisitorId(t) {
    return I(this, void 0, void 0, function* () {
      this.visitorId = t, yield this.storage.setItem("visitorId", t);
    });
  }
  setClientId(t, r) {
    return I(this, void 0, void 0, function* () {
      if (Hi(t)) this.setCurrentVisitorId(t.toLowerCase());
      else {
        if (!r) throw Error("Cannot generate uuid client id without a specific namespace string.");
        this.setCurrentVisitorId(Cf(t, Cf(r, gI)));
      }
    });
  }
  getParameters(t, ...r) {
    return I(this, void 0, void 0, function* () {
      return yield this.resolveParameters(t, ...r);
    });
  }
  getPayload(t, ...r) {
    return I(this, void 0, void 0, function* () {
      let n = yield this.resolveParameters(t, ...r);
      return yield this.resolvePayloadForParameters(t, n);
    });
  }
  get currentVisitorId() {
    return typeof (this.visitorId || this.storage.getItem("visitorId")) != "string" && this.setCurrentVisitorId(Rn()), this.visitorId;
  }
  set currentVisitorId(t) {
    this.visitorId = t, this.storage.setItem("visitorId", t);
  }
  extractClientIdFromLink(t) {
    if (ba()) return null;
    try {
      let r = new URL(t).searchParams.get(Cr.cvo_cid);
      if (r == null) return null;
      let n = Cr.fromString(r);
      return !n || !Hn() || !n.validate(document.referrer, this.acceptedLinkReferrers) ? null : n.clientId;
    } catch {
    }
    return null;
  }
  resolveParameters(t, ...r) {
    return I(this, void 0, void 0, function* () {
      let { variableLengthArgumentsNames: n = [], addVisitorIdParameter: o = false, usesMeasurementProtocol: a = false, addClientIdParameter: i = false } = this.eventTypeMapping[t] || {};
      return yield [(l) => n.length > 0 ? this.parseVariableArgumentsPayload(n, l) : l[0], (l) => I(this, void 0, void 0, function* () {
        return Object.assign(Object.assign({}, l), { visitorId: o ? yield this.getCurrentVisitorId() : "" });
      }), (l) => I(this, void 0, void 0, function* () {
        return i ? Object.assign(Object.assign({}, l), { clientId: yield this.getCurrentVisitorId() }) : l;
      }), (l) => a ? this.ensureAnonymousUserWhenUsingApiKey(l) : l, (l) => this.beforeSendHooks.reduce((g, A) => I(this, void 0, void 0, function* () {
        let y = yield g;
        return yield A(t, y);
      }), l)].reduce((l, g) => I(this, void 0, void 0, function* () {
        let A = yield l;
        return yield g(A);
      }), Promise.resolve(r));
    });
  }
  resolvePayloadForParameters(t, r) {
    return I(this, void 0, void 0, function* () {
      let { usesMeasurementProtocol: n = false } = this.eventTypeMapping[t] || {};
      return yield [(m) => this.setTrackingIdIfTrackingIdNotPresent(m), (m) => this.removeEmptyPayloadValues(m, t), (m) => this.validateParams(m, t), (m) => n ? eI(m) : m, (m) => n ? this.removeUnknownParameters(m) : m, (m) => n ? this.processCustomParameters(m) : this.mapCustomParametersToCustomData(m)].reduce((m, p) => I(this, void 0, void 0, function* () {
        let l = yield m;
        return yield p(l);
      }), Promise.resolve(r));
    });
  }
  makeEvent(t, ...r) {
    return I(this, void 0, void 0, function* () {
      let { newEventType: n = t } = this.eventTypeMapping[t] || {}, o = yield this.resolveParameters(t, ...r), a = yield this.resolvePayloadForParameters(t, o);
      return { eventType: n, payload: a, log: (i) => I(this, void 0, void 0, function* () {
        return this.bufferedRequests.push({ eventType: n, payload: Object.assign(Object.assign({}, a), i) }), yield Promise.all(this.afterSendHooks.map((s) => s(t, Object.assign(Object.assign({}, o), i)))), yield this.deferExecution(), yield this.sendFromBuffer();
      }) };
    });
  }
  sendEvent(t, ...r) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeEvent(t, ...r)).log({});
    });
  }
  deferExecution() {
    return new Promise((t) => setTimeout(t, 0));
  }
  sendFromBuffer() {
    return I(this, void 0, void 0, function* () {
      let t = this.bufferedRequests.shift();
      if (t) {
        let { eventType: r, payload: n } = t;
        return this.runtime.getClientDependingOnEventType(r).sendEvent(r, n);
      }
    });
  }
  clear() {
    this.storage.removeItem("visitorId"), new Kn().clear();
  }
  deleteHttpOnlyVisitorId() {
    this.runtime.client.deleteHttpCookieVisitorId();
  }
  makeSearchEvent(t) {
    return I(this, void 0, void 0, function* () {
      return this.makeEvent(ee.search, t);
    });
  }
  sendSearchEvent(t) {
    var { searchQueryUid: r } = t, n = Tt(t, ["searchQueryUid"]);
    return I(this, void 0, void 0, function* () {
      return (yield this.makeSearchEvent(n)).log({ searchQueryUid: r });
    });
  }
  makeClickEvent(t) {
    return I(this, void 0, void 0, function* () {
      return this.makeEvent(ee.click, t);
    });
  }
  sendClickEvent(t) {
    var { searchQueryUid: r } = t, n = Tt(t, ["searchQueryUid"]);
    return I(this, void 0, void 0, function* () {
      return (yield this.makeClickEvent(n)).log({ searchQueryUid: r });
    });
  }
  makeCustomEvent(t) {
    return I(this, void 0, void 0, function* () {
      return this.makeEvent(ee.custom, t);
    });
  }
  sendCustomEvent(t) {
    var { lastSearchQueryUid: r } = t, n = Tt(t, ["lastSearchQueryUid"]);
    return I(this, void 0, void 0, function* () {
      return (yield this.makeCustomEvent(n)).log({ lastSearchQueryUid: r });
    });
  }
  makeViewEvent(t) {
    return I(this, void 0, void 0, function* () {
      return this.makeEvent(ee.view, t);
    });
  }
  sendViewEvent(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeViewEvent(t)).log({});
    });
  }
  getVisit() {
    return I(this, void 0, void 0, function* () {
      let r = yield (yield fetch(`${this.baseUrl}/analytics/visit`)).json();
      return this.visitorId = r.visitorId, r;
    });
  }
  getHealth() {
    return I(this, void 0, void 0, function* () {
      return yield (yield fetch(`${this.baseUrl}/analytics/monitoring/health`)).json();
    });
  }
  registerBeforeSendEventHook(t) {
    this.beforeSendHooks.push(t);
  }
  registerAfterSendEventHook(t) {
    this.afterSendHooks.push(t);
  }
  addEventTypeMapping(t, r) {
    this.eventTypeMapping[t] = r;
  }
  setAcceptedLinkReferrers(t) {
    if (Array.isArray(t) && t.every((r) => typeof r == "string")) this.acceptedLinkReferrers = t;
    else throw Error("Parameter should be an array of domain strings");
  }
  parseVariableArgumentsPayload(t, r) {
    let n = {};
    for (let o = 0, a = r.length; o < a; o++) {
      let i = r[o];
      if (typeof i == "string") n[t[o]] = i;
      else if (typeof i == "object") return Object.assign(Object.assign({}, n), i);
    }
    return n;
  }
  isKeyAllowedEmpty(t, r) {
    return ({ [ee.search]: ["queryText"] }[t] || []).indexOf(r) !== -1;
  }
  removeEmptyPayloadValues(t, r) {
    let n = (o) => typeof o < "u" && o !== null && o !== "";
    return Object.keys(t).filter((o) => this.isKeyAllowedEmpty(r, o) || n(t[o])).reduce((o, a) => Object.assign(Object.assign({}, o), { [a]: t[a] }), {});
  }
  removeUnknownParameters(t) {
    return Object.keys(t).filter((n) => {
      if (oI(n)) return true;
      console.log(n, "is not processed by coveoua");
    }).reduce((n, o) => Object.assign(Object.assign({}, n), { [o]: t[o] }), {});
  }
  processCustomParameters(t) {
    let { custom: r } = t, n = Tt(t, ["custom"]), o = {};
    r && zi(r) && (o = this.lowercaseKeys(r));
    let a = aI(n);
    return Object.assign(Object.assign({}, o), a);
  }
  mapCustomParametersToCustomData(t) {
    let { custom: r } = t, n = Tt(t, ["custom"]);
    if (r && zi(r)) {
      let o = this.lowercaseKeys(r);
      return Object.assign(Object.assign({}, n), { customData: Object.assign(Object.assign({}, o), t.customData) });
    } else return t;
  }
  lowercaseKeys(t) {
    let r = Object.keys(t), n = {};
    return r.forEach((o) => {
      n[o.toLowerCase()] = t[o];
    }), n;
  }
  validateParams(t, r) {
    let { anonymizeIp: n } = t, o = Tt(t, ["anonymizeIp"]);
    return n !== void 0 && ["0", "false", "undefined", "null", "{}", "[]", ""].indexOf(`${n}`.toLowerCase()) == -1 && (o.anonymizeIp = 1), (r == ee.view || r == ee.click || r == ee.search || r == ee.custom) && (o.originLevel3 = this.limit(o.originLevel3, 1024)), r == ee.view && (o.location = this.limit(o.location, 1024)), (r == "pageview" || r == "event") && (o.referrer = this.limit(o.referrer, 2048), o.location = this.limit(o.location, 2048), o.page = this.limit(o.page, 2048)), o;
  }
  ensureAnonymousUserWhenUsingApiKey(t) {
    let { userId: r } = t, n = Tt(t, ["userId"]);
    return uI(this.options.token) && !r ? (n.userId = "anonymous", n) : t;
  }
  setTrackingIdIfTrackingIdNotPresent(t) {
    let { trackingId: r } = t, n = Tt(t, ["trackingId"]);
    return r ? t : (n.hasOwnProperty("custom") && zi(n.custom) && (n.custom.hasOwnProperty("context_website") || n.custom.hasOwnProperty("siteName")) && (n.trackingId = n.custom.context_website || n.custom.siteName), n.hasOwnProperty("customData") && zi(n.customData) && (n.customData.hasOwnProperty("context_website") || n.customData.hasOwnProperty("siteName")) && (n.trackingId = n.customData.context_website || n.customData.siteName), n);
  }
  limit(t, r) {
    return typeof t == "string" ? yv(t, r) : t;
  }
  get baseUrl() {
    return mI(this.options.endpoint, this.options.version, this.options.isCustomEndpoint);
  }
};
var Pe;
(function(e4) {
  e4.contextChanged = "contextChanged", e4.expandToFullUI = "expandToFullUI", e4.openUserActions = "openUserActions", e4.showPrecedingSessions = "showPrecedingSessions", e4.showFollowingSessions = "showFollowingSessions", e4.clickViewedDocument = "clickViewedDocument", e4.clickPageView = "clickPageView", e4.createArticle = "createArticle";
})(Pe || (Pe = {}));
var F;
(function(e4) {
  e4.interfaceLoad = "interfaceLoad", e4.interfaceChange = "interfaceChange", e4.didyoumeanAutomatic = "didyoumeanAutomatic", e4.didyoumeanClick = "didyoumeanClick", e4.resultsSort = "resultsSort", e4.searchboxSubmit = "searchboxSubmit", e4.searchboxClear = "searchboxClear", e4.searchboxAsYouType = "searchboxAsYouType", e4.breadcrumbFacet = "breadcrumbFacet", e4.breadcrumbResetAll = "breadcrumbResetAll", e4.documentQuickview = "documentQuickview", e4.documentOpen = "documentOpen", e4.omniboxAnalytics = "omniboxAnalytics", e4.omniboxFromLink = "omniboxFromLink", e4.searchFromLink = "searchFromLink", e4.triggerNotify = "notify", e4.triggerExecute = "execute", e4.triggerQuery = "query", e4.undoTriggerQuery = "undoQuery", e4.triggerRedirect = "redirect", e4.pagerResize = "pagerResize", e4.pagerNumber = "pagerNumber", e4.pagerNext = "pagerNext", e4.pagerPrevious = "pagerPrevious", e4.pagerScrolling = "pagerScrolling", e4.staticFilterClearAll = "staticFilterClearAll", e4.staticFilterSelect = "staticFilterSelect", e4.staticFilterDeselect = "staticFilterDeselect", e4.facetClearAll = "facetClearAll", e4.facetSearch = "facetSearch", e4.facetSelect = "facetSelect", e4.facetSelectAll = "facetSelectAll", e4.facetDeselect = "facetDeselect", e4.facetExclude = "facetExclude", e4.facetUnexclude = "facetUnexclude", e4.facetUpdateSort = "facetUpdateSort", e4.facetShowMore = "showMoreFacetResults", e4.facetShowLess = "showLessFacetResults", e4.queryError = "query", e4.queryErrorBack = "errorBack", e4.queryErrorClear = "errorClearQuery", e4.queryErrorRetry = "errorRetry", e4.recommendation = "recommendation", e4.recommendationInterfaceLoad = "recommendationInterfaceLoad", e4.recommendationOpen = "recommendationOpen", e4.likeSmartSnippet = "likeSmartSnippet", e4.dislikeSmartSnippet = "dislikeSmartSnippet", e4.expandSmartSnippet = "expandSmartSnippet", e4.collapseSmartSnippet = "collapseSmartSnippet", e4.openSmartSnippetFeedbackModal = "openSmartSnippetFeedbackModal", e4.closeSmartSnippetFeedbackModal = "closeSmartSnippetFeedbackModal", e4.sendSmartSnippetReason = "sendSmartSnippetReason", e4.expandSmartSnippetSuggestion = "expandSmartSnippetSuggestion", e4.collapseSmartSnippetSuggestion = "collapseSmartSnippetSuggestion", e4.showMoreSmartSnippetSuggestion = "showMoreSmartSnippetSuggestion", e4.showLessSmartSnippetSuggestion = "showLessSmartSnippetSuggestion", e4.openSmartSnippetSource = "openSmartSnippetSource", e4.openSmartSnippetSuggestionSource = "openSmartSnippetSuggestionSource", e4.openSmartSnippetInlineLink = "openSmartSnippetInlineLink", e4.openSmartSnippetSuggestionInlineLink = "openSmartSnippetSuggestionInlineLink", e4.recentQueryClick = "recentQueriesClick", e4.clearRecentQueries = "clearRecentQueries", e4.recentResultClick = "recentResultClick", e4.clearRecentResults = "clearRecentResults", e4.noResultsBack = "noResultsBack", e4.showMoreFoldedResults = "showMoreFoldedResults", e4.showLessFoldedResults = "showLessFoldedResults", e4.copyToClipboard = "copyToClipboard", e4.caseSendEmail = "Case.SendEmail", e4.feedItemTextPost = "FeedItem.TextPost", e4.caseAttach = "caseAttach", e4.caseDetach = "caseDetach", e4.retryGeneratedAnswer = "retryGeneratedAnswer", e4.likeGeneratedAnswer = "likeGeneratedAnswer", e4.dislikeGeneratedAnswer = "dislikeGeneratedAnswer", e4.openGeneratedAnswerSource = "openGeneratedAnswerSource", e4.generatedAnswerStreamEnd = "generatedAnswerStreamEnd", e4.generatedAnswerSourceHover = "generatedAnswerSourceHover", e4.generatedAnswerCopyToClipboard = "generatedAnswerCopyToClipboard", e4.generatedAnswerHideAnswers = "generatedAnswerHideAnswers", e4.generatedAnswerShowAnswers = "generatedAnswerShowAnswers", e4.generatedAnswerExpand = "generatedAnswerExpand", e4.generatedAnswerCollapse = "generatedAnswerCollapse", e4.generatedAnswerFeedbackSubmit = "generatedAnswerFeedbackSubmit", e4.rephraseGeneratedAnswer = "rephraseGeneratedAnswer", e4.generatedAnswerFeedbackSubmitV2 = "generatedAnswerFeedbackSubmitV2";
})(F || (F = {}));
var Bd = { [F.triggerNotify]: "queryPipelineTriggers", [F.triggerExecute]: "queryPipelineTriggers", [F.triggerQuery]: "queryPipelineTriggers", [F.triggerRedirect]: "queryPipelineTriggers", [F.queryError]: "errors", [F.queryErrorBack]: "errors", [F.queryErrorClear]: "errors", [F.queryErrorRetry]: "errors", [F.pagerNext]: "getMoreResults", [F.pagerPrevious]: "getMoreResults", [F.pagerNumber]: "getMoreResults", [F.pagerResize]: "getMoreResults", [F.pagerScrolling]: "getMoreResults", [F.facetSearch]: "facet", [F.facetShowLess]: "facet", [F.facetShowMore]: "facet", [F.recommendation]: "recommendation", [F.likeSmartSnippet]: "smartSnippet", [F.dislikeSmartSnippet]: "smartSnippet", [F.expandSmartSnippet]: "smartSnippet", [F.collapseSmartSnippet]: "smartSnippet", [F.openSmartSnippetFeedbackModal]: "smartSnippet", [F.closeSmartSnippetFeedbackModal]: "smartSnippet", [F.sendSmartSnippetReason]: "smartSnippet", [F.expandSmartSnippetSuggestion]: "smartSnippetSuggestions", [F.collapseSmartSnippetSuggestion]: "smartSnippetSuggestions", [F.showMoreSmartSnippetSuggestion]: "smartSnippetSuggestions", [F.showLessSmartSnippetSuggestion]: "smartSnippetSuggestions", [F.clearRecentQueries]: "recentQueries", [F.recentResultClick]: "recentlyClickedDocuments", [F.clearRecentResults]: "recentlyClickedDocuments", [F.showLessFoldedResults]: "folding", [F.caseDetach]: "case", [F.likeGeneratedAnswer]: "generatedAnswer", [F.dislikeGeneratedAnswer]: "generatedAnswer", [F.openGeneratedAnswerSource]: "generatedAnswer", [F.generatedAnswerStreamEnd]: "generatedAnswer", [F.generatedAnswerSourceHover]: "generatedAnswer", [F.generatedAnswerCopyToClipboard]: "generatedAnswer", [F.generatedAnswerHideAnswers]: "generatedAnswer", [F.generatedAnswerShowAnswers]: "generatedAnswer", [F.generatedAnswerExpand]: "generatedAnswer", [F.generatedAnswerCollapse]: "generatedAnswer", [F.generatedAnswerFeedbackSubmit]: "generatedAnswer", [F.generatedAnswerFeedbackSubmitV2]: "generatedAnswer", [Pe.expandToFullUI]: "interface", [Pe.openUserActions]: "User Actions", [Pe.showPrecedingSessions]: "User Actions", [Pe.showFollowingSessions]: "User Actions", [Pe.clickViewedDocument]: "User Actions", [Pe.clickPageView]: "User Actions", [Pe.createArticle]: "createArticle" };
var Ar = class {
  constructor() {
    this.runtime = new Ji(), this.currentVisitorId = "";
  }
  getPayload() {
    return Promise.resolve();
  }
  getParameters() {
    return Promise.resolve();
  }
  makeEvent(t) {
    return Promise.resolve({ eventType: t, payload: null, log: () => Promise.resolve() });
  }
  sendEvent() {
    return Promise.resolve();
  }
  makeSearchEvent() {
    return this.makeEvent(ee.search);
  }
  sendSearchEvent() {
    return Promise.resolve();
  }
  makeClickEvent() {
    return this.makeEvent(ee.click);
  }
  sendClickEvent() {
    return Promise.resolve();
  }
  makeCustomEvent() {
    return this.makeEvent(ee.custom);
  }
  sendCustomEvent() {
    return Promise.resolve();
  }
  makeViewEvent() {
    return this.makeEvent(ee.view);
  }
  sendViewEvent() {
    return Promise.resolve();
  }
  getVisit() {
    return Promise.resolve({ id: "", visitorId: "" });
  }
  getHealth() {
    return Promise.resolve({ status: "" });
  }
  registerBeforeSendEventHook() {
  }
  registerAfterSendEventHook() {
  }
  addEventTypeMapping() {
  }
  get version() {
    return Df;
  }
};
function fI(e4) {
  let t = "";
  return e4.filter((r) => {
    let n = r !== t;
    return t = r, n;
  });
}
function hI(e4) {
  return e4.map((t) => t.replace(/;/g, ""));
}
function Bf(e4) {
  let r = e4.join(";");
  return r.length <= 256 ? r : Bf(e4.slice(1));
}
var vf = (e4) => {
  let t = hI(e4), r = fI(t);
  return Bf(r);
};
function If(e4) {
  let t = typeof e4.partialQueries == "string" ? e4.partialQueries : vf(e4.partialQueries), r = typeof e4.suggestions == "string" ? e4.suggestions : vf(e4.suggestions);
  return Object.assign(Object.assign({}, e4), { partialQueries: t, suggestions: r });
}
var Xi = class {
  constructor(t, r) {
    this.opts = t, this.provider = r;
    let n = t.enableAnalytics === false || ba();
    this.coveoAnalyticsClient = n ? new Ar() : new ot(t);
  }
  disable() {
    this.coveoAnalyticsClient = new Ar();
  }
  enable() {
    this.coveoAnalyticsClient = new ot(this.opts);
  }
  makeInterfaceLoad() {
    return this.makeSearchEvent(F.interfaceLoad);
  }
  logInterfaceLoad() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeInterfaceLoad()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeRecommendationInterfaceLoad() {
    return this.makeSearchEvent(F.recommendationInterfaceLoad);
  }
  logRecommendationInterfaceLoad() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeRecommendationInterfaceLoad()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeRecommendation() {
    return this.makeCustomEvent(F.recommendation);
  }
  logRecommendation() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeRecommendation()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeRecommendationOpen(t, r) {
    return this.makeClickEvent(F.recommendationOpen, t, r);
  }
  logRecommendationOpen(t, r) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeRecommendationOpen(t, r)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeStaticFilterClearAll(t) {
    return this.makeSearchEvent(F.staticFilterClearAll, t);
  }
  logStaticFilterClearAll(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeStaticFilterClearAll(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeStaticFilterSelect(t) {
    return this.makeSearchEvent(F.staticFilterSelect, t);
  }
  logStaticFilterSelect(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeStaticFilterSelect(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeStaticFilterDeselect(t) {
    return this.makeSearchEvent(F.staticFilterDeselect, t);
  }
  logStaticFilterDeselect(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeStaticFilterDeselect(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeFetchMoreResults() {
    return this.makeCustomEvent(F.pagerScrolling, { type: "getMoreResults" });
  }
  logFetchMoreResults() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeFetchMoreResults()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeInterfaceChange(t) {
    return this.makeSearchEvent(F.interfaceChange, t);
  }
  logInterfaceChange(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeInterfaceChange(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeDidYouMeanAutomatic() {
    return this.makeSearchEvent(F.didyoumeanAutomatic);
  }
  logDidYouMeanAutomatic() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeDidYouMeanAutomatic()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeDidYouMeanClick() {
    return this.makeSearchEvent(F.didyoumeanClick);
  }
  logDidYouMeanClick() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeDidYouMeanClick()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeResultsSort(t) {
    return this.makeSearchEvent(F.resultsSort, t);
  }
  logResultsSort(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeResultsSort(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeSearchboxSubmit() {
    return this.makeSearchEvent(F.searchboxSubmit);
  }
  logSearchboxSubmit() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeSearchboxSubmit()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeSearchboxClear() {
    return this.makeSearchEvent(F.searchboxClear);
  }
  logSearchboxClear() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeSearchboxClear()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeSearchboxAsYouType() {
    return this.makeSearchEvent(F.searchboxAsYouType);
  }
  logSearchboxAsYouType() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeSearchboxAsYouType()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeBreadcrumbFacet(t) {
    return this.makeSearchEvent(F.breadcrumbFacet, t);
  }
  logBreadcrumbFacet(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeBreadcrumbFacet(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeBreadcrumbResetAll() {
    return this.makeSearchEvent(F.breadcrumbResetAll);
  }
  logBreadcrumbResetAll() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeBreadcrumbResetAll()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeDocumentQuickview(t, r) {
    return this.makeClickEvent(F.documentQuickview, t, r);
  }
  logDocumentQuickview(t, r) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeDocumentQuickview(t, r)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeDocumentOpen(t, r) {
    return this.makeClickEvent(F.documentOpen, t, r);
  }
  logDocumentOpen(t, r) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeDocumentOpen(t, r)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeOmniboxAnalytics(t) {
    return this.makeSearchEvent(F.omniboxAnalytics, If(t));
  }
  logOmniboxAnalytics(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeOmniboxAnalytics(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeOmniboxFromLink(t) {
    return this.makeSearchEvent(F.omniboxFromLink, If(t));
  }
  logOmniboxFromLink(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeOmniboxFromLink(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeSearchFromLink() {
    return this.makeSearchEvent(F.searchFromLink);
  }
  logSearchFromLink() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeSearchFromLink()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeTriggerNotify(t) {
    return this.makeCustomEvent(F.triggerNotify, t);
  }
  logTriggerNotify(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeTriggerNotify(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeTriggerExecute(t) {
    return this.makeCustomEvent(F.triggerExecute, t);
  }
  logTriggerExecute(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeTriggerExecute(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeTriggerQuery() {
    return this.makeCustomEvent(F.triggerQuery, { query: this.provider.getSearchEventRequestPayload().queryText }, "queryPipelineTriggers");
  }
  logTriggerQuery() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeTriggerQuery()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeUndoTriggerQuery(t) {
    return this.makeSearchEvent(F.undoTriggerQuery, t);
  }
  logUndoTriggerQuery(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeUndoTriggerQuery(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeTriggerRedirect(t) {
    return this.makeCustomEvent(F.triggerRedirect, Object.assign(Object.assign({}, t), { query: this.provider.getSearchEventRequestPayload().queryText }));
  }
  logTriggerRedirect(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeTriggerRedirect(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makePagerResize(t) {
    return this.makeCustomEvent(F.pagerResize, t);
  }
  logPagerResize(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makePagerResize(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makePagerNumber(t) {
    return this.makeCustomEvent(F.pagerNumber, t);
  }
  logPagerNumber(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makePagerNumber(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makePagerNext(t) {
    return this.makeCustomEvent(F.pagerNext, t);
  }
  logPagerNext(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makePagerNext(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makePagerPrevious(t) {
    return this.makeCustomEvent(F.pagerPrevious, t);
  }
  logPagerPrevious(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makePagerPrevious(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makePagerScrolling() {
    return this.makeCustomEvent(F.pagerScrolling);
  }
  logPagerScrolling() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makePagerScrolling()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeFacetClearAll(t) {
    return this.makeSearchEvent(F.facetClearAll, t);
  }
  logFacetClearAll(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeFacetClearAll(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeFacetSearch(t) {
    return this.makeSearchEvent(F.facetSearch, t);
  }
  logFacetSearch(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeFacetSearch(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeFacetSelect(t) {
    return this.makeSearchEvent(F.facetSelect, t);
  }
  logFacetSelect(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeFacetSelect(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeFacetDeselect(t) {
    return this.makeSearchEvent(F.facetDeselect, t);
  }
  logFacetDeselect(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeFacetDeselect(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeFacetExclude(t) {
    return this.makeSearchEvent(F.facetExclude, t);
  }
  logFacetExclude(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeFacetExclude(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeFacetUnexclude(t) {
    return this.makeSearchEvent(F.facetUnexclude, t);
  }
  logFacetUnexclude(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeFacetUnexclude(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeFacetSelectAll(t) {
    return this.makeSearchEvent(F.facetSelectAll, t);
  }
  logFacetSelectAll(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeFacetSelectAll(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeFacetUpdateSort(t) {
    return this.makeSearchEvent(F.facetUpdateSort, t);
  }
  logFacetUpdateSort(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeFacetUpdateSort(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeFacetShowMore(t) {
    return this.makeCustomEvent(F.facetShowMore, t);
  }
  logFacetShowMore(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeFacetShowMore(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeFacetShowLess(t) {
    return this.makeCustomEvent(F.facetShowLess, t);
  }
  logFacetShowLess(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeFacetShowLess(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeQueryError(t) {
    return this.makeCustomEvent(F.queryError, t);
  }
  logQueryError(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeQueryError(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeQueryErrorBack() {
    return I(this, void 0, void 0, function* () {
      let t = yield this.makeCustomEvent(F.queryErrorBack);
      return { description: t.description, log: () => I(this, void 0, void 0, function* () {
        return yield t.log({ searchUID: this.provider.getSearchUID() }), this.logSearchEvent(F.queryErrorBack);
      }) };
    });
  }
  logQueryErrorBack() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeQueryErrorBack()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeQueryErrorRetry() {
    return I(this, void 0, void 0, function* () {
      let t = yield this.makeCustomEvent(F.queryErrorRetry);
      return { description: t.description, log: () => I(this, void 0, void 0, function* () {
        return yield t.log({ searchUID: this.provider.getSearchUID() }), this.logSearchEvent(F.queryErrorRetry);
      }) };
    });
  }
  logQueryErrorRetry() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeQueryErrorRetry()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeQueryErrorClear() {
    return I(this, void 0, void 0, function* () {
      let t = yield this.makeCustomEvent(F.queryErrorClear);
      return { description: t.description, log: () => I(this, void 0, void 0, function* () {
        return yield t.log({ searchUID: this.provider.getSearchUID() }), this.logSearchEvent(F.queryErrorClear);
      }) };
    });
  }
  logQueryErrorClear() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeQueryErrorClear()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeLikeSmartSnippet() {
    return this.makeCustomEvent(F.likeSmartSnippet);
  }
  logLikeSmartSnippet() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeLikeSmartSnippet()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeDislikeSmartSnippet() {
    return this.makeCustomEvent(F.dislikeSmartSnippet);
  }
  logDislikeSmartSnippet() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeDislikeSmartSnippet()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeExpandSmartSnippet() {
    return this.makeCustomEvent(F.expandSmartSnippet);
  }
  logExpandSmartSnippet() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeExpandSmartSnippet()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeCollapseSmartSnippet() {
    return this.makeCustomEvent(F.collapseSmartSnippet);
  }
  logCollapseSmartSnippet() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeCollapseSmartSnippet()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeOpenSmartSnippetFeedbackModal() {
    return this.makeCustomEvent(F.openSmartSnippetFeedbackModal);
  }
  logOpenSmartSnippetFeedbackModal() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeOpenSmartSnippetFeedbackModal()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeCloseSmartSnippetFeedbackModal() {
    return this.makeCustomEvent(F.closeSmartSnippetFeedbackModal);
  }
  logCloseSmartSnippetFeedbackModal() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeCloseSmartSnippetFeedbackModal()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeSmartSnippetFeedbackReason(t, r) {
    return this.makeCustomEvent(F.sendSmartSnippetReason, { reason: t, details: r });
  }
  logSmartSnippetFeedbackReason(t, r) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeSmartSnippetFeedbackReason(t, r)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeExpandSmartSnippetSuggestion(t) {
    return this.makeCustomEvent(F.expandSmartSnippetSuggestion, "documentId" in t ? t : { documentId: t });
  }
  logExpandSmartSnippetSuggestion(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeExpandSmartSnippetSuggestion(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeCollapseSmartSnippetSuggestion(t) {
    return this.makeCustomEvent(F.collapseSmartSnippetSuggestion, "documentId" in t ? t : { documentId: t });
  }
  logCollapseSmartSnippetSuggestion(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeCollapseSmartSnippetSuggestion(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeShowMoreSmartSnippetSuggestion(t) {
    return this.makeCustomEvent(F.showMoreSmartSnippetSuggestion, t);
  }
  logShowMoreSmartSnippetSuggestion(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeShowMoreSmartSnippetSuggestion(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeShowLessSmartSnippetSuggestion(t) {
    return this.makeCustomEvent(F.showLessSmartSnippetSuggestion, t);
  }
  logShowLessSmartSnippetSuggestion(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeShowLessSmartSnippetSuggestion(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeOpenSmartSnippetSource(t, r) {
    return this.makeClickEvent(F.openSmartSnippetSource, t, r);
  }
  logOpenSmartSnippetSource(t, r) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeOpenSmartSnippetSource(t, r)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeOpenSmartSnippetSuggestionSource(t, r) {
    return this.makeClickEvent(F.openSmartSnippetSuggestionSource, t, { contentIDKey: r.documentId.contentIdKey, contentIDValue: r.documentId.contentIdValue }, r);
  }
  makeCopyToClipboard(t, r) {
    return this.makeClickEvent(F.copyToClipboard, t, r);
  }
  logCopyToClipboard(t, r) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeCopyToClipboard(t, r)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  logOpenSmartSnippetSuggestionSource(t, r) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeOpenSmartSnippetSuggestionSource(t, r)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeOpenSmartSnippetInlineLink(t, r) {
    return this.makeClickEvent(F.openSmartSnippetInlineLink, t, { contentIDKey: r.contentIDKey, contentIDValue: r.contentIDValue }, r);
  }
  logOpenSmartSnippetInlineLink(t, r) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeOpenSmartSnippetInlineLink(t, r)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeOpenSmartSnippetSuggestionInlineLink(t, r) {
    return this.makeClickEvent(F.openSmartSnippetSuggestionInlineLink, t, { contentIDKey: r.documentId.contentIdKey, contentIDValue: r.documentId.contentIdValue }, r);
  }
  logOpenSmartSnippetSuggestionInlineLink(t, r) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeOpenSmartSnippetSuggestionInlineLink(t, r)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeRecentQueryClick() {
    return this.makeSearchEvent(F.recentQueryClick);
  }
  logRecentQueryClick() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeRecentQueryClick()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeClearRecentQueries() {
    return this.makeCustomEvent(F.clearRecentQueries);
  }
  logClearRecentQueries() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeClearRecentQueries()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeRecentResultClick(t, r) {
    return this.makeCustomEvent(F.recentResultClick, { info: t, identifier: r });
  }
  logRecentResultClick(t, r) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeRecentResultClick(t, r)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeClearRecentResults() {
    return this.makeCustomEvent(F.clearRecentResults);
  }
  logClearRecentResults() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeClearRecentResults()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeNoResultsBack() {
    return this.makeSearchEvent(F.noResultsBack);
  }
  logNoResultsBack() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeNoResultsBack()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeShowMoreFoldedResults(t, r) {
    return this.makeClickEvent(F.showMoreFoldedResults, t, r);
  }
  logShowMoreFoldedResults(t, r) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeShowMoreFoldedResults(t, r)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeShowLessFoldedResults() {
    return this.makeCustomEvent(F.showLessFoldedResults);
  }
  logShowLessFoldedResults() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeShowLessFoldedResults()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeEventDescription(t, r) {
    var n;
    return { actionCause: r, customData: (n = t.payload) === null || n === void 0 ? void 0 : n.customData };
  }
  makeCustomEvent(t, r, n = Bd[t]) {
    return I(this, void 0, void 0, function* () {
      this.coveoAnalyticsClient.getParameters;
      let o = Object.assign(Object.assign({}, this.provider.getBaseMetadata()), r), a = Object.assign(Object.assign({}, yield this.getBaseEventRequest(o)), { eventType: n, eventValue: t }), i = yield this.coveoAnalyticsClient.makeCustomEvent(a);
      return { description: this.makeEventDescription(i, t), log: ({ searchUID: s }) => i.log({ lastSearchQueryUid: s }) };
    });
  }
  logCustomEvent(t, r, n = Bd[t]) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeCustomEvent(t, r, n)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeCustomEventWithType(t, r, n) {
    return I(this, void 0, void 0, function* () {
      let o = Object.assign(Object.assign({}, this.provider.getBaseMetadata()), n), a = Object.assign(Object.assign({}, yield this.getBaseEventRequest(o)), { eventType: r, eventValue: t }), i = yield this.coveoAnalyticsClient.makeCustomEvent(a);
      return { description: this.makeEventDescription(i, t), log: ({ searchUID: s }) => i.log({ lastSearchQueryUid: s }) };
    });
  }
  logCustomEventWithType(t, r, n) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeCustomEventWithType(t, r, n)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  logSearchEvent(t, r) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeSearchEvent(t, r)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeSearchEvent(t, r) {
    return I(this, void 0, void 0, function* () {
      let n = yield this.getBaseSearchEventRequest(t, r), o = yield this.coveoAnalyticsClient.makeSearchEvent(n);
      return { description: this.makeEventDescription(o, t), log: ({ searchUID: a }) => o.log({ searchQueryUid: a }) };
    });
  }
  makeClickEvent(t, r, n, o) {
    return I(this, void 0, void 0, function* () {
      let a = Object.assign(Object.assign(Object.assign({}, r), yield this.getBaseEventRequest(Object.assign(Object.assign({}, n), o))), { queryPipeline: this.provider.getPipeline(), actionCause: t }), i = yield this.coveoAnalyticsClient.makeClickEvent(a);
      return { description: this.makeEventDescription(i, t), log: ({ searchUID: s }) => i.log({ searchQueryUid: s }) };
    });
  }
  logClickEvent(t, r, n, o) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeClickEvent(t, r, n, o)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  getBaseSearchEventRequest(t, r) {
    var n, o;
    return I(this, void 0, void 0, function* () {
      return Object.assign(Object.assign(Object.assign({}, yield this.getBaseEventRequest(Object.assign(Object.assign({}, r), (o = (n = this.provider).getGeneratedAnswerMetadata) === null || o === void 0 ? void 0 : o.call(n)))), this.provider.getSearchEventRequestPayload()), { queryPipeline: this.provider.getPipeline(), actionCause: t });
    });
  }
  getBaseEventRequest(t) {
    return I(this, void 0, void 0, function* () {
      let r = Object.assign(Object.assign({}, this.provider.getBaseMetadata()), t);
      return Object.assign(Object.assign(Object.assign({}, this.getOrigins()), this.getSplitTestRun()), { customData: r, language: this.provider.getLanguage(), facetState: this.provider.getFacetState ? this.provider.getFacetState() : [], anonymous: this.provider.getIsAnonymous(), clientId: yield this.getClientId() });
    });
  }
  getOrigins() {
    var t, r;
    return { originContext: (r = (t = this.provider).getOriginContext) === null || r === void 0 ? void 0 : r.call(t), originLevel1: this.provider.getOriginLevel1(), originLevel2: this.provider.getOriginLevel2(), originLevel3: this.provider.getOriginLevel3() };
  }
  getClientId() {
    return this.coveoAnalyticsClient instanceof ot ? this.coveoAnalyticsClient.getCurrentVisitorId() : void 0;
  }
  getSplitTestRun() {
    let t = this.provider.getSplitTestRunName ? this.provider.getSplitTestRunName() : "", r = this.provider.getSplitTestRunVersion ? this.provider.getSplitTestRunVersion() : "";
    return Object.assign(Object.assign({}, t && { splitTestRunName: t }), r && { splitTestRunVersion: r });
  }
  makeLikeGeneratedAnswer(t) {
    return this.makeCustomEvent(F.likeGeneratedAnswer, t);
  }
  logLikeGeneratedAnswer(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeLikeGeneratedAnswer(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeDislikeGeneratedAnswer(t) {
    return this.makeCustomEvent(F.dislikeGeneratedAnswer, t);
  }
  logDislikeGeneratedAnswer(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeDislikeGeneratedAnswer(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeOpenGeneratedAnswerSource(t) {
    return this.makeCustomEvent(F.openGeneratedAnswerSource, t);
  }
  logOpenGeneratedAnswerSource(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeOpenGeneratedAnswerSource(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeGeneratedAnswerSourceHover(t) {
    return this.makeCustomEvent(F.generatedAnswerSourceHover, t);
  }
  logGeneratedAnswerSourceHover(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeGeneratedAnswerSourceHover(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeGeneratedAnswerCopyToClipboard(t) {
    return this.makeCustomEvent(F.generatedAnswerCopyToClipboard, t);
  }
  logGeneratedAnswerCopyToClipboard(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeGeneratedAnswerCopyToClipboard(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeGeneratedAnswerHideAnswers(t) {
    return this.makeCustomEvent(F.generatedAnswerHideAnswers, t);
  }
  logGeneratedAnswerHideAnswers(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeGeneratedAnswerHideAnswers(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeGeneratedAnswerShowAnswers(t) {
    return this.makeCustomEvent(F.generatedAnswerShowAnswers, t);
  }
  logGeneratedAnswerShowAnswers(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeGeneratedAnswerShowAnswers(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeGeneratedAnswerExpand(t) {
    return this.makeCustomEvent(F.generatedAnswerExpand, t);
  }
  logGeneratedAnswerExpand(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeGeneratedAnswerExpand(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeGeneratedAnswerCollapse(t) {
    return this.makeCustomEvent(F.generatedAnswerCollapse, t);
  }
  logGeneratedAnswerCollapse(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeGeneratedAnswerCollapse(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeGeneratedAnswerFeedbackSubmit(t) {
    return this.makeCustomEvent(F.generatedAnswerFeedbackSubmit, t);
  }
  logGeneratedAnswerFeedbackSubmit(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeGeneratedAnswerFeedbackSubmit(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeGeneratedAnswerFeedbackSubmitV2(t) {
    return this.makeCustomEvent(F.generatedAnswerFeedbackSubmitV2, t);
  }
  logGeneratedAnswerFeedbackSubmitV2(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeGeneratedAnswerFeedbackSubmitV2(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeRephraseGeneratedAnswer(t) {
    return this.makeSearchEvent(F.rephraseGeneratedAnswer, t);
  }
  logRephraseGeneratedAnswer(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeRephraseGeneratedAnswer(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeRetryGeneratedAnswer() {
    return this.makeSearchEvent(F.retryGeneratedAnswer);
  }
  logRetryGeneratedAnswer() {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeRetryGeneratedAnswer()).log({ searchUID: this.provider.getSearchUID() });
    });
  }
  makeGeneratedAnswerStreamEnd(t) {
    return this.makeCustomEvent(F.generatedAnswerStreamEnd, t);
  }
  logGeneratedAnswerStreamEnd(t) {
    return I(this, void 0, void 0, function* () {
      return (yield this.makeGeneratedAnswerStreamEnd(t)).log({ searchUID: this.provider.getSearchUID() });
    });
  }
};
var Zi = Object.assign({}, Ra);
var wf = Object.keys(Zi).map((e4) => Zi[e4]);
var Wn = class extends Td {
  constructor({ client: t, uuidGenerator: r = Rn }) {
    super({ client: t, uuidGenerator: r }), this.ticket = {};
  }
  getApi(t) {
    let r = super.getApi(t);
    if (r !== null) return r;
    switch (t) {
      case "setTicket":
        return this.setTicket;
      default:
        return null;
    }
  }
  addHooks() {
    this.addHooksForEvent(), this.addHooksForPageView(), this.addHooksForSVCEvents();
  }
  setTicket(t) {
    this.ticket = t;
  }
  clearPluginData() {
    this.ticket = {};
  }
  addHooksForSVCEvents() {
    this.client.registerBeforeSendEventHook((t, ...[r]) => wf.indexOf(t) !== -1 ? this.addSVCDataToPayload(t, r) : r), this.client.registerAfterSendEventHook((t, ...[r]) => (wf.indexOf(t) !== -1 && this.updateLocationInformation(t, r), r));
  }
  addHooksForPageView() {
    this.client.addEventTypeMapping(Zi.pageview, { newEventType: ee.collect, variableLengthArgumentsNames: ["page"], addVisitorIdParameter: true, usesMeasurementProtocol: true });
  }
  addHooksForEvent() {
    this.client.addEventTypeMapping(Zi.event, { newEventType: ee.collect, variableLengthArgumentsNames: ["eventCategory", "eventAction", "eventLabel", "eventValue"], addVisitorIdParameter: true, usesMeasurementProtocol: true });
  }
  addSVCDataToPayload(t, r) {
    var n;
    let o = Object.assign(Object.assign(Object.assign(Object.assign({}, this.getLocationInformation(t, r)), this.getDefaultContextInformation(t)), this.action ? { svcAction: this.action } : {}), Object.keys((n = this.actionData) !== null && n !== void 0 ? n : {}).length > 0 ? { svcActionData: this.actionData } : {}), a = this.getTicketPayload();
    return this.clearData(), Object.assign(Object.assign(Object.assign({}, a), o), r);
  }
  getTicketPayload() {
    return xv(this.ticket);
  }
};
Wn.Id = "svc";
var es;
(function(e4) {
  e4.click = "click", e4.flowStart = "flowStart";
})(es || (es = {}));
var gt;
(function(e4) {
  e4.enterInterface = "ticket_create_start", e4.fieldUpdate = "ticket_field_update", e4.fieldSuggestionClick = "ticket_classification_click", e4.suggestionClick = "suggestion_click", e4.suggestionRate = "suggestion_rate", e4.nextCaseStep = "ticket_next_stage", e4.caseCancelled = "ticket_cancel", e4.caseSolved = "ticket_cancel", e4.caseCreated = "ticket_create";
})(gt || (gt = {}));
var ts;
(function(e4) {
  e4.quit = "Quit", e4.solved = "Solved";
})(ts || (ts = {}));
var rs = class {
  constructor(t, r) {
    var n;
    this.options = t, this.provider = r;
    let o = ((n = t.enableAnalytics) !== null && n !== void 0 ? n : true) && !ba();
    this.coveoAnalyticsClient = o ? new ot(t) : new Ar(), this.svc = new Wn({ client: this.coveoAnalyticsClient });
  }
  disable() {
    this.coveoAnalyticsClient = new Ar(), this.svc = new Wn({ client: this.coveoAnalyticsClient });
  }
  enable() {
    this.coveoAnalyticsClient = new ot(this.options), this.svc = new Wn({ client: this.coveoAnalyticsClient });
  }
  logEnterInterface(t) {
    return this.svc.setAction(gt.enterInterface), this.svc.setTicket(t.ticket), this.sendFlowStartEvent();
  }
  logUpdateCaseField(t) {
    return this.svc.setAction(gt.fieldUpdate, { fieldName: t.fieldName }), this.svc.setTicket(t.ticket), this.sendClickEvent();
  }
  logSelectFieldSuggestion(t) {
    return this.svc.setAction(gt.fieldSuggestionClick, t.suggestion), this.svc.setTicket(t.ticket), this.sendClickEvent();
  }
  logSelectDocumentSuggestion(t) {
    return this.svc.setAction(gt.suggestionClick, t.suggestion), this.svc.setTicket(t.ticket), this.sendClickEvent();
  }
  logRateDocumentSuggestion(t) {
    return this.svc.setAction(gt.suggestionRate, Object.assign({ rate: t.rating }, t.suggestion)), this.svc.setTicket(t.ticket), this.sendClickEvent();
  }
  logMoveToNextCaseStep(t) {
    return this.svc.setAction(gt.nextCaseStep, { stage: t?.stage }), this.svc.setTicket(t.ticket), this.sendClickEvent();
  }
  logCaseCancelled(t) {
    return this.svc.setAction(gt.caseCancelled, { reason: ts.quit }), this.svc.setTicket(t.ticket), this.sendClickEvent();
  }
  logCaseSolved(t) {
    return this.svc.setAction(gt.caseSolved, { reason: ts.solved }), this.svc.setTicket(t.ticket), this.sendClickEvent();
  }
  logCaseCreated(t) {
    return this.svc.setAction(gt.caseCreated), this.svc.setTicket(t.ticket), this.sendClickEvent();
  }
  sendFlowStartEvent() {
    return this.coveoAnalyticsClient.sendEvent("event", "svc", es.flowStart, this.provider ? { searchHub: this.provider.getOriginLevel1() } : null);
  }
  sendClickEvent() {
    return this.coveoAnalyticsClient.sendEvent("event", "svc", es.click, this.provider ? { searchHub: this.provider.getOriginLevel1() } : null);
  }
};
var yI = (e4) => {
  let t = {};
  return e4.caseContext && Object.keys(e4.caseContext).forEach((r) => {
    var n;
    let o = (n = e4.caseContext) === null || n === void 0 ? void 0 : n[r];
    if (o) {
      let a = `context_${r}`;
      t[a] = o;
    }
  }), t;
};
var _ = (e4, t = true) => {
  let { caseContext: r, caseId: n, caseNumber: o } = e4, a = Tt(e4, ["caseContext", "caseId", "caseNumber"]), i = yI(e4);
  return Object.assign(Object.assign(Object.assign({ CaseId: n, CaseNumber: o }, a), !!i.context_Case_Subject && { CaseSubject: i.context_Case_Subject }), t && i);
};
var ns = class {
  constructor(t, r) {
    this.opts = t, this.provider = r;
    let n = t.enableAnalytics === false || ba();
    this.coveoAnalyticsClient = n ? new Ar() : new ot(t);
  }
  disable() {
    this.coveoAnalyticsClient = new Ar();
  }
  enable() {
    this.coveoAnalyticsClient = new ot(this.opts);
  }
  logInterfaceLoad(t) {
    if (t) {
      let r = _(t);
      return this.logSearchEvent(F.interfaceLoad, r);
    }
    return this.logSearchEvent(F.interfaceLoad);
  }
  logInterfaceChange(t) {
    let r = _(t);
    return this.logSearchEvent(F.interfaceChange, r);
  }
  logStaticFilterDeselect(t) {
    let r = _(t);
    return this.logSearchEvent(F.staticFilterDeselect, r);
  }
  logFetchMoreResults(t) {
    if (t) {
      let r = _(t);
      return this.logCustomEvent(F.pagerScrolling, Object.assign(Object.assign({}, r), { type: "getMoreResults" }));
    }
    return this.logCustomEvent(F.pagerScrolling, { type: "getMoreResults" });
  }
  logBreadcrumbFacet(t) {
    let r = _(t);
    return this.logSearchEvent(F.breadcrumbFacet, r);
  }
  logBreadcrumbResetAll(t) {
    if (t) {
      let r = _(t);
      return this.logSearchEvent(F.breadcrumbResetAll, r);
    }
    return this.logSearchEvent(F.breadcrumbResetAll);
  }
  logFacetSelect(t) {
    let r = _(t);
    return this.logSearchEvent(F.facetSelect, r);
  }
  logFacetExclude(t) {
    let r = _(t);
    return this.logSearchEvent(F.facetExclude, r);
  }
  logFacetDeselect(t) {
    let r = _(t);
    return this.logSearchEvent(F.facetDeselect, r);
  }
  logFacetUpdateSort(t) {
    let r = _(t);
    return this.logSearchEvent(F.facetUpdateSort, r);
  }
  logFacetClearAll(t) {
    let r = _(t);
    return this.logSearchEvent(F.facetClearAll, r);
  }
  logFacetShowMore(t) {
    let r = _(t, false);
    return this.logCustomEvent(F.facetShowMore, r);
  }
  logFacetShowLess(t) {
    let r = _(t, false);
    return this.logCustomEvent(F.facetShowLess, r);
  }
  logQueryError(t) {
    let r = _(t, false);
    return this.logCustomEvent(F.queryError, r);
  }
  logPagerNumber(t) {
    let r = _(t, false);
    return this.logCustomEvent(F.pagerNumber, r);
  }
  logPagerNext(t) {
    let r = _(t, false);
    return this.logCustomEvent(F.pagerNext, r);
  }
  logPagerPrevious(t) {
    let r = _(t, false);
    return this.logCustomEvent(F.pagerPrevious, r);
  }
  logDidYouMeanAutomatic(t) {
    if (t) {
      let r = _(t);
      return this.logSearchEvent(F.didyoumeanAutomatic, r);
    }
    return this.logSearchEvent(F.didyoumeanAutomatic);
  }
  logDidYouMeanClick(t) {
    if (t) {
      let r = _(t);
      return this.logSearchEvent(F.didyoumeanClick, r);
    }
    return this.logSearchEvent(F.didyoumeanClick);
  }
  logResultsSort(t) {
    let r = _(t);
    return this.logSearchEvent(F.resultsSort, r);
  }
  logSearchboxSubmit(t) {
    if (t) {
      let r = _(t);
      return this.logSearchEvent(F.searchboxSubmit, r);
    }
    return this.logSearchEvent(F.searchboxSubmit);
  }
  logContextChanged(t) {
    let r = _(t);
    return this.logSearchEvent(Pe.contextChanged, r);
  }
  logExpandToFullUI(t) {
    let r = _(t);
    return this.logCustomEvent(Pe.expandToFullUI, r);
  }
  logOpenUserActions(t) {
    let r = _(t, false);
    return this.logCustomEvent(Pe.openUserActions, r);
  }
  logShowPrecedingSessions(t) {
    let r = _(t, false);
    return this.logCustomEvent(Pe.showPrecedingSessions, r);
  }
  logShowFollowingSessions(t) {
    let r = _(t, false);
    return this.logCustomEvent(Pe.showFollowingSessions, r);
  }
  logViewedDocumentClick(t, r) {
    return this.logCustomEvent(Pe.clickViewedDocument, Object.assign(Object.assign({}, _(r, false)), { document: t }));
  }
  logPageViewClick(t, r) {
    return this.logCustomEvent(Pe.clickPageView, Object.assign(Object.assign({}, _(r, false)), { pageView: t }));
  }
  logCreateArticle(t, r) {
    return this.logCustomEvent(Pe.createArticle, r ? Object.assign(Object.assign({}, _(r, false)), t) : t);
  }
  logDocumentOpen(t, r, n) {
    return this.logClickEvent(F.documentOpen, t, r, n ? _(n, false) : void 0);
  }
  logCopyToClipboard(t, r, n) {
    return this.logClickEvent(F.copyToClipboard, t, r, n ? _(n, false) : void 0);
  }
  logCaseSendEmail(t, r, n) {
    return this.logClickEvent(F.caseSendEmail, t, r, n ? _(n, false) : void 0);
  }
  logFeedItemTextPost(t, r, n) {
    return this.logClickEvent(F.feedItemTextPost, t, r, n ? _(n, false) : void 0);
  }
  logDocumentQuickview(t, r, n) {
    let o = { documentTitle: t.documentTitle, documentURL: t.documentUrl };
    return this.logClickEvent(F.documentQuickview, t, r, n ? Object.assign(Object.assign({}, _(n, false)), o) : o);
  }
  logCaseAttach(t, r, n) {
    let o = { documentTitle: t.documentTitle, documentURL: t.documentUrl, resultUriHash: t.documentUriHash };
    return this.logClickEvent(F.caseAttach, t, r, n ? Object.assign(Object.assign({}, _(n, false)), o) : o);
  }
  logCaseDetach(t, r) {
    return this.logCustomEvent(F.caseDetach, r ? Object.assign(Object.assign({}, _(r, false)), { resultUriHash: t }) : { resultUriHash: t });
  }
  logLikeSmartSnippet(t) {
    return this.logCustomEvent(F.likeSmartSnippet, t ? _(t, false) : void 0);
  }
  logDislikeSmartSnippet(t) {
    return this.logCustomEvent(F.dislikeSmartSnippet, t ? _(t, false) : void 0);
  }
  logExpandSmartSnippet(t) {
    return this.logCustomEvent(F.expandSmartSnippet, t ? _(t, false) : void 0);
  }
  logCollapseSmartSnippet(t) {
    return this.logCustomEvent(F.collapseSmartSnippet, t ? _(t, false) : void 0);
  }
  logOpenSmartSnippetFeedbackModal(t) {
    return this.logCustomEvent(F.openSmartSnippetFeedbackModal, t ? _(t, false) : void 0);
  }
  logCloseSmartSnippetFeedbackModal(t) {
    return this.logCustomEvent(F.closeSmartSnippetFeedbackModal, t ? _(t, false) : void 0);
  }
  logSmartSnippetFeedbackReason(t, r, n) {
    return this.logCustomEvent(F.sendSmartSnippetReason, n ? Object.assign(Object.assign({}, _(n, false)), { reason: t, details: r }) : { reason: t, details: r });
  }
  logExpandSmartSnippetSuggestion(t, r) {
    let n = "documentId" in t ? t : { documentId: t };
    return this.logCustomEvent(F.expandSmartSnippetSuggestion, r ? Object.assign(Object.assign({}, _(r, false)), n) : n);
  }
  logCollapseSmartSnippetSuggestion(t, r) {
    let n = "documentId" in t ? t : { documentId: t };
    return this.logCustomEvent(F.collapseSmartSnippetSuggestion, r ? Object.assign(Object.assign({}, _(r, false)), n) : n);
  }
  logOpenSmartSnippetSource(t, r, n) {
    return this.logClickEvent(F.openSmartSnippetSource, t, r, n ? _(n, false) : void 0);
  }
  logOpenSmartSnippetSuggestionSource(t, r, n) {
    return this.logClickEvent(F.openSmartSnippetSuggestionSource, t, { contentIDKey: r.documentId.contentIdKey, contentIDValue: r.documentId.contentIdValue }, n ? Object.assign(Object.assign({}, _(n, false)), r) : r);
  }
  logOpenSmartSnippetInlineLink(t, r, n) {
    return this.logClickEvent(F.openSmartSnippetInlineLink, t, { contentIDKey: r.contentIDKey, contentIDValue: r.contentIDValue }, n ? Object.assign(Object.assign({}, _(n, false)), r) : r);
  }
  logOpenSmartSnippetSuggestionInlineLink(t, r, n) {
    return this.logClickEvent(F.openSmartSnippetSuggestionInlineLink, t, { contentIDKey: r.documentId.contentIdKey, contentIDValue: r.documentId.contentIdValue }, n ? Object.assign(Object.assign({}, _(n, false)), r) : r);
  }
  logLikeGeneratedAnswer(t, r) {
    return this.logCustomEvent(F.likeGeneratedAnswer, r ? Object.assign(Object.assign({}, _(r, false)), t) : t);
  }
  logDislikeGeneratedAnswer(t, r) {
    return this.logCustomEvent(F.dislikeGeneratedAnswer, r ? Object.assign(Object.assign({}, _(r, false)), t) : t);
  }
  logOpenGeneratedAnswerSource(t, r) {
    return this.logCustomEvent(F.openGeneratedAnswerSource, r ? Object.assign(Object.assign({}, _(r, false)), t) : t);
  }
  logGeneratedAnswerSourceHover(t, r) {
    return this.logCustomEvent(F.generatedAnswerSourceHover, r ? Object.assign(Object.assign({}, _(r, false)), t) : t);
  }
  logGeneratedAnswerCopyToClipboard(t, r) {
    return this.logCustomEvent(F.generatedAnswerCopyToClipboard, r ? Object.assign(Object.assign({}, _(r, false)), t) : t);
  }
  logGeneratedAnswerHideAnswers(t, r) {
    return this.logCustomEvent(F.generatedAnswerHideAnswers, r ? Object.assign(Object.assign({}, _(r, false)), t) : t);
  }
  logGeneratedAnswerShowAnswers(t, r) {
    return this.logCustomEvent(F.generatedAnswerShowAnswers, r ? Object.assign(Object.assign({}, _(r, false)), t) : t);
  }
  logGeneratedAnswerExpand(t, r) {
    return this.logCustomEvent(F.generatedAnswerExpand, r ? Object.assign(Object.assign({}, _(r, false)), t) : t);
  }
  logGeneratedAnswerCollapse(t, r) {
    return this.logCustomEvent(F.generatedAnswerCollapse, r ? Object.assign(Object.assign({}, _(r, false)), t) : t);
  }
  logGeneratedAnswerFeedbackSubmit(t, r) {
    return this.logCustomEvent(F.generatedAnswerFeedbackSubmit, r ? Object.assign(Object.assign({}, _(r, false)), t) : t);
  }
  logGeneratedAnswerFeedbackSubmitV2(t, r) {
    return this.logCustomEvent(F.generatedAnswerFeedbackSubmitV2, r ? Object.assign(Object.assign({}, _(r, false)), t) : t);
  }
  logRephraseGeneratedAnswer(t, r) {
    return this.logSearchEvent(F.rephraseGeneratedAnswer, r ? Object.assign(Object.assign({}, _(r, false)), t) : t);
  }
  logRetryGeneratedAnswer(t) {
    return this.logSearchEvent(F.retryGeneratedAnswer, t ? Object.assign({}, _(t, false)) : {});
  }
  logGeneratedAnswerStreamEnd(t, r) {
    return this.logCustomEvent(F.generatedAnswerStreamEnd, r ? Object.assign(Object.assign({}, _(r, false)), t) : t);
  }
  logCustomEvent(t, r) {
    return I(this, void 0, void 0, function* () {
      let n = Object.assign(Object.assign({}, this.provider.getBaseMetadata()), r), o = Object.assign(Object.assign({}, yield this.getBaseCustomEventRequest(n)), { eventType: Bd[t], eventValue: t });
      return this.coveoAnalyticsClient.sendCustomEvent(o);
    });
  }
  logSearchEvent(t, r) {
    return I(this, void 0, void 0, function* () {
      return this.coveoAnalyticsClient.sendSearchEvent(yield this.getBaseSearchEventRequest(t, r));
    });
  }
  logClickEvent(t, r, n, o) {
    return I(this, void 0, void 0, function* () {
      let a = Object.assign(Object.assign(Object.assign({}, r), yield this.getBaseEventRequest(Object.assign(Object.assign({}, n), o))), { searchQueryUid: this.provider.getSearchUID(), queryPipeline: this.provider.getPipeline(), actionCause: t });
      return this.coveoAnalyticsClient.sendClickEvent(a);
    });
  }
  logShowMoreFoldedResults(t, r, n) {
    return I(this, void 0, void 0, function* () {
      return this.logClickEvent(F.showMoreFoldedResults, t, r, n ? _(n, false) : void 0);
    });
  }
  logShowLessFoldedResults(t) {
    return I(this, void 0, void 0, function* () {
      return this.logCustomEvent(F.showLessFoldedResults, t ? _(t, false) : void 0);
    });
  }
  logTriggerNotify(t, r) {
    return this.logCustomEvent(F.triggerNotify, r ? Object.assign(Object.assign({}, _(r, false)), t) : t);
  }
  getBaseCustomEventRequest(t) {
    return I(this, void 0, void 0, function* () {
      return Object.assign(Object.assign({}, yield this.getBaseEventRequest(t)), { lastSearchQueryUid: this.provider.getSearchUID() });
    });
  }
  getBaseSearchEventRequest(t, r) {
    var n, o;
    return I(this, void 0, void 0, function* () {
      return Object.assign(Object.assign(Object.assign({}, yield this.getBaseEventRequest(Object.assign(Object.assign({}, r), (o = (n = this.provider).getGeneratedAnswerMetadata) === null || o === void 0 ? void 0 : o.call(n)))), this.provider.getSearchEventRequestPayload()), { searchQueryUid: this.provider.getSearchUID(), queryPipeline: this.provider.getPipeline(), actionCause: t });
    });
  }
  getBaseEventRequest(t) {
    return I(this, void 0, void 0, function* () {
      let r = Object.assign(Object.assign({}, this.provider.getBaseMetadata()), t);
      return Object.assign(Object.assign({}, this.getOrigins()), { customData: r, language: this.provider.getLanguage(), facetState: this.provider.getFacetState ? this.provider.getFacetState() : [], anonymous: this.provider.getIsAnonymous(), clientId: yield this.getClientId() });
    });
  }
  getOrigins() {
    var t, r;
    return { originContext: (r = (t = this.provider).getOriginContext) === null || r === void 0 ? void 0 : r.call(t), originLevel1: this.provider.getOriginLevel1(), originLevel2: this.provider.getOriginLevel2(), originLevel3: this.provider.getOriginLevel3() };
  }
  getClientId() {
    return this.coveoAnalyticsClient instanceof ot ? this.coveoAnalyticsClient.getCurrentVisitorId() : void 0;
  }
};
var Rr = () => "default";
var it = (e4) => new ot(e4).getCurrentVisitorId();
var _e = new Of.HistoryStore();
var Jn = (e4, t) => typeof t == "function" ? (...r) => {
  let n = na(r[0]);
  try {
    return t.apply(t, r);
  } catch (o) {
    return e4.error(o, "Error in analytics preprocessRequest. Returning original request."), n;
  }
} : void 0;
var Xn = (e4, t) => (...r) => {
  let n = na(r[1]);
  try {
    return t.apply(t, r);
  } catch (o) {
    return e4.error(o, "Error in analytics hook. Returning original request."), n;
  }
};
var va = class {
  constructor(t) {
    ye(this, "state");
    this.state = t();
  }
  getSearchUID() {
    return null;
  }
  getOriginLevel1() {
    return this.state.searchHub || Rr();
  }
};
var Uf = ({ logger: e4, getState: t, analyticsClientMiddleware: r = (a, i) => i, preprocessRequest: n, provider: o = new va(t) }) => {
  let a = t(), i = a.configuration.accessToken, s = a.configuration.analytics.apiBaseUrl ?? de(a.configuration.organizationId, a.configuration.environment, "analytics"), u = a.configuration.analytics.runtimeEnvironment, c = a.configuration.analytics.enabled, d = new rs({ enableAnalytics: c, token: i, endpoint: s, runtimeEnvironment: u, preprocessRequest: Jn(e4, n), beforeSendHooks: [Xn(e4, r), (m, p) => (e4.info({ ...p, type: m, endpoint: s, token: i }, "Analytics request"), p)] }, o);
  return c || d.disable(), d;
};
function os() {
  return { desiredCount: 5, numberOfValues: 8, set: {} };
}
function ft(e4) {
  let { activeValue: t, ancestryMap: r } = CI(e4);
  return t ? AI(t, r) : [];
}
function CI(e4) {
  let t = [...e4], r = /* @__PURE__ */ new Map();
  for (; t.length > 0; ) {
    let n = t.shift();
    if (n.state === "selected") return { activeValue: n, ancestryMap: r };
    if (r) for (let o of n.children) r.set(o, n);
    t.unshift(...n.children);
  }
  return {};
}
function AI(e4, t) {
  let r = [];
  if (!e4) return [];
  let n = e4;
  do
    r.unshift(n), n = t.get(n);
  while (n);
  return r;
}
var zd = (e4, t) => e4.categoryFacetSet[t]?.request;
var Hd = (e4, t) => {
  let r = zd(e4, t);
  return ft(r?.currentValues ?? []);
};
function Zn() {
  return {};
}
function zf(e4) {
  return { request: e4 };
}
function eo() {
  return {};
}
function Hf(e4) {
  return { request: e4 };
}
function to() {
  return {};
}
function Wf(e4) {
  return { request: e4, hasBreadcrumbs: true };
}
function ro() {
  return {};
}
function je(e4) {
  return { facetSet: e4.facetSet ?? ro(), categoryFacetSet: e4.categoryFacetSet ?? Zn(), dateFacetSet: e4.dateFacetSet ?? eo(), numericFacetSet: e4.numericFacetSet ?? to(), automaticFacetSet: e4.automaticFacetSet ?? os() };
}
var as = (e4) => {
  let t = [];
  return bI(e4).forEach((r, n) => {
    let o = Zf(e4, r.facetId), a = EI(r, n + 1);
    if (FI(r)) {
      if (!!!Hd(e4, r.facetId).length) return;
      t.push({ ...a, ...wI(e4, r.facetId), facetType: o, state: "selected" });
      return;
    }
    r.currentValues.forEach((i, s) => {
      if (i.state === "idle") return;
      let u = Yf(i, s + 1, o), c = xI(r) ? Kf(i) : II(i);
      t.push({ ...a, ...u, ...c });
    });
  }), vI(e4).forEach((r, n) => {
    let o = PI(r, n + 1);
    r.values.forEach((a, i) => {
      if (a.state === "idle") return;
      let s = Yf(a, i + 1, "specific"), u = Kf(a);
      t.push({ ...o, ...s, ...u });
    });
  }), t;
};
var xI = (e4) => e4.type === "specific";
var FI = (e4) => e4.type === "hierarchical";
var bI = (e4) => [...Object.values(e4.facetSet), ...Object.values(e4.categoryFacetSet), ...Object.values(e4.dateFacetSet), ...Object.values(e4.numericFacetSet)].map((t) => t.request);
var vI = (e4) => [...Object.values(e4.automaticFacetSet.set)].map((t) => t.response);
var Yf = (e4, t, r) => ({ state: e4.state, valuePosition: t, facetType: r });
var II = (e4) => ({ displayValue: `${e4.start}..${e4.end}`, value: `${e4.start}..${e4.end}`, start: e4.start, end: e4.end, endInclusive: e4.endInclusive });
var Kf = (e4) => ({ displayValue: e4.value, value: e4.value });
var Jf = (e4, t) => Hd(e4, t).map((n) => n.value).join(";");
var wI = (e4, t) => {
  let n = Jf(e4, t);
  return { value: n, valuePosition: 1, displayValue: n };
};
var PI = (e4, t) => ({ title: Wd(e4.field, e4.field), field: e4.field, id: e4.field, facetPosition: t });
var EI = (e4, t) => ({ title: Wd(e4.field, e4.facetId), field: e4.field, id: e4.facetId, facetPosition: t });
var Wd = (e4, t) => `${e4}_${t}`;
var Xf = (e4, t) => e4.facetSet[t]?.request || e4.categoryFacetSet[t]?.request || e4.dateFacetSet[t]?.request || e4.numericFacetSet[t]?.request || e4.automaticFacetSet.set[t]?.response;
var Zf = (e4, t) => {
  let r = Xf(e4, t);
  return r ? r.type : "specific";
};
var fe = () => ({ q: "", enableQuerySyntax: false });
var TI = (e4) => {
  let t = e4.configuration.search.locale.split("-")[0];
  return !t || t.length !== 2 ? "en" : t;
};
var oo = class {
  constructor(t) {
    this.getState = t;
    ye(this, "state");
    this.state = t();
  }
  getLanguage() {
    return TI(this.state);
  }
  getBaseMetadata() {
    let { context: t, configuration: r } = this.state, n = t?.contextValues || {}, o = {};
    for (let [a, i] of Object.entries(n)) {
      let s = `context_${a}`;
      o[s] = i;
    }
    return r.analytics.analyticsMode === "legacy" && (o.coveoHeadlessVersion = Gn), o;
  }
  getOriginContext() {
    return this.state.configuration.analytics.originContext;
  }
  getOriginLevel1() {
    return this.state.searchHub || Rr();
  }
  getOriginLevel2() {
    return this.state.configuration.analytics.originLevel2;
  }
  getOriginLevel3() {
    return this.state.configuration.analytics.originLevel3;
  }
  getIsAnonymous() {
    return this.state.configuration.analytics.anonymous;
  }
};
var Ia = class extends oo {
  getSearchUID() {
    let t = this.getState();
    return t.search?.searchResponseId || t.search?.response.searchUid || xe().response.searchUid;
  }
  getPipeline() {
    return this.state.pipeline || this.state.search?.response.pipeline || "default";
  }
  getSearchEventRequestPayload() {
    return { queryText: this.queryText, responseTime: this.responseTime, results: this.mapResultsToAnalyticsDocument(), numberOfResults: this.numberOfResults };
  }
  getFacetState() {
    return as(je(this.state));
  }
  getBaseMetadata() {
    let t = this.getState(), r = super.getBaseMetadata(), n = t.search?.response?.extendedResults?.generativeQuestionAnsweringId;
    return n && (r.generativeQuestionAnsweringId = n), r;
  }
  getGeneratedAnswerMetadata() {
    let t = this.getState();
    return { ...t.generatedAnswer?.isVisible !== void 0 && { showGeneratedAnswer: t.generatedAnswer.isVisible } };
  }
  get queryText() {
    return this.state.query?.q || fe().q;
  }
  get responseTime() {
    return this.state.search?.duration || xe().duration;
  }
  mapResultsToAnalyticsDocument() {
    return this.state.search?.response.results.map((t) => ({ documentUri: t.uri, documentUriHash: t.raw.urihash }));
  }
  get numberOfResults() {
    return this.state.search?.response.results.length || xe().response.results.length;
  }
};
var eh = ({ logger: e4, getState: t, analyticsClientMiddleware: r = (a, i) => i, preprocessRequest: n, provider: o = new Ia(t) }) => {
  let a = t(), i = a.configuration.accessToken, s = a.configuration.analytics.apiBaseUrl ?? de(a.configuration.organizationId, a.configuration.environment, "analytics"), u = a.configuration.analytics.runtimeEnvironment, c = a.configuration.analytics.enabled, d = new ns({ enableAnalytics: c, token: i, endpoint: s, runtimeEnvironment: u, preprocessRequest: Jn(e4, n), beforeSendHooks: [Xn(e4, r), (m, p) => (e4.info({ ...p, type: m, endpoint: s, token: i }, "Analytics request"), p)] }, o);
  return c || d.disable(), d;
};
var Yd = ((r) => (r.Ascending = "ascending", r.Descending = "descending", r))(Yd || {});
var is = ((a) => (a.Relevancy = "relevancy", a.QRE = "qre", a.Date = "date", a.Field = "field", a.NoSort = "nosort", a))(is || {});
var ir = (e4) => {
  if (isArray(e4)) return e4.map((t) => ir(t)).join(",");
  switch (e4.by) {
    case "relevancy":
    case "qre":
    case "nosort":
      return e4.by;
    case "date":
      return `date ${e4.order}`;
    case "field":
      return `@${e4.field} ${e4.order}`;
    default:
      return "";
  }
};
var Kd = () => ({ by: "relevancy" });
var rh = new RecordValue({ values: { by: new EnumValue({ enum: is, required: true }), order: new EnumValue({ enum: Yd }), field: new StringValue() } });
function Ze() {
  return ir(Kd());
}
var wa = class wa2 extends oo {
  constructor() {
    super(...arguments);
    ye(this, "getFacetRequest", (r) => this.state.facetSet?.[r]?.request || this.state.categoryFacetSet?.[r]?.request || this.state.dateFacetSet?.[r]?.request || this.state.numericFacetSet?.[r]?.request || this.state.automaticFacetSet?.set[r]?.response);
  }
  getFacetState() {
    return as(je(this.getState()));
  }
  getPipeline() {
    return this.state.pipeline || this.state.search?.response.pipeline || wa2.fallbackPipelineName;
  }
  getSearchEventRequestPayload() {
    return { queryText: this.queryText, responseTime: this.responseTime, results: this.resultURIs, numberOfResults: this.numberOfResults };
  }
  getSearchUID() {
    let r = this.getState();
    return r.search?.searchResponseId || r.search?.response.searchUid || xe().response.searchUid;
  }
  getSplitTestRunName() {
    return this.state.search?.response.splitTestRun;
  }
  getSplitTestRunVersion() {
    let r = !!this.getSplitTestRunName(), n = this.state.search?.response.pipeline || this.state.pipeline || wa2.fallbackPipelineName;
    return r ? n : void 0;
  }
  getBaseMetadata() {
    let r = this.getState(), n = super.getBaseMetadata(), o = r.search?.response?.extendedResults?.generativeQuestionAnsweringId;
    return o && (n.generativeQuestionAnsweringId = o), n;
  }
  getFacetMetadata(r, n) {
    let a = this.getFacetRequest(r)?.field ?? "";
    return { ...this.getBaseMetadata(), facetId: r, facetField: a, facetValue: n, facetTitle: `${a}_${r}` };
  }
  getFacetClearAllMetadata(r) {
    let o = this.getFacetRequest(r)?.field ?? "";
    return { ...this.getBaseMetadata(), facetId: r, facetField: o, facetTitle: `${o}_${r}` };
  }
  getFacetUpdateSortMetadata(r, n) {
    let a = this.getFacetRequest(r)?.field ?? "";
    return { ...this.getBaseMetadata(), facetId: r, facetField: a, criteria: n, facetTitle: `${a}_${r}` };
  }
  getRangeBreadcrumbFacetMetadata(r, n) {
    let a = this.getFacetRequest(r)?.field ?? "";
    return { ...this.getBaseMetadata(), facetId: r, facetField: a, facetRangeEnd: n.end, facetRangeEndInclusive: n.endInclusive, facetRangeStart: n.start, facetTitle: `${a}_${r}` };
  }
  getResultSortMetadata() {
    return { ...this.getBaseMetadata(), resultsSortBy: this.state.sortCriteria ?? Ze() };
  }
  getStaticFilterToggleMetadata(r, n) {
    return { ...this.getBaseMetadata(), staticFilterId: r, staticFilterValue: n };
  }
  getStaticFilterClearAllMetadata(r) {
    return { ...this.getBaseMetadata(), staticFilterId: r };
  }
  getUndoTriggerQueryMetadata(r) {
    return { ...this.getBaseMetadata(), undoneQuery: r };
  }
  getCategoryBreadcrumbFacetMetadata(r, n) {
    let a = this.getFacetRequest(r)?.field ?? "";
    return { ...this.getBaseMetadata(), categoryFacetId: r, categoryFacetField: a, categoryFacetPath: n, categoryFacetTitle: `${a}_${r}` };
  }
  getOmniboxAnalyticsMetadata(r, n) {
    let o = this.state.querySuggest && this.state.querySuggest[r], a = o.completions.map((c) => c.expression), i = o.partialQueries.length - 1, s = o.partialQueries[i] || "", u = o.responseId;
    return { ...this.getBaseMetadata(), suggestionRanking: a.indexOf(n), partialQuery: s, partialQueries: o.partialQueries.length > 0 ? o.partialQueries : "", suggestions: a.length > 0 ? a : "", querySuggestResponseId: u };
  }
  getInterfaceChangeMetadata() {
    return { ...this.getBaseMetadata(), interfaceChangeTo: this.state.configuration.analytics.originLevel2 };
  }
  getOmniboxFromLinkMetadata(r) {
    return { ...this.getBaseMetadata(), ...r };
  }
  getGeneratedAnswerMetadata() {
    let r = this.getState(), n = {};
    return r.generatedAnswer?.isVisible !== void 0 && (n.showGeneratedAnswer = r.generatedAnswer.isVisible), n;
  }
  get resultURIs() {
    return this.results?.map((r) => ({ documentUri: r.uri, documentUriHash: r.raw.urihash }));
  }
  get results() {
    return this.state.search?.response.results;
  }
  get queryText() {
    return this.state.query?.q || fe().q;
  }
  get responseTime() {
    return this.state.search?.duration || xe().duration;
  }
  get numberOfResults() {
    return this.state.search?.response.totalCountFiltered || xe().response.totalCountFiltered;
  }
};
ye(wa, "fallbackPipelineName", "default");
var xr = wa;
var nh = ({ logger: e4, getState: t, analyticsClientMiddleware: r = (a, i) => i, preprocessRequest: n, provider: o = new xr(t) }) => {
  let a = t(), i = a.configuration.accessToken, s = a.configuration.analytics.apiBaseUrl ?? de(a.configuration.organizationId, a.configuration.environment, "analytics"), u = a.configuration.analytics.runtimeEnvironment, c = a.configuration.analytics.enabled, d = new Xi({ token: i, endpoint: s, runtimeEnvironment: u, preprocessRequest: Jn(e4, n), beforeSendHooks: [Xn(e4, r), (m, p) => (e4.info({ ...p, type: m, endpoint: s, token: i }, "Analytics request"), p)] }, o);
  return c || d.disable(), d;
};
var Jd = () => {
  let t = _e.getHistory().reverse().find((r) => r.name === "PageView" && r.value);
  return t ? t.value : "";
};
function ss(e4) {
  let t = oh(e4), r = [e4, ...t].filter((o) => o.parentResult).map((o) => o.parentResult);
  return Km([e4, ...t, ...r], (o) => o.uniqueId);
}
function oh(e4) {
  return e4.childResults ? e4.childResults.flatMap((t) => [t, ...oh(t)]) : [];
}
var cs = () => "";
function ih(e4, t) {
  return { ...new xr(t).getBaseMetadata(), actionCause: e4, type: e4 };
}
function MI(e4) {
  return Object.assign(e4, { instantlyCallable: true });
}
function QI(e4, t) {
  let r = (a) => MI(L(e4, a)), n = r(async (a, { getState: i, extra: s }) => {
    let { analyticsClientMiddleware: u, preprocessRequest: c, logger: d } = s;
    return await (await t({ getState: i, analyticsClientMiddleware: u, preprocessRequest: c, logger: d })).log({ state: i(), extra: s });
  });
  return Object.assign(n, { prepare: async ({ getState: a, analyticsClientMiddleware: i, preprocessRequest: s, logger: u }) => {
    let { description: c, log: d } = await t({ getState: a, analyticsClientMiddleware: i, preprocessRequest: s, logger: u });
    return { description: c, action: r(async (m, { getState: p, extra: l }) => await d({ state: p(), extra: l })) };
  } }), n;
}
var Xd = (e4, t, r) => {
  function n(...o) {
    let a = o.length === 1 ? { ...o[0], __legacy__getBuilder: t(o[0].__legacy__getBuilder), analyticsConfigurator: e4, providerClass: r } : { prefix: o[0], __legacy__getBuilder: t(o[1]), __legacy__provider: o[2], analyticsConfigurator: e4, providerClass: r };
    return UI(a);
  }
  return n;
};
var LI = (e4) => e4.configuration.analytics.analyticsMode === "legacy";
var BI = (e4) => e4.configuration.analytics.analyticsMode === "next";
var UI = ({ prefix: e4, __legacy__getBuilder: t, __legacy__provider: r, analyticsPayloadBuilder: n, analyticsType: o, analyticsConfigurator: a, providerClass: i }) => (r ?? (r = (s) => new i(s)), QI(e4, async ({ getState: s, analyticsClientMiddleware: u, preprocessRequest: c, logger: d }) => {
  let m = [], p = { log: async ({ state: R }) => {
    for (let f of m) await f(R);
  } }, l = s(), g = a({ getState: s, logger: d, analyticsClientMiddleware: u, preprocessRequest: c, provider: r(s) }), A = await t(g, s());
  p.description = A?.description, m.push(async (R) => {
    LI(R) && await _I(A, r, R, d, g.coveoAnalyticsClient);
  });
  let { emit: y } = zn(l);
  return m.push(async (R) => {
    if (BI(R) && o && n) {
      let f = n(R);
      await YI(y, o, f);
    }
  }), p;
}));
async function _I(e4, t, r, n, o) {
  t(() => r);
  let a = await e4?.log({ searchUID: t(() => r).getSearchUID() });
  n.info({ client: o, response: a }, "Analytics response");
}
var sh = (e4) => (r) => (n, o) => Promise.resolve({ description: { actionCause: e4 }, log: async (a) => {
  r(n, o);
} });
var le = Xd(nh, (e4) => e4, xr);
var W0 = Xd(Uf, sh("caseAssist"), va);
var N = (e4) => Xd(eh, sh(e4), Ia);
var ch = { urihash: new StringValue(), sourcetype: new StringValue(), permanentid: new StringValue() };
var ls = { uniqueId: E, raw: new RecordValue({ values: ch }), title: E, uri: E, clickUri: E, rankingModifier: new StringValue({ required: false, emptyAllowed: true }) };
function $I(e4) {
  return Object.assign({}, ...Object.keys(ch).map((t) => ({ [t]: e4[t] })));
}
function GI(e4) {
  return Object.assign({}, ...Object.keys(ls).map((t) => ({ [t]: e4[t] })), { raw: $I(e4.raw) });
}
var Ee = (e4) => new Schema(ls).validate(GI(e4));
async function YI(e4, t, r) {
  await e4(t, r);
}
var ep = () => ne;
var fh = () => E;
var io = S("configuration/updateBasicConfiguration", (e4) => x(e4, { accessToken: ne, environment: new StringValue({ required: false, constrainTo: ["prod", "hipaa", "stg", "dev"] }), organizationId: ne }));
var so = S("configuration/updateSearchConfiguration", (e4) => x(e4, { proxyBaseUrl: new StringValue({ required: false, url: true }), pipeline: new StringValue({ required: false, emptyAllowed: true }), searchHub: ne, timezone: ne, locale: ne, authenticationProviders: new ArrayValue({ required: false, each: E }) }));
var ZI = { enabled: new BooleanValue({ default: true }), originContext: ep(), originLevel2: ep(), originLevel3: ep(), proxyBaseUrl: new StringValue({ required: false, url: true }), runtimeEnvironment: new Value(), anonymous: new BooleanValue({ default: false }), deviceId: ne, userDisplayName: ne, documentLocation: ne, trackingId: ne, analyticsMode: new StringValue({ constrainTo: ["legacy", "next"], required: false, default: "next" }), source: new RecordValue({ options: { required: false }, values: ff.reduce((e4, t) => (e4[t] = Tg, e4), {}) }) };
var ds = S("configuration/updateAnalyticsConfiguration", (e4) => x(e4, ZI));
var ps = S("configuration/analytics/disable");
var ms = S("configuration/analytics/enable");
var hh = S("configuration/analytics/originlevel2", (e4) => x(e4, { originLevel2: fh() }));
var yh = S("configuration/analytics/originlevel3", (e4) => x(e4, { originLevel3: fh() }));
var gs = S("insightConfiguration/set", (e4) => x(e4, { insightId: E }));
var Sh = () => ({ insightId: "" });
var fs = $(Sh(), (e4) => {
  e4.addCase(gs, (t, r) => {
    t.insightId = r.payload.insightId;
  });
});
var hs = S("searchHub/set", (e4) => x(e4, new StringValue({ required: true, emptyAllowed: true })));
var Fr = L("insight/interface/fetch", async (e4, { getState: t, dispatch: r, rejectWithValue: n, extra: { apiClient: o } }) => {
  let a = t(), i = await o.getInterface(tw(a));
  return oe(i) ? n(i.error) : (r(hs(i.success.searchHub)), { response: i.success });
});
var tw = (e4) => ({ accessToken: e4.configuration.accessToken, organizationId: e4.configuration.organizationId, url: de(e4.configuration.organizationId, e4.configuration.environment), insightId: e4.insightConfiguration.insightId });
var Ch = () => ({ loading: false, config: void 0 });
var br = $(Ch(), (e4) => {
  e4.addCase(Fr.pending, (t) => {
    t.loading = true, t.error = void 0;
  }).addCase(Fr.rejected, (t, r) => {
    t.loading = false, t.error = r.payload;
  }).addCase(Fr.fulfilled, (t, r) => {
    t.loading = false, t.error = void 0;
    let { searchHub: n, ...o } = r.payload.response;
    t.config = o;
  });
});
var Ea = bt(ys(), 1);
var Ih = bt(Ah(), 1);
var Ss = bt(ys(), 1);
var xh = bt(Rh(), 1);
Ss.default.extend(xh.default);
var Fh = "YYYY/MM/DD@HH:mm:ss";
var rw = "1401-01-01";
function co(e4, t) {
  let r = (0, Ss.default)(e4, t);
  return !r.isValid() && !t ? (0, Ss.default)(e4, Fh) : r;
}
function Cs(e4) {
  return e4.format(Fh);
}
function bh(e4, t) {
  let r = co(e4, t);
  if (!r.isValid()) {
    let n = ". Please provide a date format string in the configuration options. See https://day.js.org/docs/en/parse/string-format for more information.", o = ` with the format "${t}"`;
    throw new Error(`Could not parse the provided date "${e4}"${t ? o : n}`);
  }
  sp(r);
}
function sp(e4) {
  if (e4.isBefore(rw)) throw new Error(`Date is before year 1401, which is unsupported by the API: ${e4}`);
}
Ea.default.extend(Ih.default);
var wh = ["past", "now", "next"];
var Ph = ["minute", "hour", "day", "week", "month", "quarter", "year"];
var aw = (e4) => {
  let t = e4 === "now";
  return { amount: new NumberValue({ required: !t, min: 1 }), unit: new StringValue({ required: !t, constrainTo: Ph }), period: new StringValue({ required: true, constrainTo: wh }) };
};
function As(e4) {
  if (typeof e4 == "string" && !vr(e4)) throw new Error(`The value "${e4}" is not respecting the relative date format "period-amount-unit"`);
  let t = typeof e4 == "string" ? cp(e4) : e4;
  new Schema(aw(t.period)).validate(t);
  let r = Th(t), n = JSON.stringify(t);
  if (!r.isValid()) throw new Error(`Date is invalid: ${n}`);
  sp(r);
}
function Eh(e4) {
  let { period: t, amount: r, unit: n } = e4;
  switch (t) {
    case "past":
    case "next":
      return `${t}-${r}-${n}`;
    case "now":
      return t;
  }
}
function Th(e4) {
  let { period: t, amount: r, unit: n } = e4;
  switch (t) {
    case "past":
      return (0, Ea.default)().subtract(r, n);
    case "next":
      return (0, Ea.default)().add(r, n);
    case "now":
      return (0, Ea.default)();
  }
}
function Ta(e4) {
  return Cs(Th(cp(e4)));
}
function kh(e4) {
  return e4.toLocaleLowerCase().split("-");
}
function vr(e4) {
  let [t, r, n] = kh(e4);
  if (t === "now") return true;
  if (!wh.includes(t) || !Ph.includes(n)) return false;
  let o = parseInt(r);
  return !(isNaN(o) || o <= 0);
}
function Oh(e4) {
  return !!e4 && typeof e4 == "object" && "period" in e4;
}
function cp(e4) {
  let [t, r, n] = kh(e4);
  return t === "now" ? { period: "now" } : { period: t, amount: r ? parseInt(r) : void 0, unit: n || void 0 };
}
function qh(e4) {
  return e4.type === "dateRange";
}
function Dh(e4) {
  return `start${e4}`;
}
function Vh(e4) {
  return `end${e4}`;
}
var up = () => ({ dateFacetValueMap: {} });
function sw(e4, t, r) {
  let n = e4.start, o = e4.end;
  return vr(n) && (n = Ta(n), r.dateFacetValueMap[t][Dh(n)] = e4.start), vr(o) && (o = Ta(o), r.dateFacetValueMap[t][Vh(o)] = e4.end), { ...e4, start: n, end: o };
}
function lp(e4, t) {
  if (qh(e4)) {
    let { facetId: r, currentValues: n } = e4;
    return t.dateFacetValueMap[r] = {}, { ...e4, currentValues: n.map((o) => sw(o, r, t)) };
  }
  return e4;
}
function Ot(e4) {
  let t = up();
  return { request: { ...e4, facets: e4.facets?.map((n) => lp(n, t)) }, mappings: t };
}
function cw(e4, t, r) {
  return { ...e4, start: r.dateFacetValueMap[t][Dh(e4.start)] || e4.start, end: r.dateFacetValueMap[t][Vh(e4.end)] || e4.end };
}
function uw(e4, t) {
  return e4.facetId in t.dateFacetValueMap;
}
function lw(e4, t) {
  return uw(e4, t) ? { ...e4, values: e4.values.map((r) => cw(r, e4.facetId, t)) } : e4;
}
function yt(e4, t) {
  return "success" in e4 ? { success: { ...e4.success, facets: e4.success.facets?.map((n) => lw(n, t)) } } : e4;
}
var Ir = async (e4, t) => {
  let r = e4.analyticsMode === "next";
  return { analytics: { clientId: await it(e4), clientTimestamp: (/* @__PURE__ */ new Date()).toISOString(), documentReferrer: e4.originLevel3, originContext: e4.originContext, ...t && { actionCause: t.actionCause, customData: t.customData }, ...t && !r && { customData: t.customData }, ...e4.userDisplayName && { userDisplayName: e4.userDisplayName }, ...e4.documentLocation && { documentLocation: e4.documentLocation }, ...e4.deviceId && { deviceId: e4.deviceId }, ...Jd() && { pageId: Jd() }, ...r && e4.trackingId && { trackingId: e4.trackingId }, capture: r, ...r && { source: Et(e4) } } };
};
var Nh = async (e4, t) => ({ accessToken: t.configuration.accessToken, organizationId: t.configuration.organizationId, url: de(t.configuration.organizationId, t.configuration.environment), count: t.querySuggest[e4].count, insightId: t.insightConfiguration.insightId, q: t.querySet?.[e4], timezone: t.configuration.search.timezone, actionsHistory: t.configuration.analytics.enabled ? _e.getHistory() : [], ...t.insightCaseContext?.caseContext && { context: t.insightCaseContext.caseContext }, ...t.configuration.analytics.enabled && { visitorId: await it(t.configuration.analytics), ...t.configuration.analytics.enabled && await Ir(t.configuration.analytics) } });
var Rs = S("didYouMean/enable");
var Mh = S("didYouMean/disable");
var xs = S("didYouMean/automaticCorrections/disable");
var Qh = S("didYouMean/automaticCorrections/enable");
var $e = S("didYouMean/correction", (e4) => x(e4, E));
var Fs = S("didYouMean/automaticCorrections/mode", (e4) => x(e4, new StringValue({ constrainTo: ["next", "legacy"], emptyAllowed: false, required: true })));
var wr = () => ({ correctedQuery: "", wordCorrections: [], originalQuery: "" });
var Lh = () => ({ correctedQuery: "", corrections: [], originalQuery: "" });
function Bh() {
  return { enableDidYouMean: false, wasCorrectedTo: "", wasAutomaticallyCorrected: false, queryCorrection: wr(), originalQuery: "", automaticallyCorrectQuery: true, queryCorrectionMode: "legacy" };
}
var pw = S("history/undo");
var mw = S("history/redo");
var ke = S("history/snapshot");
var oB = L("history/back", async (e4, { dispatch: t }) => {
  t(pw()), await t(me());
});
var aB = L("history/forward", async (e4, { dispatch: t }) => {
  t(mw()), await t(me());
});
var me = L("history/change", async (e4, { getState: t }) => t().history.present);
var sr = () => ({ cq: "", cqWasSet: false, aq: "", aqWasSet: false, lq: "", lqWasSet: false, dq: "", dqWasSet: false, defaultFilters: { cq: "", aq: "", lq: "", dq: "" } });
function bs() {
  return { contextValues: {} };
}
var vs = () => false;
function Uh() {
  return { contextValues: {} };
}
function dp() {
  return { enabled: true, tabs: {} };
}
function Is() {
  return { freezeFacetOrder: false, facets: {} };
}
function _h() {
  return [];
}
function qt() {
  return { firstResult: 0, defaultNumberOfResults: 10, numberOfResults: 10, totalCountFiltered: 0 };
}
function ws() {
  return {};
}
function jh() {
  return {};
}
function Ps() {
  return {};
}
function Oe(e4) {
  return { context: e4.context || bs(), dictionaryFieldContext: e4.dictionaryFieldContext || Uh(), facetSet: e4.facetSet || ro(), numericFacetSet: e4.numericFacetSet || to(), dateFacetSet: e4.dateFacetSet || eo(), categoryFacetSet: e4.categoryFacetSet || Zn(), automaticFacetSet: e4.automaticFacetSet ?? os(), pagination: e4.pagination || qt(), query: e4.query || fe(), tabSet: e4.tabSet || Ps(), advancedSearchQueries: e4.advancedSearchQueries || sr(), staticFilterSet: e4.staticFilterSet || jh(), querySet: e4.querySet || ws(), sortCriteria: e4.sortCriteria || Ze(), pipeline: e4.pipeline || cs(), searchHub: e4.searchHub || Rr(), facetOptions: e4.facetOptions || Is(), facetOrder: e4.facetOrder ?? _h(), debug: e4.debug ?? vs() };
}
var Ge = S("query/updateQuery", (e4) => x(e4, { q: new StringValue(), enableQuerySyntax: new BooleanValue() }));
var $h = () => ({ caseContext: {}, caseId: "", caseNumber: "" });
var V = (e4) => ({ caseContext: e4?.caseContext || {}, caseId: e4?.caseId, caseNumber: e4?.caseNumber });
var pp = () => N("browseResults")("search/logFetchMoreResults", (e4, t) => e4.logFetchMoreResults(V(t.insightCaseContext)));
var uo = (e4) => N("query")("search/queryError", (t, r) => t.logQueryError({ ...V(r.insightCaseContext), query: r.query?.q || fe().q, aq: "", cq: "", dq: "", errorType: e4.type, errorMessage: e4.message }));
function Dt(e4) {
  return Object.values(e4).map((t) => t.request);
}
var zh = async (e4, t) => {
  let r = yw(e4), n = hw(e4);
  return Ot({ accessToken: e4.configuration.accessToken, organizationId: e4.configuration.organizationId, url: e4.configuration.search.apiBaseUrl ?? de(e4.configuration.organizationId, e4.configuration.environment), locale: e4.configuration.search.locale, insightId: e4.insightConfiguration.insightId, ...e4.configuration.analytics.enabled && await Ir(e4.configuration.analytics, t), q: e4.query?.q, ...n.length && { facets: n }, caseContext: e4.insightCaseContext?.caseContext, ...r && { cq: r }, ...e4.fields && !e4.fields.fetchAllFields && { fieldsToInclude: e4.fields.fieldsToInclude }, ...e4.didYouMean && { enableDidYouMean: e4.didYouMean.enableDidYouMean }, ...e4.sortCriteria && { sortCriteria: e4.sortCriteria }, tab: e4.configuration.analytics.originLevel2, ...e4.folding && { filterField: e4.folding.fields.collection, childField: e4.folding.fields.parent, parentField: e4.folding.fields.child, filterFieldRange: e4.folding.filterFieldRange }, ...e4.context && { context: e4.context.contextValues }, ...e4.generatedAnswer && { pipelineRuleParameters: { mlGenerativeQuestionAnswering: { responseFormat: e4.generatedAnswer.responseFormat, citationsFieldToInclude: e4.generatedAnswer.fieldsToIncludeInCitations } } } });
};
var st = async (e4, t) => {
  let r = () => e4.pagination ? e4.pagination.firstResult + e4.pagination.numberOfResults > 5e3 ? 5e3 - e4.pagination.firstResult : e4.pagination.numberOfResults : void 0, n = await zh(e4, t);
  return { ...n, request: { ...n.request, ...e4.pagination && { firstResult: e4.pagination.firstResult, numberOfResults: r() } } };
};
var Hh = async (e4, t) => {
  let r = await zh(e4);
  return { ...r, request: { ...r.request, filterFieldRange: 100, cq: `@${e4?.folding?.fields.collection}="${t}"` } };
};
var Ts = async (e4, t) => {
  let r = await st(e4, t);
  return r.request = { ...r.request, firstResult: (e4.pagination?.firstResult ?? 0) + (e4.pagination?.numberOfResults ?? 0) }, r;
};
var ks = async (e4, t) => {
  let r = await st(e4, t);
  return r.request = { ...r.request, numberOfResults: 0 }, r;
};
function hw(e4) {
  return Dt({ ...e4.facetSet, ...e4.numericFacetSet, ...e4.dateFacetSet, ...e4.categoryFacetSet });
}
function yw(e4) {
  return Object.values(e4.tabSet || {}).find((n) => n.isActive)?.expression.trim() || "";
}
var Fn = class {
  constructor(t) {
    this.config = t;
  }
  async fetchFromAPI({ request: t, mappings: r }, n) {
    let o = (/* @__PURE__ */ new Date()).getTime(), a = yt(await this.extra.apiClient.query(t, n), r), i = (/* @__PURE__ */ new Date()).getTime() - o, s = this.getState().query?.q || "";
    return { response: a, duration: i, queryExecuted: s, requestExecuted: t };
  }
  async process(t) {
    return this.processQueryErrorOrContinue(t) ?? await this.processQueryCorrectionsOrContinue(t) ?? this.processSuccessResponse(t);
  }
  processQueryErrorOrContinue(t) {
    return oe(t.response) ? (this.dispatch(uo(t.response.error)), this.rejectWithValue(t.response.error)) : null;
  }
  async processQueryCorrectionsOrContinue(t) {
    if (!this.shouldReExecuteTheQueryWithCorrections(t) || oe(t.response)) return null;
    let { correctedQuery: r } = t.response.success.queryCorrections ? t.response.success.queryCorrections[0] : wr(), n = this.getCurrentQuery(), o = await this.automaticallyRetryQueryWithCorrection(r);
    return oe(o.response) ? (this.dispatch(uo(o.response.error)), this.rejectWithValue(o.response.error)) : (this.dispatch(ke(Oe(this.getState()))), { ...o, response: { ...o.response.success, queryCorrections: t.response.success.queryCorrections }, automaticallyCorrected: true, originalQuery: n });
  }
  shouldReExecuteTheQueryWithCorrections(t) {
    let r = this.getState(), n = this.getSuccessResponse(t);
    return !!(r.didYouMean?.enableDidYouMean === true && n?.results.length === 0 && n?.queryCorrections && n?.queryCorrections.length !== 0);
  }
  async automaticallyRetryQueryWithCorrection(t) {
    this.dispatch(Ge({ q: t }));
    let r = this.getState(), n = await this.fetchFromAPI(await st(r));
    return this.dispatch($e(t)), n;
  }
  processSuccessResponse(t) {
    return this.dispatch(ke(Oe(this.getState()))), { ...t, response: this.getSuccessResponse(t), automaticallyCorrected: false, originalQuery: this.getCurrentQuery() };
  }
  getSuccessResponse(t) {
    return Sr(t.response) ? t.response.success : null;
  }
  get extra() {
    return this.config.extra;
  }
  getState() {
    return this.config.getState();
  }
  get dispatch() {
    return this.config.dispatch;
  }
  get rejectWithValue() {
    return this.config.rejectWithValue;
  }
  getCurrentQuery() {
    let t = this.getState();
    return t.query?.q !== void 0 ? t.query.q : "";
  }
};
var Yh = () => N("didYouMeanAutomatic")("analytics/didyoumean/automatic", (e4, t) => e4.logDidYouMeanAutomatic(V(t.insightCaseContext)));
var bn = class {
  constructor(t) {
    this.config = t;
  }
  async fetchFromAPI({ request: t, mappings: r }, n) {
    let o = (/* @__PURE__ */ new Date()).getTime(), a = yt(await this.extra.apiClient.query(t, n), r), i = (/* @__PURE__ */ new Date()).getTime() - o, s = this.getState().query?.q || "";
    return { response: a, duration: i, queryExecuted: s, requestExecuted: t };
  }
  async process(t, r) {
    return this.processQueryErrorOrContinue(t) ?? await this.processQueryCorrectionsOrContinue(t, r) ?? this.processSuccessResponse(t);
  }
  processQueryErrorOrContinue(t) {
    return oe(t.response) ? (this.dispatch(uo(t.response.error)), this.rejectWithValue(t.response.error)) : null;
  }
  async processQueryCorrectionsOrContinue(t, r) {
    if (!this.shouldReExecuteTheQueryWithCorrections(t) || oe(t.response)) return null;
    let { correctedQuery: n } = t.response.success.queryCorrections ? t.response.success.queryCorrections[0] : wr(), o = this.getCurrentQuery(), a = await this.automaticallyRetryQueryWithCorrection(n);
    return oe(a.response) ? (this.dispatch(uo(a.response.error)), this.rejectWithValue(a.response.error)) : (this.logOriginalAnalyticsQueryBeforeAutoCorrection(t, r), this.dispatch(ke(Oe(this.getState()))), { ...a, response: { ...a.response.success, queryCorrections: t.response.success.queryCorrections }, automaticallyCorrected: true, originalQuery: o, analyticsAction: Yh() });
  }
  shouldReExecuteTheQueryWithCorrections(t) {
    let r = this.getState(), n = this.getSuccessResponse(t);
    return !!(r.didYouMean?.enableDidYouMean === true && n?.results.length === 0 && n?.queryCorrections && n?.queryCorrections.length !== 0);
  }
  async automaticallyRetryQueryWithCorrection(t) {
    this.dispatch(Ge({ q: t }));
    let r = this.getState(), n = await this.fetchFromAPI(await st(r));
    return this.dispatch($e(t)), n;
  }
  processSuccessResponse(t) {
    return this.dispatch(ke(Oe(this.getState()))), { ...t, response: this.getSuccessResponse(t), automaticallyCorrected: false, originalQuery: this.getCurrentQuery(), analyticsAction: this.analyticsAction };
  }
  getSuccessResponse(t) {
    return Sr(t.response) ? t.response.success : null;
  }
  getStateAfterResponse(t, r, n, o) {
    return { ...n, query: { q: t, enableQuerySyntax: n.query?.enableQuerySyntax ?? fe().enableQuerySyntax }, search: { ...xe(), duration: r, response: o, results: o.results } };
  }
  logOriginalAnalyticsQueryBeforeAutoCorrection(t, r) {
    let n = this.getState(), o = yt(t.response, r.mappings).success;
    this.analyticsAction && this.analyticsAction()(this.dispatch, () => this.getStateAfterResponse(t.queryExecuted, t.duration, n, o), this.extra);
  }
  get extra() {
    return this.config.extra;
  }
  getState() {
    return this.config.getState();
  }
  get dispatch() {
    return this.config.dispatch;
  }
  get rejectWithValue() {
    return this.config.rejectWithValue;
  }
  getCurrentQuery() {
    let t = this.getState();
    return t.query?.q !== void 0 ? t.query.q : "";
  }
  get analyticsAction() {
    return this.config.analyticsAction;
  }
};
async function mp(e4, t, r) {
  ka(e4);
  let n = new bn({ ...t, analyticsAction: r }), { analyticsClientMiddleware: o, preprocessRequest: a, logger: i } = t.extra, { description: s } = await r.prepare({ getState: () => t.getState(), analyticsClientMiddleware: o, preprocessRequest: a, logger: i }), u = await st(e4, s), c = await n.fetchFromAPI(u);
  return await n.process(c, u);
}
async function gp(e4, t, r) {
  ka(e4);
  let n = new bn({ ...t, analyticsAction: r }), { analyticsClientMiddleware: o, preprocessRequest: a, logger: i } = t.extra, { description: s } = await r.prepare({ getState: () => t.getState(), analyticsClientMiddleware: o, preprocessRequest: a, logger: i }), u = await st(e4, s), c = await n.fetchFromAPI(u);
  return await n.process(c, u);
}
async function fp(e4, t) {
  let r = new bn({ ...t, analyticsAction: pp }), { analyticsClientMiddleware: n, preprocessRequest: o, logger: a } = t.extra, { description: i } = await pp().prepare({ getState: () => t.getState(), analyticsClientMiddleware: n, preprocessRequest: o, logger: a }), s = await Ts(e4, i), u = await r.fetchFromAPI(s);
  return await r.process(u, s);
}
async function hp(e4, t, r) {
  let n = new bn({ ...t, analyticsAction: r }), { analyticsClientMiddleware: o, preprocessRequest: a, logger: i } = t.extra, { description: s } = await r.prepare({ getState: () => t.getState(), analyticsClientMiddleware: o, preprocessRequest: a, logger: i }), u = await ks(e4, s), c = await n.fetchFromAPI(u);
  return await n.process(c, u);
}
var Kh = L("search/executeSearch", async (e4, t) => {
  let r = t.getState();
  return await mp(r, t, e4);
});
var Jh = L("search/fetchPage", async (e4, t) => {
  let r = t.getState();
  return await gp(r, t, e4);
});
var Xh = L("search/fetchMoreResults", async (e4, t) => {
  let r = t.getState();
  return await fp(r, t);
});
var Zh = L("search/fetchFacetValues", async (e4, t) => {
  let r = t.getState();
  return await hp(r, t, e4);
});
var ey = async (e4, t, { request: r, mappings: n }, o) => {
  let a = (/* @__PURE__ */ new Date()).getTime(), i = yt(await e4.query(r, o), n), s = (/* @__PURE__ */ new Date()).getTime() - a, u = t.query?.q || "";
  return { response: i, duration: s, queryExecuted: u, requestExecuted: r };
};
var Y = L("search/executeSearch", async (e4, t) => {
  let r = t.getState();
  if (r.configuration.analytics.analyticsMode === "legacy") return mp(r, t, e4.legacy);
  ka(r);
  let n = new Fn({ ...t }), o = e4.next ? yp(e4.next) : void 0, a = await st(r, o), i = await n.fetchFromAPI(a);
  return await n.process(i);
});
var Os = L("search/fetchPage", async (e4, t) => {
  let r = t.getState();
  if (r.configuration.analytics.analyticsMode === "legacy") return gp(r, t, e4.legacy);
  ka(r);
  let n = new Fn({ ...t }), o = e4.next ? yp(e4.next) : void 0, a = await st(r, o), i = await n.fetchFromAPI(a);
  return await n.process(i);
});
var qs = L("search/fetchMoreResults", async (e4, t) => {
  let r = t.getState();
  if (r.configuration.analytics.analyticsMode === "legacy") return fp(r, t);
  let n = new Fn({ ...t }), o = yp({ actionCause: "browseResults" }), a = await Ts(r, o), i = await n.fetchFromAPI(a);
  return await n.process(i);
});
var lo = L("search/fetchFacetValues", async (e4, t) => {
  let r = t.getState();
  if (r.configuration.analytics.analyticsMode === "legacy") return hp(r, t, e4.legacy);
  let n = new Fn({ ...t }), o = await ks(r), a = await n.fetchFromAPI(o);
  return await n.process(a);
});
var Ds = L("querySuggest/fetch", async (e4, { getState: t, rejectWithValue: r, extra: { apiClient: n, validatePayload: o } }) => {
  o(e4, { id: E });
  let a = e4.id, i = await Nh(a, t()), s = await n.querySuggest(i);
  return oe(s) ? r(s.error) : { id: a, q: i.q, ...s.success };
});
var ka = (e4) => {
  e4.configuration.analytics.enabled && _e.addElement({ name: "Query", ...e4.query?.q && { value: e4.query.q }, time: JSON.stringify(/* @__PURE__ */ new Date()) });
};
var yp = (e4) => ({ actionCause: e4.actionCause, type: e4.actionCause });
var qe = S("breadcrumb/deselectAll");
var Er = S("breadcrumb/deselectAllNonBreadcrumbs");
var Tr = S("facet/updateFacetAutoSelection", (e4) => x(e4, { allow: new BooleanValue({ required: true }) }));
var Vs = class extends xr {
  constructor(r) {
    super(r);
    this.getState = r;
  }
  get activeInstantResultQuery() {
    let r = this.getState().instantResults;
    for (let n in r) for (let o in r[n].cache) if (r[n].cache[o].isActive) return r[n].q;
    return null;
  }
  get activeInstantResultCache() {
    let r = this.getState().instantResults;
    for (let n in r) for (let o in r[n].cache) if (r[n].cache[o].isActive) return r[n].cache[o];
    return null;
  }
  get results() {
    return this.activeInstantResultCache?.results;
  }
  get queryText() {
    return this.activeInstantResultQuery ?? fe().q;
  }
  get responseTime() {
    return this.activeInstantResultCache?.duration ?? xe().duration;
  }
  get numberOfResults() {
    return this.activeInstantResultCache?.totalCountFiltered ?? xe().response.totalCountFiltered;
  }
  getSearchUID() {
    return this.activeInstantResultCache?.searchUid || super.getSearchUID();
  }
};
var ty = () => le("analytics/instantResult/searchboxAsYouType", (e4) => e4.makeSearchboxAsYouType(), (e4) => new Vs(e4));
var ry = () => ({ actionCause: "searchboxAsYouType" });
var Sp = { id: E };
var Cw = { ...Sp, q: se };
var I_ = S("instantResults/register", (e4) => x(e4, Sp));
var Ns = S("instantResults/updateQuery", (e4) => x(e4, Cw));
var w_ = S("instantResults/clearExpired", (e4) => x(e4, Sp));
var Ms = new NumberValue({ required: true, min: 0 });
var Qs = S("pagination/registerNumberOfResults", (e4) => x(e4, Ms));
var Ls = S("pagination/updateNumberOfResults", (e4) => x(e4, Ms));
var Bs = S("pagination/registerPage", (e4) => x(e4, Ms));
var Vt = S("pagination/updatePage", (e4) => x(e4, Ms));
var Us = S("pagination/nextPage");
var _s = S("pagination/previousPage");
var js = (e4, t, r) => ({ analytics: { clientId: t.clientId, clientTimestamp: (/* @__PURE__ */ new Date()).toISOString(), documentReferrer: t.referrer, documentLocation: t.location, originContext: e4.originContext, ...r && { actionCause: r.actionCause }, ...r && { customData: r.customData }, ...e4.userDisplayName && { userDisplayName: e4.userDisplayName }, ...e4.deviceId && { deviceId: e4.deviceId }, ...e4.trackingId && { trackingId: e4.trackingId }, capture: true, source: Et(e4) } });
var po = (e4, t, r) => ({ accessToken: e4.configuration.accessToken, organizationId: e4.configuration.organizationId, url: e4.configuration.search.apiBaseUrl ?? Le(e4.configuration.organizationId, e4.configuration.environment), locale: e4.configuration.search.locale, debug: e4.debug, tab: e4.configuration.analytics.originLevel2, referrer: t.referrer, timezone: e4.configuration.search.timezone, ...e4.configuration.analytics.enabled && { visitorId: t.clientId }, ...e4.advancedSearchQueries?.aq && { aq: e4.advancedSearchQueries.aq }, ...e4.advancedSearchQueries?.cq && { cq: e4.advancedSearchQueries.cq }, ...e4.advancedSearchQueries?.lq && { lq: e4.advancedSearchQueries.lq }, ...e4.advancedSearchQueries?.dq && { dq: e4.advancedSearchQueries.dq }, ...e4.context && { context: e4.context.contextValues }, ...e4.fields && !e4.fields.fetchAllFields && { fieldsToInclude: e4.fields.fieldsToInclude }, ...e4.dictionaryFieldContext && { dictionaryFieldContext: e4.dictionaryFieldContext.contextValues }, ...e4.pipeline && { pipeline: e4.pipeline }, ...e4.query && { q: e4.query.q, enableQuerySyntax: e4.query.enableQuerySyntax }, ...e4.searchHub && { searchHub: e4.searchHub }, ...e4.sortCriteria && { sortCriteria: e4.sortCriteria }, ...e4.configuration.analytics.enabled && js(e4.configuration.analytics, t, r), ...e4.excerptLength && !isNullOrUndefined(e4.excerptLength.length) && { excerptLength: e4.excerptLength.length }, ...e4.configuration.search.authenticationProviders.length && { authentication: e4.configuration.search.authenticationProviders.join(",") } });
var kr = async (e4, t) => ({ accessToken: e4.configuration.accessToken, organizationId: e4.configuration.organizationId, url: e4.configuration.search.apiBaseUrl ?? Le(e4.configuration.organizationId, e4.configuration.environment), locale: e4.configuration.search.locale, debug: e4.debug, tab: e4.configuration.analytics.originLevel2, referrer: e4.configuration.analytics.originLevel3, timezone: e4.configuration.search.timezone, ...e4.configuration.analytics.enabled && { visitorId: await it(e4.configuration.analytics), actionsHistory: _e.getHistory() }, ...e4.advancedSearchQueries?.aq && { aq: e4.advancedSearchQueries.aq }, ...e4.advancedSearchQueries?.cq && { cq: e4.advancedSearchQueries.cq }, ...e4.advancedSearchQueries?.lq && { lq: e4.advancedSearchQueries.lq }, ...e4.advancedSearchQueries?.dq && { dq: e4.advancedSearchQueries.dq }, ...e4.context && { context: e4.context.contextValues }, ...e4.fields && !e4.fields.fetchAllFields && { fieldsToInclude: e4.fields.fieldsToInclude }, ...e4.dictionaryFieldContext && { dictionaryFieldContext: e4.dictionaryFieldContext.contextValues }, ...e4.pipeline && { pipeline: e4.pipeline }, ...e4.query && { q: e4.query.q, enableQuerySyntax: e4.query.enableQuerySyntax }, ...e4.searchHub && { searchHub: e4.searchHub }, ...e4.sortCriteria && { sortCriteria: e4.sortCriteria }, ...e4.configuration.analytics.enabled && await Ir(e4.configuration.analytics, t), ...e4.excerptLength && !isNullOrUndefined(e4.excerptLength.length) && { excerptLength: e4.excerptLength.length }, ...e4.configuration.search.authenticationProviders.length && { authentication: e4.configuration.search.authenticationProviders.join(",") } });
var Cp = () => le("search/logFetchMoreResults", (e4) => e4.makeFetchMoreResults());
var Or = (e4) => le("search/queryError", (t, r) => t.makeQueryError({ query: r.query?.q || fe().q, aq: r.advancedSearchQueries?.aq || sr().aq, cq: r.advancedSearchQueries?.cq || sr().cq, dq: r.advancedSearchQueries?.dq || sr().dq, errorType: e4.type, errorMessage: e4.message }));
var Ap = () => le("analytics/didyoumean/automatic", (e4) => e4.makeDidYouMeanAutomatic());
var oy = () => ({ actionCause: "didYouMeanAutomatic" });
var oj = new RecordValue({ values: { undoneQuery: se }, options: { required: true } });
var ay = () => le("analytics/trigger/query", (e4, t) => t.triggers?.queryModification.newQuery ? e4.makeTriggerQuery() : null);
var $s = S("trigger/query/ignore", (e4) => x(e4, new StringValue({ emptyAllowed: true, required: true })));
var Gs = S("trigger/query/modification", (e4) => x(e4, new RecordValue({ values: { originalQuery: ne, modification: ne } })));
function Oa(e4, t) {
  let r = {};
  e4.forEach((a) => r[a.facetId] = a);
  let n = [];
  t.forEach((a) => {
    a in r && (n.push(r[a]), delete r[a]);
  });
  let o = Object.values(r);
  return [...n, ...o];
}
function iy(e4) {
  return Dt(e4).map((t) => {
    let n = t.currentValues.some(({ state: o }) => o !== "idle");
    return t.generateAutomaticRanges && !n ? { ...t, currentValues: [] } : t;
  });
}
function Iw(e4) {
  return Dt(e4).map((t) => t.sortCriteria === "alphanumericDescending" ? { ...t, sortCriteria: { type: "alphanumeric", order: "descending" } } : t);
}
function ww(e4) {
  return [...Iw(e4.facetSet ?? {}), ...iy(e4.numericFacetSet ?? {}), ...iy(e4.dateFacetSet ?? {}), ...Dt(e4.categoryFacetSet ?? {})];
}
function Pw(e4) {
  return ww(e4).filter(({ facetId: t }) => e4.facetOptions?.facets[t]?.enabled ?? true);
}
function zs(e4) {
  return Oa(Pw(e4), e4.facetOrder ?? []);
}
var qr = async (e4, t) => {
  let r = kw(e4), n = zs(e4), o = Ew(e4), a = await kr(e4, t), i = () => e4.pagination ? e4.pagination.firstResult + e4.pagination.numberOfResults > 5e3 ? 5e3 - e4.pagination.firstResult : e4.pagination.numberOfResults : void 0;
  return Ot({ ...a, ...e4.didYouMean && { queryCorrection: { enabled: e4.didYouMean.enableDidYouMean && e4.didYouMean.queryCorrectionMode === "next", options: { automaticallyCorrect: e4.didYouMean.automaticallyCorrectQuery ? "whenNoResults" : "never" } }, enableDidYouMean: e4.didYouMean.enableDidYouMean && e4.didYouMean.queryCorrectionMode === "legacy" }, ...r && { cq: r }, ...n.length && { facets: n }, ...e4.pagination && { numberOfResults: i(), firstResult: e4.pagination.firstResult }, ...e4.facetOptions && { facetOptions: { freezeFacetOrder: e4.facetOptions.freezeFacetOrder } }, ...e4.folding?.enabled && { filterField: e4.folding.fields.collection, childField: e4.folding.fields.parent, parentField: e4.folding.fields.child, filterFieldRange: e4.folding.filterFieldRange }, ...e4.automaticFacetSet && { generateAutomaticFacets: { desiredCount: e4.automaticFacetSet.desiredCount, numberOfValues: e4.automaticFacetSet.numberOfValues, currentFacets: o } }, ...e4.generatedAnswer && { pipelineRuleParameters: { mlGenerativeQuestionAnswering: { responseFormat: e4.generatedAnswer.responseFormat, citationsFieldToInclude: e4.generatedAnswer.fieldsToIncludeInCitations } } } });
};
function Ew(e4) {
  let t = e4.automaticFacetSet?.set;
  return t ? Object.values(t).map((r) => r.response).map(Tw).filter((r) => r.currentValues.length > 0) : void 0;
}
function Tw(e4) {
  let { field: t, label: r, values: n } = e4, o = n.filter((a) => a.state === "selected");
  return { field: t, label: r, currentValues: o };
}
function kw(e4) {
  let t = e4.advancedSearchQueries?.cq.trim() || "", n = Object.values(e4.tabSet || {}).find((a) => a.isActive)?.expression.trim() || "", o = Ow(e4);
  return [t, n, ...o].filter((a) => !!a).join(" AND ");
}
function Ow(e4) {
  return Object.values(e4.staticFilterSet || {}).map((r) => {
    let n = r.values.filter((a) => a.state === "selected" && !!a.expression.trim()), o = n.map((a) => a.expression).join(" OR ");
    return n.length > 1 ? `(${o})` : o;
  });
}
var Dr = class {
  constructor(t, r = (n) => {
    this.dispatch(Ge({ q: n }));
  }) {
    this.config = t;
    this.onUpdateQueryForCorrection = r;
  }
  async fetchFromAPI({ mappings: t, request: r }, n) {
    let o = (/* @__PURE__ */ new Date()).getTime(), a = yt(await this.extra.apiClient.search(r, n), t), i = (/* @__PURE__ */ new Date()).getTime() - o, s = this.getState().query?.q || "";
    return { response: a, duration: i, queryExecuted: s, requestExecuted: r };
  }
  async process(t) {
    return this.processQueryErrorOrContinue(t) ?? await this.processQueryCorrectionsOrContinue(t) ?? await this.processQueryTriggersOrContinue(t) ?? this.processSuccessResponse(t);
  }
  processQueryErrorOrContinue(t) {
    return oe(t.response) ? (this.dispatch(Or(t.response.error)), this.rejectWithValue(t.response.error)) : null;
  }
  async processQueryCorrectionsOrContinue(t) {
    let r = this.getState(), n = this.getSuccessResponse(t);
    if (!n || !r.didYouMean) return null;
    let { enableDidYouMean: o, automaticallyCorrectQuery: a } = r.didYouMean, { results: i, queryCorrections: s, queryCorrection: u } = n;
    if (!o || !a) return null;
    let c = i.length === 0 && s && s.length !== 0, d = !isNullOrUndefined(u) && !isNullOrUndefined(u.correctedQuery);
    if (!c && !d) return null;
    let p = c ? await this.processLegacyDidYouMeanAutoCorrection(t) : this.processModernDidYouMeanAutoCorrection(t);
    return this.dispatch(ke(Oe(this.getState()))), p;
  }
  async processLegacyDidYouMeanAutoCorrection(t) {
    let r = this.getCurrentQuery(), n = this.getSuccessResponse(t);
    if (!n.queryCorrections) return null;
    let { correctedQuery: o } = n.queryCorrections[0], a = await this.automaticallyRetryQueryWithCorrection(o);
    return oe(a.response) ? (this.dispatch(Or(a.response.error)), this.rejectWithValue(a.response.error)) : (this.logOriginalAnalyticsQueryBeforeAutoCorrection(t), this.dispatch(ke(Oe(this.getState()))), { ...a, response: { ...a.response.success, queryCorrections: n.queryCorrections }, automaticallyCorrected: true, originalQuery: r, analyticsAction: Ap() });
  }
  processModernDidYouMeanAutoCorrection(t) {
    let r = this.getSuccessResponse(t), { correctedQuery: n, originalQuery: o } = r.queryCorrection;
    return this.onUpdateQueryForCorrection(n), { ...t, response: { ...r }, queryExecuted: n, automaticallyCorrected: true, originalQuery: o, analyticsAction: Ap() };
  }
  logOriginalAnalyticsQueryBeforeAutoCorrection(t) {
    let r = this.getState(), n = this.getSuccessResponse(t);
    this.analyticsAction && this.analyticsAction()(this.dispatch, () => this.getStateAfterResponse(t.queryExecuted, t.duration, r, n), this.extra);
  }
  async processQueryTriggersOrContinue(t) {
    let r = this.getSuccessResponse(t);
    if (!r) return null;
    let n = r.triggers.find((s) => s.type === "query")?.content || "";
    if (!n) return null;
    if (this.getState().triggers?.queryModification.queryToIgnore === n) return this.dispatch($s("")), null;
    this.analyticsAction && await this.dispatch(this.analyticsAction);
    let a = this.getCurrentQuery(), i = await this.automaticallyRetryQueryWithTriggerModification(n);
    return oe(i.response) ? (this.dispatch(Or(i.response.error)), this.rejectWithValue(i.response.error)) : (this.dispatch(ke(Oe(this.getState()))), { ...i, response: { ...i.response.success }, automaticallyCorrected: false, originalQuery: a, analyticsAction: ay() });
  }
  getStateAfterResponse(t, r, n, o) {
    return { ...n, query: { q: t, enableQuerySyntax: n.query?.enableQuerySyntax ?? fe().enableQuerySyntax }, search: { ...xe(), duration: r, response: o, results: o.results } };
  }
  processSuccessResponse(t) {
    return this.dispatch(ke(Oe(this.getState()))), { ...t, response: this.getSuccessResponse(t), automaticallyCorrected: false, originalQuery: this.getCurrentQuery(), analyticsAction: this.analyticsAction };
  }
  getSuccessResponse(t) {
    return Sr(t.response) ? t.response.success : null;
  }
  async automaticallyRetryQueryWithCorrection(t) {
    this.onUpdateQueryForCorrection(t);
    let r = await this.fetchFromAPI(await qr(this.getState()), { origin: "mainSearch" });
    return this.dispatch($e(t)), r;
  }
  async automaticallyRetryQueryWithTriggerModification(t) {
    return this.dispatch(Gs({ newQuery: t, originalQuery: this.getCurrentQuery() })), this.onUpdateQueryForCorrection(t), await this.fetchFromAPI(await qr(this.getState()), { origin: "mainSearch" });
  }
  getCurrentQuery() {
    let t = this.getState();
    return t.query?.q !== void 0 ? t.query.q : "";
  }
  get extra() {
    return this.config.extra;
  }
  getState() {
    return this.config.getState();
  }
  get dispatch() {
    return this.config.dispatch;
  }
  get analyticsAction() {
    return this.config.analyticsAction;
  }
  get rejectWithValue() {
    return this.config.rejectWithValue;
  }
};
var r1 = L("search/prepareForSearchWithQuery", (e4, t) => {
  let { dispatch: r } = t;
  x(e4, { q: new StringValue(), enableQuerySyntax: new BooleanValue(), clearFilters: new BooleanValue() }), e4.clearFilters && (r(qe()), r(Er())), r(Tr({ allow: true })), r(Ge({ q: e4.q, enableQuerySyntax: e4.enableQuerySyntax })), r(Vt(1));
});
var Hs = L("search/executeSearch", async (e4, t) => {
  let r = t.getState();
  return await Ks(r, t, e4);
});
var Ws = L("search/fetchPage", async (e4, t) => {
  let r = t.getState();
  return await xp(r, t, e4);
});
var Ys = L("search/fetchMoreResults", async (e4, t) => {
  let r = t.getState();
  return await Fp(t, r);
});
var ly = L("search/fetchFacetValues", async (e4, t) => {
  let r = t.getState();
  return await Mw(t, e4, r);
});
var n1 = L("search/fetchInstantResults", async (e4, t) => Rp(e4, t));
var Dw = async (e4, t) => {
  let r = await qr(e4, t);
  return r.request = { ...r.request, firstResult: (e4.pagination?.firstResult ?? 0) + (e4.search?.results.length ?? 0) }, r;
};
var Vw = async (e4, t, r) => {
  let n = await kr(e4);
  return Ot({ ...n, ...e4.didYouMean && { enableDidYouMean: e4.didYouMean.enableDidYouMean }, numberOfResults: r, q: t });
};
var Nw = async (e4, t) => {
  let r = await qr(e4, t);
  return r.request.numberOfResults = 0, r;
};
var dy = (e4) => {
  e4.configuration.analytics.enabled && _e.addElement({ name: "Query", ...e4.query?.q && { value: e4.query.q }, time: JSON.stringify(/* @__PURE__ */ new Date()) });
};
async function Rp(e4, t) {
  x(e4, { id: E, q: E, maxResultsPerQuery: new NumberValue({ required: true, min: 1 }), cacheTimeout: new NumberValue() });
  let { q: r, maxResultsPerQuery: n } = e4, o = t.getState(), a = new Dr({ ...t, analyticsAction: ty() }, (c) => {
    t.dispatch(Ns({ q: c, id: e4.id }));
  }), i = await Vw(o, r, n), s = await a.fetchFromAPI(i, { origin: "instantResults", disableAbortWarning: true }), u = await a.process(s);
  return "response" in u ? { results: u.response.results, searchUid: u.response.searchUid, analyticsAction: u.analyticsAction, totalCountFiltered: u.response.totalCountFiltered, duration: u.duration } : u;
}
async function xp(e4, t, r) {
  dy(e4);
  let { analyticsClientMiddleware: n, preprocessRequest: o, logger: a } = t.extra, { description: i } = await r.prepare({ getState: () => t.getState(), analyticsClientMiddleware: n, preprocessRequest: o, logger: a }), s = new Dr({ ...t, analyticsAction: r }), u = await qr(e4, i), c = await s.fetchFromAPI(u, { origin: "mainSearch" });
  return await s.process(c);
}
async function Fp(e4, t) {
  let { analyticsClientMiddleware: r, preprocessRequest: n, logger: o } = e4.extra, { description: a } = await Cp().prepare({ getState: () => e4.getState(), analyticsClientMiddleware: r, preprocessRequest: n, logger: o }), i = new Dr({ ...e4, analyticsAction: Cp() }), s = await Dw(t, a), u = await i.fetchFromAPI(s, { origin: "mainSearch" });
  return await i.process(u);
}
async function Mw(e4, t, r) {
  let { analyticsClientMiddleware: n, preprocessRequest: o, logger: a } = e4.extra, { description: i } = await t.prepare({ getState: () => e4.getState(), analyticsClientMiddleware: n, preprocessRequest: o, logger: a }), s = new Dr({ ...e4, analyticsAction: t }), u = await Nw(r, i), c = await s.fetchFromAPI(u, { origin: "facetValues" });
  return await s.process(c);
}
async function Ks(e4, t, r) {
  dy(e4);
  let { analyticsClientMiddleware: n, preprocessRequest: o, logger: a } = t.extra, { description: i } = await r.prepare({ getState: () => t.getState(), analyticsClientMiddleware: n, preprocessRequest: o, logger: a }), s = await qr(e4, i), u = new Dr({ ...t, analyticsAction: r }), c = await u.fetchFromAPI(s, { origin: "mainSearch" });
  return await u.process(c);
}
var ct = async (e4, t, r) => {
  let n = $w(e4), o = Qw(e4), a = Lw(e4), i = e4.configuration.analytics.analyticsMode === "legacy" ? await kr(e4, r) : po(e4, t, r), s = () => e4.pagination ? e4.pagination.firstResult + e4.pagination.numberOfResults > 5e3 ? 5e3 - e4.pagination.firstResult : e4.pagination.numberOfResults : void 0;
  return Ot({ ...i, ...e4.didYouMean && { queryCorrection: { enabled: e4.didYouMean.enableDidYouMean && e4.didYouMean.queryCorrectionMode === "next", options: { automaticallyCorrect: e4.didYouMean.automaticallyCorrectQuery ? "whenNoResults" : "never" } }, enableDidYouMean: e4.didYouMean.enableDidYouMean && e4.didYouMean.queryCorrectionMode === "legacy" }, ...n && { cq: n }, ...o.length && { facets: o }, ...e4.pagination && { numberOfResults: s(), firstResult: e4.pagination.firstResult }, ...e4.facetOptions && { facetOptions: { freezeFacetOrder: e4.facetOptions.freezeFacetOrder } }, ...e4.folding?.enabled && { filterField: e4.folding.fields.collection, childField: e4.folding.fields.parent, parentField: e4.folding.fields.child, filterFieldRange: e4.folding.filterFieldRange }, ...e4.automaticFacetSet && { generateAutomaticFacets: { desiredCount: e4.automaticFacetSet.desiredCount, numberOfValues: e4.automaticFacetSet.numberOfValues, currentFacets: a } }, ...e4.generatedAnswer && { pipelineRuleParameters: { mlGenerativeQuestionAnswering: { responseFormat: e4.generatedAnswer.responseFormat, citationsFieldToInclude: e4.generatedAnswer.fieldsToIncludeInCitations } } } });
};
function Qw(e4) {
  return Oa(Uw(e4), e4.facetOrder ?? []);
}
function Lw(e4) {
  let t = e4.automaticFacetSet?.set;
  return t ? Object.values(t).map((r) => r.response).map(Bw).filter((r) => r.currentValues.length > 0) : void 0;
}
function Bw(e4) {
  let { field: t, label: r, values: n } = e4, o = n.filter((a) => a.state === "selected");
  return { field: t, label: r, currentValues: o };
}
function Uw(e4) {
  return _w(e4).filter(({ facetId: t }) => e4.facetOptions?.facets[t]?.enabled ?? true);
}
function _w(e4) {
  return [...jw(e4.facetSet ?? {}), ...py(e4.numericFacetSet ?? {}), ...py(e4.dateFacetSet ?? {}), ...Dt(e4.categoryFacetSet ?? {})];
}
function jw(e4) {
  return Dt(e4).map((t) => t.sortCriteria === "alphanumericDescending" ? { ...t, sortCriteria: { type: "alphanumeric", order: "descending" } } : t);
}
function py(e4) {
  return Dt(e4).map((t) => {
    let n = t.currentValues.some(({ state: o }) => o !== "idle");
    return t.generateAutomaticRanges && !n ? { ...t, currentValues: [] } : t;
  });
}
function $w(e4) {
  let t = e4.advancedSearchQueries?.cq.trim() || "", n = Object.values(e4.tabSet || {}).find((a) => a.isActive)?.expression.trim() || "", o = Gw(e4);
  return [t, n, ...o].filter((a) => !!a).join(" AND ");
}
function Gw(e4) {
  return Object.values(e4.staticFilterSet || {}).map((r) => {
    let n = r.values.filter((a) => a.state === "selected" && !!a.expression.trim()), o = n.map((a) => a.expression).join(" OR ");
    return n.length > 1 ? `(${o})` : o;
  });
}
var Vr = class {
  constructor(t, r = (n) => {
    this.dispatch(Ge({ q: n }));
  }) {
    this.config = t;
    this.onUpdateQueryForCorrection = r;
  }
  async fetchFromAPI({ mappings: t, request: r }, n) {
    let o = (/* @__PURE__ */ new Date()).getTime(), a = yt(await this.extra.apiClient.search(r, n), t), i = (/* @__PURE__ */ new Date()).getTime() - o, s = this.getState().query?.q || "";
    return { response: a, duration: i, queryExecuted: s, requestExecuted: r };
  }
  async process(t) {
    return this.processQueryErrorOrContinue(t) ?? await this.processQueryCorrectionsOrContinue(t) ?? await this.processQueryTriggersOrContinue(t) ?? this.processSuccessResponse(t);
  }
  processQueryErrorOrContinue(t) {
    return oe(t.response) ? (this.dispatch(Or(t.response.error)), this.rejectWithValue(t.response.error)) : null;
  }
  async processQueryCorrectionsOrContinue(t) {
    let r = this.getState(), n = this.getSuccessResponse(t);
    if (!n || !r.didYouMean) return null;
    let { enableDidYouMean: o, automaticallyCorrectQuery: a } = r.didYouMean, { results: i, queryCorrections: s, queryCorrection: u } = n;
    if (!o || !a) return null;
    let c = i.length === 0 && s && s.length !== 0, d = !isNullOrUndefined(u) && !isNullOrUndefined(u.correctedQuery);
    if (!c && !d) return null;
    let p = c ? await this.processLegacyDidYouMeanAutoCorrection(t) : this.processModernDidYouMeanAutoCorrection(t);
    return this.dispatch(ke(Oe(this.getState()))), p;
  }
  async processLegacyDidYouMeanAutoCorrection(t) {
    let r = this.getCurrentQuery(), n = this.getSuccessResponse(t);
    if (!n.queryCorrections) return null;
    let { correctedQuery: o } = n.queryCorrections[0], a = await this.automaticallyRetryQueryWithCorrection(o);
    return oe(a.response) ? (this.dispatch(Or(a.response.error)), this.rejectWithValue(a.response.error)) : (this.dispatch(ke(Oe(this.getState()))), { ...a, response: { ...a.response.success, queryCorrections: n.queryCorrections }, automaticallyCorrected: true, originalQuery: r });
  }
  processModernDidYouMeanAutoCorrection(t) {
    let r = this.getSuccessResponse(t), { correctedQuery: n, originalQuery: o } = r.queryCorrection;
    return this.onUpdateQueryForCorrection(n), { ...t, response: { ...r }, queryExecuted: n, automaticallyCorrected: true, originalQuery: o };
  }
  async processQueryTriggersOrContinue(t) {
    let r = this.getSuccessResponse(t);
    if (!r) return null;
    let n = r.triggers.find((s) => s.type === "query")?.content || "";
    if (!n) return null;
    if (this.getState().triggers?.queryModification.queryToIgnore === n) return this.dispatch($s("")), null;
    let a = this.getCurrentQuery(), i = await this.automaticallyRetryQueryWithTriggerModification(n);
    return oe(i.response) ? (this.dispatch(Or(i.response.error)), this.rejectWithValue(i.response.error)) : (this.dispatch(ke(Oe(this.getState()))), { ...i, response: { ...i.response.success }, automaticallyCorrected: false, originalQuery: a });
  }
  processSuccessResponse(t) {
    return this.dispatch(ke(Oe(this.getState()))), { ...t, response: this.getSuccessResponse(t), automaticallyCorrected: false, originalQuery: this.getCurrentQuery() };
  }
  getSuccessResponse(t) {
    return Sr(t.response) ? t.response.success : null;
  }
  async automaticallyRetryQueryWithCorrection(t) {
    this.onUpdateQueryForCorrection(t);
    let r = this.getState(), { actionCause: n } = oy(), o = await this.fetchFromAPI(await ct(r, this.extra.navigatorContext, { actionCause: n }), { origin: "mainSearch" });
    return this.dispatch($e(t)), o;
  }
  async automaticallyRetryQueryWithTriggerModification(t) {
    return this.dispatch(Gs({ newQuery: t, originalQuery: this.getCurrentQuery() })), this.onUpdateQueryForCorrection(t), await this.fetchFromAPI(await ct(this.getState(), this.extra.navigatorContext), { origin: "mainSearch" });
  }
  getCurrentQuery() {
    let t = this.getState();
    return t.query?.q !== void 0 ? t.query.q : "";
  }
  get extra() {
    return this.config.extra;
  }
  getState() {
    return this.config.getState();
  }
  get dispatch() {
    return this.config.dispatch;
  }
  get rejectWithValue() {
    return this.config.rejectWithValue;
  }
};
var Js = L("search/prepareForSearchWithQuery", (e4, t) => {
  let { dispatch: r } = t;
  x(e4, { q: new StringValue(), enableQuerySyntax: new BooleanValue(), clearFilters: new BooleanValue() }), e4.clearFilters && (r(qe()), r(Er())), r(Tr({ allow: true })), r(Ge({ q: e4.q, enableQuerySyntax: e4.enableQuerySyntax })), r(Vt(1));
});
var ce = L("search/executeSearch", async (e4, t) => {
  let r = t.getState();
  if (r.configuration.analytics.analyticsMode === "legacy") return Ks(r, t, e4.legacy);
  hy(r);
  let n = e4.next ? yy(e4.next) : void 0, o = await ct(r, t.extra.navigatorContext, n), a = new Vr({ ...t, analyticsAction: n ?? {} }), i = await a.fetchFromAPI(o, { origin: "mainSearch" });
  return await a.process(i);
});
var Xs = L("search/fetchPage", async (e4, t) => {
  let r = t.getState();
  if (hy(r), r.configuration.analytics.analyticsMode === "legacy" || !e4.next) return xp(r, t, e4.legacy);
  let n = new Vr({ ...t, analyticsAction: e4.next }), o = await ct(r, t.extra.navigatorContext, e4.next), a = await n.fetchFromAPI(o, { origin: "mainSearch" });
  return await n.process(a);
});
var Zs = L("search/fetchMoreResults", async (e4, t) => {
  let r = t.getState();
  if (r.configuration.analytics.analyticsMode === "legacy") return Fp(t, r);
  let n = ih("browseResults", t.getState), o = new Vr({ ...t, analyticsAction: n }), a = await Hw(r, t.extra.navigatorContext, n), i = await o.fetchFromAPI(a, { origin: "mainSearch" });
  return await o.process(i);
});
var ec = L("search/fetchFacetValues", async (e4, t) => {
  let r = t.getState();
  if (r.configuration.analytics.analyticsMode === "legacy") return Ks(r, t, e4.legacy);
  let n = new Vr({ ...t, analyticsAction: {} }), o = await Yw(r, t.extra.navigatorContext), a = await n.fetchFromAPI(o, { origin: "facetValues" });
  return await n.process(a);
});
var J1 = L("search/fetchInstantResults", async (e4, t) => {
  let r = t.getState();
  if (r.configuration.analytics.analyticsMode === "legacy") return Rp(e4, t);
  x(e4, { id: E, q: E, maxResultsPerQuery: new NumberValue({ required: true, min: 1 }), cacheTimeout: new NumberValue() });
  let { q: n, maxResultsPerQuery: o } = e4, a = yy(ry()), i = await Ww(r, t.extra.navigatorContext, n, o, a), s = new Vr({ ...t, analyticsAction: a }, (d) => {
    t.dispatch(Ns({ q: d, id: e4.id }));
  }), u = await s.fetchFromAPI(i, { origin: "instantResults", disableAbortWarning: true }), c = await s.process(u);
  return "response" in c ? { results: c.response.results, searchUid: c.response.searchUid, totalCountFiltered: c.response.totalCountFiltered, duration: c.duration } : c;
});
var Hw = async (e4, t, r) => {
  let n = await ct(e4, t, r);
  return n.request = { ...n.request, firstResult: (e4.pagination?.firstResult ?? 0) + (e4.search?.results.length ?? 0) }, n;
};
var Ww = async (e4, t, r, n, o) => {
  let a = po(e4, t, o);
  return Ot({ ...a, ...e4.didYouMean && { enableDidYouMean: e4.didYouMean.enableDidYouMean }, numberOfResults: n, q: r });
};
var Yw = async (e4, t, r) => {
  let n = await ct(e4, t, r);
  return n.request.numberOfResults = 0, n;
};
var hy = (e4) => {
  e4.configuration.analytics.enabled && _e.addElement({ name: "Query", ...e4.query?.q && { value: e4.query.q }, time: JSON.stringify(/* @__PURE__ */ new Date()) });
};
var yy = (e4) => ({ actionCause: e4.actionCause, type: e4.actionCause });
async function Sy(e4, t) {
  let { search: r, accessToken: n, organizationId: o, analytics: a } = e4.configuration, i = e4.query?.q || "";
  return { url: r.apiBaseUrl ?? Le(e4.configuration.organizationId, e4.configuration.environment), accessToken: n, organizationId: o, enableNavigation: false, ...a.enabled && { visitorId: await it(e4.configuration.analytics) }, q: i, ...t, requestedOutputSize: t.requestedOutputSize || 0, ...r.authenticationProviders.length && { authentication: r.authenticationProviders.join(",") } };
}
var qa = L("resultPreview/fetchResultContent", async (e4, { extra: t, getState: r, rejectWithValue: n }) => {
  let o = r(), a = await Sy(o, e4), i = await t.apiClient.html(a);
  return oe(i) ? n(i.error) : { content: i.success, uniqueId: e4.uniqueId };
});
var tc = S("resultPreview/next");
var rc = S("resultPreview/previous");
var Ay = S("resultPreview/prepare", (e4) => x(e4, { results: new ArrayValue({ required: true }) }));
var Cy = 2048;
var nc = L("resultPreview/updateContentURL", async (e4, { getState: t, extra: r }) => {
  let n = t(), o = Ag(await e4.buildResultPreviewRequest(n, { uniqueId: e4.uniqueId, requestedOutputSize: e4.requestedOutputSize }), e4.path);
  return o?.length > Cy && r.logger.error(`The content URL was truncated as it exceeds the maximum allowed length of ${Cy} characters.`), { contentURL: o };
});
function bp() {
  return { uniqueId: "", content: "", isLoading: false, position: -1, resultsWithPreview: [] };
}
var vp = (e4) => {
  let { content: t, isLoading: r, uniqueId: n, contentURL: o } = bp();
  e4.content = t, e4.isLoading = r, e4.uniqueId = n, e4.contentURL = o;
};
var Ip = (e4) => e4.filter((t) => t.hasHtmlVersion).map((t) => t.uniqueId);
var mo = $(bp(), (e4) => {
  e4.addCase(qa.pending, (t) => {
    t.isLoading = true;
  }).addCase(qa.fulfilled, (t, r) => {
    let { content: n, uniqueId: o } = r.payload;
    t.position = t.resultsWithPreview.indexOf(o), t.content = n, t.uniqueId = o, t.isLoading = false;
  }).addCase(ce.fulfilled, (t, r) => {
    vp(t), t.resultsWithPreview = Ip(r.payload.response.results);
  }).addCase(Zs.fulfilled, (t, r) => {
    vp(t), t.resultsWithPreview = t.resultsWithPreview.concat(Ip(r.payload.response.results));
  }).addCase(Xs.fulfilled, vp).addCase(Ay, (t, r) => {
    t.resultsWithPreview = Ip(r.payload.results);
  }).addCase(tc, (t) => {
    if (t.isLoading) return;
    let r = t.position + 1;
    r > t.resultsWithPreview.length - 1 && (r = 0), t.position = r;
  }).addCase(rc, (t) => {
    if (t.isLoading) return;
    let r = t.position - 1;
    r < 0 && (r = t.resultsWithPreview.length - 1), t.position = r;
  }).addCase(nc.fulfilled, (t, r) => {
    t.contentURL = r.payload.contentURL;
  });
});
var oc = $(Rr(), (e4) => {
  e4.addCase(hs, (t, r) => r.payload).addCase(me.fulfilled, (t, r) => r.payload?.searchHub ?? t).addCase(so, (t, r) => r.payload.searchHub || t);
});
function wp(e4, t) {
  let r = t.payload ?? null;
  r && (e4.response = xe().response, e4.results = [], e4.questionAnswer = Ln()), e4.error = r, e4.isLoading = false;
}
function Ep(e4, t) {
  e4.error = null, e4.response = t.payload.response, e4.queryExecuted = t.payload.queryExecuted, e4.duration = t.payload.duration, e4.isLoading = false;
}
function rP(e4, t) {
  Ep(e4, t), e4.results = t.payload.response.results.map((r) => ({ ...r, searchUid: t.payload.response.searchUid })), e4.searchResponseId = t.payload.response.searchUid, e4.questionAnswer = t.payload.response.questionAnswer, e4.extendedResults = t.payload.response.extendedResults;
}
function Pp(e4, t) {
  e4.isLoading = true, e4.requestId = t.meta.requestId;
}
var X = $(xe(), (e4) => {
  e4.addCase(Hs.rejected, (t, r) => wp(t, r)), e4.addCase(Ys.rejected, (t, r) => wp(t, r)), e4.addCase(Ws.rejected, (t, r) => wp(t, r)), e4.addCase(Hs.fulfilled, (t, r) => {
    rP(t, r);
  }), e4.addCase(Ys.fulfilled, (t, r) => {
    Ep(t, r), t.results = [...t.results, ...r.payload.response.results.map((n) => ({ ...n, searchUid: r.payload.response.searchUid }))];
  }), e4.addCase(Ws.fulfilled, (t, r) => {
    Ep(t, r), t.results = r.payload.response.results;
  }), e4.addCase(ly.fulfilled, (t, r) => {
    t.response.facets = r.payload.response.facets, t.response.searchUid = r.payload.response.searchUid;
  }), e4.addCase(Hs.pending, Pp), e4.addCase(Ys.pending, Pp), e4.addCase(Ws.pending, Pp);
});
var Da = W((e4) => e4.query, (e4) => e4);
var ze = (e4) => aP(e4) ? { answerAPIEnabled: true, id: Va(e4).data?.answerId } : oP(e4) ? { answerAPIEnabled: false, id: e4.search.response.extendedResults.generativeQuestionAnsweringId } : { answerAPIEnabled: false, id: void 0 };
var oP = (e4) => "search" in e4;
var aP = (e4) => "answer" in e4 && "generatedAnswer" in e4 && !isNullOrUndefined(e4.generatedAnswer?.answerConfigurationId);
var Fy = (e4) => e4.generatedAnswer?.fieldsToIncludeInCitations;
var sc = W((e4) => e4.generatedAnswer?.citations, (e4, t) => t, (e4, t) => e4?.find((r) => r.id === t));
var _$ = W((e4) => Da(e4)?.q, (e4) => e4.search.requestId, (e4, t) => ({ q: e4, requestId: t }));
var by = W((e4) => e4.pipeline, (e4) => e4);
var vy = W((e4) => e4.searchHub, (e4) => e4);
function iP(e4) {
  return { status: e4, isUninitialized: e4 === "uninitialized", isLoading: e4 === "pending", isSuccess: e4 === "fulfilled", isError: e4 === "rejected" };
}
var Iy = wt;
function By(e4, t) {
  if (e4 === t || !(Iy(e4) && Iy(t) || Array.isArray(e4) && Array.isArray(t))) return t;
  let r = Object.keys(t), n = Object.keys(e4), o = r.length === n.length, a = Array.isArray(t) ? [] : {};
  for (let i of r) a[i] = By(e4[i], t[i]), o && (o = e4[i] === a[i]);
  return o ? e4 : a;
}
function go(e4) {
  let t = 0;
  for (let r in e4) t++;
  return t;
}
var wy = (e4) => [].concat(...e4);
function sP(e4) {
  return new RegExp("(^|:)//").test(e4);
}
function cP() {
  return typeof document > "u" ? true : document.visibilityState !== "hidden";
}
function Py(e4) {
  return e4 != null;
}
function uP() {
  return typeof navigator > "u" || navigator.onLine === void 0 ? true : navigator.onLine;
}
var lP = (e4) => e4.replace(/\/$/, "");
var dP = (e4) => e4.replace(/^\//, "");
function pP(e4, t) {
  if (!e4) return t;
  if (!t) return e4;
  if (sP(t)) return t;
  let r = e4.endsWith("/") || !t.startsWith("?") ? "/" : "";
  return e4 = lP(e4), t = dP(t), `${e4}${r}${t}`;
}
var Ey = (...e4) => fetch(...e4);
var mP = (e4) => e4.status >= 200 && e4.status <= 299;
var gP = (e4) => /ion\/(vnd\.api\+)?json/.test(e4.get("content-type") || "");
function Ty(e4) {
  if (!wt(e4)) return e4;
  let t = { ...e4 };
  for (let [r, n] of Object.entries(t)) n === void 0 && delete t[r];
  return t;
}
function Uy({ baseUrl: e4, prepareHeaders: t = (m) => m, fetchFn: r = Ey, paramsSerializer: n, isJsonContentType: o = gP, jsonContentType: a = "application/json", jsonReplacer: i, timeout: s, responseHandler: u, validateStatus: c, ...d } = {}) {
  return typeof fetch > "u" && r === Ey && console.warn("Warning: `fetch` is not available. Please supply a custom `fetchFn` property to use `fetchBaseQuery` on SSR environments."), async (p, l) => {
    let { signal: g, getState: A, extra: y, endpoint: R, forced: f, type: h } = l, C, { url: b, headers: w = new Headers(d.headers), params: v = void 0, responseHandler: P = u ?? "json", validateStatus: T = c ?? mP, timeout: M = s, ...z } = typeof p == "string" ? { url: p } : p, k = { ...d, signal: g, ...z };
    w = new Headers(Ty(w)), k.headers = await t(w, { getState: A, extra: y, endpoint: R, forced: f, type: h }) || w;
    let q = (Z) => typeof Z == "object" && (wt(Z) || Array.isArray(Z) || typeof Z.toJSON == "function");
    if (!k.headers.has("content-type") && q(k.body) && k.headers.set("content-type", a), q(k.body) && o(k.headers) && (k.body = JSON.stringify(k.body, i)), v) {
      let Z = ~b.indexOf("?") ? "&" : "?", re = n ? n(v) : new URLSearchParams(Ty(v));
      b += Z + re;
    }
    b = pP(e4, b);
    let O = new Request(b, k);
    C = { request: new Request(b, k) };
    let D, j = false, U = M && setTimeout(() => {
      j = true, l.abort();
    }, M);
    try {
      D = await r(O);
    } catch (Z) {
      return { error: { status: j ? "TIMEOUT_ERROR" : "FETCH_ERROR", error: String(Z) }, meta: C };
    } finally {
      U && clearTimeout(U);
    }
    let J = D.clone();
    C.response = J;
    let te, ue = "";
    try {
      let Z;
      if (await Promise.all([m(D, P).then((re) => te = re, (re) => Z = re), J.text().then((re) => ue = re, () => {
      })]), Z) throw Z;
    } catch (Z) {
      return { error: { status: "PARSING_ERROR", originalStatus: D.status, data: ue, error: String(Z) }, meta: C };
    }
    return T(D, te) ? { data: te, meta: C } : { error: { status: D.status, data: te }, meta: C };
  };
  async function m(p, l) {
    if (typeof l == "function") return l(p);
    if (l === "content-type" && (l = o(p.headers) ? "json" : "text"), l === "json") {
      let g = await p.text();
      return g.length ? JSON.parse(g) : null;
    }
    return p.text();
  }
}
var fo = class {
  constructor(e4, t = void 0) {
    this.value = e4, this.meta = t;
  }
};
async function fP(e4 = 0, t = 5) {
  let r = Math.min(e4, t), n = ~~((Math.random() + 0.4) * (300 << r));
  await new Promise((o) => setTimeout((a) => o(a), n));
}
function hP(e4) {
  throw Object.assign(new fo({ error: e4 }), { throwImmediately: true });
}
var ky = {};
var yP = (e4, t) => async (r, n, o) => {
  let a = [5, (t || ky).maxRetries, (o || ky).maxRetries].filter((d) => d !== void 0), [i] = a.slice(-1), u = { maxRetries: i, backoff: fP, retryCondition: (d, m, { attempt: p }) => p <= i, ...t, ...o }, c = 0;
  for (; ; ) try {
    let d = await e4(r, n, o);
    if (d.error) throw new fo(d);
    return d;
  } catch (d) {
    if (c++, d.throwImmediately) {
      if (d instanceof fo) return d.value;
      throw d;
    }
    if (d instanceof fo && !u.retryCondition(d.value.error, r, { attempt: c, baseQueryApi: n, extraOptions: o })) return d.value;
    await u.backoff(c, u.maxRetries);
  }
};
var _y = Object.assign(yP, { fail: hP });
var qp = S("__rtkq/focused");
var jy = S("__rtkq/unfocused");
var Dp = S("__rtkq/online");
var $y = S("__rtkq/offline");
function Gy(e4) {
  return e4.type === "query";
}
function SP(e4) {
  return e4.type === "mutation";
}
function Vp(e4, t, r, n, o, a) {
  return CP(e4) ? e4(t, r, n, o).map(kp).map(a) : Array.isArray(e4) ? e4.map(kp).map(a) : [];
}
function CP(e4) {
  return typeof e4 == "function";
}
function kp(e4) {
  return typeof e4 == "string" ? { type: e4 } : e4;
}
function AP(e4, t) {
  return e4.catch(t);
}
var Ma = Symbol("forceQueryFn");
var Op = (e4) => typeof e4[Ma] == "function";
function RP({ serializeQueryArgs: e4, queryThunk: t, mutationThunk: r, api: n, context: o }) {
  let a = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map(), { unsubscribeQueryResult: s, removeMutationResult: u, updateSubscriptionOptions: c } = n.internalActions;
  return { buildInitiateQuery: A, buildInitiateMutation: y, getRunningQueryThunk: d, getRunningMutationThunk: m, getRunningQueriesThunk: p, getRunningMutationsThunk: l };
  function d(R, f) {
    return (h) => {
      let C = o.endpointDefinitions[R], b = e4({ queryArgs: f, endpointDefinition: C, endpointName: R });
      return a.get(h)?.[b];
    };
  }
  function m(R, f) {
    return (h) => i.get(h)?.[f];
  }
  function p() {
    return (R) => Object.values(a.get(R) || {}).filter(Py);
  }
  function l() {
    return (R) => Object.values(i.get(R) || {}).filter(Py);
  }
  function g(R) {
  }
  function A(R, f) {
    let h = (C, { subscribe: b = true, forceRefetch: w, subscriptionOptions: v, [Ma]: P, ...T } = {}) => (M, z) => {
      let k = e4({ queryArgs: C, endpointDefinition: f, endpointName: R }), q = t({ ...T, type: "query", subscribe: b, forceRefetch: w, subscriptionOptions: v, endpointName: R, originalArgs: C, queryCacheKey: k, [Ma]: P }), O = n.endpoints[R].select(C), Q = M(q), D = O(z());
      let { requestId: j, abort: U } = Q, J = D.requestId !== j, te = a.get(M)?.[k], ue = () => O(z()), Z = Object.assign(P ? Q.then(ue) : J && !te ? Promise.resolve(D) : Promise.all([te, Q]).then(ue), { arg: C, requestId: j, subscriptionOptions: v, queryCacheKey: k, abort: U, async unwrap() {
        let re = await Z;
        if (re.isError) throw re.error;
        return re.data;
      }, refetch: () => M(h(C, { subscribe: false, forceRefetch: true })), unsubscribe() {
        b && M(s({ queryCacheKey: k, requestId: j }));
      }, updateSubscriptionOptions(re) {
        Z.subscriptionOptions = re, M(c({ endpointName: R, requestId: j, queryCacheKey: k, options: re }));
      } });
      if (!te && !J && !P) {
        let re = a.get(M) || {};
        re[k] = Z, a.set(M, re), Z.then(() => {
          delete re[k], go(re) || a.delete(M);
        });
      }
      return Z;
    };
    return h;
  }
  function y(R) {
    return (f, { track: h = true, fixedCacheKey: C } = {}) => (b, w) => {
      let v = r({ type: "mutation", endpointName: R, originalArgs: f, track: h, fixedCacheKey: C }), P = b(v);
      let { requestId: T, abort: M, unwrap: z } = P, k = AP(P.unwrap().then((D) => ({ data: D })), (D) => ({ error: D })), q = () => {
        b(u({ requestId: T, fixedCacheKey: C }));
      }, O = Object.assign(k, { arg: P.arg, requestId: T, abort: M, unwrap: z, reset: q }), Q = i.get(b) || {};
      return i.set(b, Q), Q[T] = O, O.then(() => {
        delete Q[T], go(Q) || i.delete(b);
      }), C && (Q[C] = O, O.then(() => {
        Q[C] === O && (delete Q[C], go(Q) || i.delete(b));
      })), O;
    };
  }
}
function Oy(e4) {
  return e4;
}
function xP({ reducerPath: e4, baseQuery: t, context: { endpointDefinitions: r }, serializeQueryArgs: n, api: o, assertTagType: a }) {
  let i = (f, h, C, b) => (w, v) => {
    let P = r[f], T = n({ queryArgs: h, endpointDefinition: P, endpointName: f });
    if (w(o.internalActions.queryResultPatched({ queryCacheKey: T, patches: C })), !b) return;
    let M = o.endpoints[f].select(h)(v()), z = Vp(P.providesTags, M.data, void 0, h, {}, a);
    w(o.internalActions.updateProvidedBy({ queryCacheKey: T, providedTags: z }));
  }, s = (f, h, C, b = true) => (w, v) => {
    let T = o.endpoints[f].select(h)(v()), M = { patches: [], inversePatches: [], undo: () => w(o.util.patchQueryData(f, h, M.inversePatches, b)) };
    if (T.status === "uninitialized") return M;
    let z;
    if ("data" in T) if (Ue(T.data)) {
      let [k, q, O] = Li(T.data, C);
      M.patches.push(...q), M.inversePatches.push(...O), z = k;
    } else z = C(T.data), M.patches.push({ op: "replace", path: [], value: z }), M.inversePatches.push({ op: "replace", path: [], value: T.data });
    return M.patches.length === 0 || w(o.util.patchQueryData(f, h, M.patches, b)), M;
  }, u = (f, h, C) => (b) => b(o.endpoints[f].initiate(h, { subscribe: false, forceRefetch: true, [Ma]: () => ({ data: C }) })), c = async (f, { signal: h, abort: C, rejectWithValue: b, fulfillWithValue: w, dispatch: v, getState: P, extra: T }) => {
    let M = r[f.endpointName];
    try {
      let z = Oy, k, q = { signal: h, abort: C, dispatch: v, getState: P, extra: T, endpoint: f.endpointName, type: f.type, forced: f.type === "query" ? d(f, P()) : void 0 }, O = f.type === "query" ? f[Ma] : void 0;
      if (O ? k = O() : M.query ? (k = await t(M.query(f.originalArgs), q, M.extraOptions), M.transformResponse && (z = M.transformResponse)) : k = await M.queryFn(f.originalArgs, q, M.extraOptions, (Q) => t(Q, q, M.extraOptions)), typeof process < "u", k.error) throw new fo(k.error, k.meta);
      return w(await z(k.data, k.meta, f.originalArgs), { fulfilledTimeStamp: Date.now(), baseQueryMeta: k.meta, [Cn]: true });
    } catch (z) {
      let k = z;
      if (k instanceof fo) {
        let q = Oy;
        M.query && M.transformErrorResponse && (q = M.transformErrorResponse);
        try {
          return b(await q(k.value, k.meta, f.originalArgs), { baseQueryMeta: k.meta, [Cn]: true });
        } catch (O) {
          k = O;
        }
      }
      throw typeof process < "u", console.error(k), k;
    }
  };
  function d(f, h) {
    let C = h[e4]?.queries?.[f.queryCacheKey], b = h[e4]?.config.refetchOnMountOrArgChange, w = C?.fulfilledTimeStamp, v = f.forceRefetch ?? (f.subscribe && b);
    return v ? v === true || (Number(/* @__PURE__ */ new Date()) - Number(w)) / 1e3 >= v : false;
  }
  let m = L(`${e4}/executeQuery`, c, { getPendingMeta() {
    return { startedTimeStamp: Date.now(), [Cn]: true };
  }, condition(f, { getState: h }) {
    let C = h(), b = C[e4]?.queries?.[f.queryCacheKey], w = b?.fulfilledTimeStamp, v = f.originalArgs, P = b?.originalArgs, T = r[f.endpointName];
    return Op(f) ? true : b?.status === "pending" ? false : d(f, C) || Gy(T) && T?.forceRefetch?.({ currentArg: v, previousArg: P, endpointState: b, state: C }) ? true : !w;
  }, dispatchConditionRejection: true }), p = L(`${e4}/executeMutation`, c, { getPendingMeta() {
    return { startedTimeStamp: Date.now(), [Cn]: true };
  } }), l = (f) => "force" in f, g = (f) => "ifOlderThan" in f, A = (f, h, C) => (b, w) => {
    let v = l(C) && C.force, P = g(C) && C.ifOlderThan, T = (z = true) => {
      let k = { forceRefetch: z, isPrefetch: true };
      return o.endpoints[f].initiate(h, k);
    }, M = o.endpoints[f].select(h)(w());
    if (v) b(T());
    else if (P) {
      let z = M?.fulfilledTimeStamp;
      if (!z) {
        b(T());
        return;
      }
      (Number(/* @__PURE__ */ new Date()) - Number(new Date(z))) / 1e3 >= P && b(T());
    } else b(T(false));
  };
  function y(f) {
    return (h) => h?.meta?.arg?.endpointName === f;
  }
  function R(f, h) {
    return { matchPending: jn(ji(f), y(h)), matchFulfilled: jn(or(f), y(h)), matchRejected: jn(Sn(f), y(h)) };
  }
  return { queryThunk: m, mutationThunk: p, prefetch: A, updateQueryData: s, upsertQueryData: u, patchQueryData: i, buildMatchThunkActions: R };
}
function zy(e4, t, r, n) {
  return Vp(r[e4.meta.arg.endpointName][t], or(e4) ? e4.payload : void 0, Ca(e4) ? e4.payload : void 0, e4.meta.arg.originalArgs, "baseQueryMeta" in e4.meta ? e4.meta.baseQueryMeta : void 0, n);
}
function cc(e4, t, r) {
  let n = e4[t];
  n && r(n);
}
function Qa(e4) {
  return ("arg" in e4 ? e4.arg.fixedCacheKey : e4.fixedCacheKey) ?? e4.requestId;
}
function qy(e4, t, r) {
  let n = e4[Qa(t)];
  n && r(n);
}
var Na = {};
function FP({ reducerPath: e4, queryThunk: t, mutationThunk: r, context: { endpointDefinitions: n, apiUid: o, extractRehydrationInfo: a, hasRehydrationInfo: i }, assertTagType: s, config: u }) {
  let c = S(`${e4}/resetApiState`), d = An({ name: `${e4}/queries`, initialState: Na, reducers: { removeQueryResult: { reducer(h, { payload: { queryCacheKey: C } }) {
    delete h[C];
  }, prepare: $n() }, queryResultPatched: { reducer(h, { payload: { queryCacheKey: C, patches: b } }) {
    cc(h, C, (w) => {
      w.data = Rd(w.data, b.concat());
    });
  }, prepare: $n() } }, extraReducers(h) {
    h.addCase(t.pending, (C, { meta: b, meta: { arg: w } }) => {
      var P;
      let v = Op(w);
      C[P = w.queryCacheKey] ?? (C[P] = { status: "uninitialized", endpointName: w.endpointName }), cc(C, w.queryCacheKey, (T) => {
        T.status = "pending", T.requestId = v && T.requestId ? T.requestId : b.requestId, w.originalArgs !== void 0 && (T.originalArgs = w.originalArgs), T.startedTimeStamp = b.startedTimeStamp;
      });
    }).addCase(t.fulfilled, (C, { meta: b, payload: w }) => {
      cc(C, b.arg.queryCacheKey, (v) => {
        if (v.requestId !== b.requestId && !Op(b.arg)) return;
        let { merge: P } = n[b.arg.endpointName];
        if (v.status = "fulfilled", P) if (v.data !== void 0) {
          let { fulfilledTimeStamp: T, arg: M, baseQueryMeta: z, requestId: k } = b, q = nr(v.data, (O) => P(O, w, { arg: M.originalArgs, baseQueryMeta: z, fulfilledTimeStamp: T, requestId: k }));
          v.data = q;
        } else v.data = w;
        else v.data = n[b.arg.endpointName].structuralSharing ?? true ? By(Ke(v.data) ? Cd(v.data) : v.data, w) : w;
        delete v.error, v.fulfilledTimeStamp = b.fulfilledTimeStamp;
      });
    }).addCase(t.rejected, (C, { meta: { condition: b, arg: w, requestId: v }, error: P, payload: T }) => {
      cc(C, w.queryCacheKey, (M) => {
        if (!b) {
          if (M.requestId !== v) return;
          M.status = "rejected", M.error = T ?? P;
        }
      });
    }).addMatcher(i, (C, b) => {
      let { queries: w } = a(b);
      for (let [v, P] of Object.entries(w)) (P?.status === "fulfilled" || P?.status === "rejected") && (C[v] = P);
    });
  } }), m = An({ name: `${e4}/mutations`, initialState: Na, reducers: { removeMutationResult: { reducer(h, { payload: C }) {
    let b = Qa(C);
    b in h && delete h[b];
  }, prepare: $n() } }, extraReducers(h) {
    h.addCase(r.pending, (C, { meta: b, meta: { requestId: w, arg: v, startedTimeStamp: P } }) => {
      v.track && (C[Qa(b)] = { requestId: w, status: "pending", endpointName: v.endpointName, startedTimeStamp: P });
    }).addCase(r.fulfilled, (C, { payload: b, meta: w }) => {
      w.arg.track && qy(C, w, (v) => {
        v.requestId === w.requestId && (v.status = "fulfilled", v.data = b, v.fulfilledTimeStamp = w.fulfilledTimeStamp);
      });
    }).addCase(r.rejected, (C, { payload: b, error: w, meta: v }) => {
      v.arg.track && qy(C, v, (P) => {
        P.requestId === v.requestId && (P.status = "rejected", P.error = b ?? w);
      });
    }).addMatcher(i, (C, b) => {
      let { mutations: w } = a(b);
      for (let [v, P] of Object.entries(w)) (P?.status === "fulfilled" || P?.status === "rejected") && v !== P?.requestId && (C[v] = P);
    });
  } }), p = An({ name: `${e4}/invalidation`, initialState: Na, reducers: { updateProvidedBy: { reducer(h, C) {
    var v, P;
    let { queryCacheKey: b, providedTags: w } = C.payload;
    for (let T of Object.values(h)) for (let M of Object.values(T)) {
      let z = M.indexOf(b);
      z !== -1 && M.splice(z, 1);
    }
    for (let { type: T, id: M } of w) {
      let z = (v = h[T] ?? (h[T] = {}))[P = M || "__internal_without_id"] ?? (v[P] = []);
      z.includes(b) || z.push(b);
    }
  }, prepare: $n() } }, extraReducers(h) {
    h.addCase(d.actions.removeQueryResult, (C, { payload: { queryCacheKey: b } }) => {
      for (let w of Object.values(C)) for (let v of Object.values(w)) {
        let P = v.indexOf(b);
        P !== -1 && v.splice(P, 1);
      }
    }).addMatcher(i, (C, b) => {
      var v, P;
      let { provided: w } = a(b);
      for (let [T, M] of Object.entries(w)) for (let [z, k] of Object.entries(M)) {
        let q = (v = C[T] ?? (C[T] = {}))[P = z || "__internal_without_id"] ?? (v[P] = []);
        for (let O of k) q.includes(O) || q.push(O);
      }
    }).addMatcher(Pt(or(t), Ca(t)), (C, b) => {
      let w = zy(b, "providesTags", n, s), { queryCacheKey: v } = b.meta.arg;
      p.caseReducers.updateProvidedBy(C, p.actions.updateProvidedBy({ queryCacheKey: v, providedTags: w }));
    });
  } }), l = An({ name: `${e4}/subscriptions`, initialState: Na, reducers: { updateSubscriptionOptions(h, C) {
  }, unsubscribeQueryResult(h, C) {
  }, internal_getRTKQSubscriptions() {
  } } }), g = An({ name: `${e4}/internalSubscriptions`, initialState: Na, reducers: { subscriptionsUpdated: { reducer(h, C) {
    return Rd(h, C.payload);
  }, prepare: $n() } } }), A = An({ name: `${e4}/config`, initialState: { online: uP(), focused: cP(), middlewareRegistered: false, ...u }, reducers: { middlewareRegistered(h, { payload: C }) {
    h.middlewareRegistered = h.middlewareRegistered === "conflict" || o !== C ? "conflict" : true;
  } }, extraReducers: (h) => {
    h.addCase(Dp, (C) => {
      C.online = true;
    }).addCase($y, (C) => {
      C.online = false;
    }).addCase(qp, (C) => {
      C.focused = true;
    }).addCase(jy, (C) => {
      C.focused = false;
    }).addMatcher(i, (C) => ({ ...C }));
  } }), y = Bn({ queries: d.reducer, mutations: m.reducer, provided: p.reducer, subscriptions: g.reducer, config: A.reducer }), R = (h, C) => y(c.match(C) ? void 0 : h, C), f = { ...A.actions, ...d.actions, ...l.actions, ...g.actions, ...m.actions, ...p.actions, resetApiState: c };
  return { reducer: R, actions: f };
}
var Tp = Symbol.for("RTKQ/skipToken");
var Hy = { status: "uninitialized" };
var Dy = nr(Hy, () => {
});
var Vy = nr(Hy, () => {
});
function bP({ serializeQueryArgs: e4, reducerPath: t, createSelector: r }) {
  let n = (m) => Dy, o = (m) => Vy;
  return { buildQuerySelector: s, buildMutationSelector: u, selectInvalidatedBy: c, selectCachedArgsForQuery: d };
  function a(m) {
    return { ...m, ...iP(m.status) };
  }
  function i(m) {
    return m[t];
  }
  function s(m, p) {
    return (l) => {
      let g = e4({ queryArgs: l, endpointDefinition: p, endpointName: m });
      return r(l === Tp ? n : (R) => i(R)?.queries?.[g] ?? Dy, a);
    };
  }
  function u() {
    return (m) => {
      let p;
      return typeof m == "object" ? p = Qa(m) ?? Tp : p = m, r(p === Tp ? o : (A) => i(A)?.mutations?.[p] ?? Vy, a);
    };
  }
  function c(m, p) {
    let l = m[t], g = /* @__PURE__ */ new Set();
    for (let A of p.map(kp)) {
      let y = l.provided[A.type];
      if (!y) continue;
      let R = (A.id !== void 0 ? y[A.id] : wy(Object.values(y))) ?? [];
      for (let f of R) g.add(f);
    }
    return wy(Array.from(g.values()).map((A) => {
      let y = l.queries[A];
      return y ? [{ queryCacheKey: A, endpointName: y.endpointName, originalArgs: y.originalArgs }] : [];
    }));
  }
  function d(m, p) {
    return Object.values(m[t].queries).filter((l) => l?.endpointName === p && l.status !== "uninitialized").map((l) => l.originalArgs);
  }
}
var Ny = WeakMap ? /* @__PURE__ */ new WeakMap() : void 0;
var My = ({ endpointName: e4, queryArgs: t }) => {
  let r = "", n = Ny?.get(t);
  if (typeof n == "string") r = n;
  else {
    let o = JSON.stringify(t, (a, i) => (i = typeof i == "bigint" ? { $bigint: i.toString() } : i, i = wt(i) ? Object.keys(i).sort().reduce((s, u) => (s[u] = i[u], s), {}) : i, i));
    wt(t) && Ny?.set(t, o), r = o;
  }
  return `${e4}(${r})`;
};
function vP(...e4) {
  return function(r) {
    let n = _n((c) => r.extractRehydrationInfo?.(c, { reducerPath: r.reducerPath ?? "api" })), o = { reducerPath: "api", keepUnusedDataFor: 60, refetchOnMountOrArgChange: false, refetchOnFocus: false, refetchOnReconnect: false, invalidationBehavior: "delayed", ...r, extractRehydrationInfo: n, serializeQueryArgs(c) {
      let d = My;
      if ("serializeQueryArgs" in c.endpointDefinition) {
        let m = c.endpointDefinition.serializeQueryArgs;
        d = (p) => {
          let l = m(p);
          return typeof l == "string" ? l : My({ ...p, queryArgs: l });
        };
      } else r.serializeQueryArgs && (d = r.serializeQueryArgs);
      return d(c);
    }, tagTypes: [...r.tagTypes || []] }, a = { endpointDefinitions: {}, batch(c) {
      c();
    }, apiUid: Fd(), extractRehydrationInfo: n, hasRehydrationInfo: _n((c) => n(c) != null) }, i = { injectEndpoints: u, enhanceEndpoints({ addTagTypes: c, endpoints: d }) {
      if (c) for (let m of c) o.tagTypes.includes(m) || o.tagTypes.push(m);
      if (d) for (let [m, p] of Object.entries(d)) typeof p == "function" ? p(a.endpointDefinitions[m]) : Object.assign(a.endpointDefinitions[m] || {}, p);
      return i;
    } }, s = e4.map((c) => c.init(i, o, a));
    function u(c) {
      let d = c.endpoints({ query: (m) => ({ ...m, type: "query" }), mutation: (m) => ({ ...m, type: "mutation" }) });
      for (let [m, p] of Object.entries(d)) {
        if (c.overrideExisting !== true && m in a.endpointDefinitions) {
          if (c.overrideExisting === "throw") throw new Error(Xe(39));
          typeof process < "u";
          continue;
        }
        a.endpointDefinitions[m] = p;
        for (let l of s) l.injectEndpoint(m, p);
      }
      return i;
    }
    return i.injectEndpoints({ endpoints: r.endpoints });
  };
}
function Mr(e4, ...t) {
  return Object.assign(e4, ...t);
}
var IP = ({ api: e4, queryThunk: t, internalState: r }) => {
  let n = `${e4.reducerPath}/subscriptions`, o = null, a = null, { updateSubscriptionOptions: i, unsubscribeQueryResult: s } = e4.internalActions, u = (l, g) => {
    var y, R;
    if (i.match(g)) {
      let { queryCacheKey: f, requestId: h, options: C } = g.payload;
      return l?.[f]?.[h] && (l[f][h] = C), true;
    }
    if (s.match(g)) {
      let { queryCacheKey: f, requestId: h } = g.payload;
      return l[f] && delete l[f][h], true;
    }
    if (e4.internalActions.removeQueryResult.match(g)) return delete l[g.payload.queryCacheKey], true;
    if (t.pending.match(g)) {
      let { meta: { arg: f, requestId: h } } = g, C = l[y = f.queryCacheKey] ?? (l[y] = {});
      return C[`${h}_running`] = {}, f.subscribe && (C[h] = f.subscriptionOptions ?? C[h] ?? {}), true;
    }
    let A = false;
    if (t.fulfilled.match(g) || t.rejected.match(g)) {
      let f = l[g.meta.arg.queryCacheKey] || {}, h = `${g.meta.requestId}_running`;
      A || (A = !!f[h]), delete f[h];
    }
    if (t.rejected.match(g)) {
      let { meta: { condition: f, arg: h, requestId: C } } = g;
      if (f && h.subscribe) {
        let b = l[R = h.queryCacheKey] ?? (l[R] = {});
        b[C] = h.subscriptionOptions ?? b[C] ?? {}, A = true;
      }
    }
    return A;
  }, c = () => r.currentSubscriptions, p = { getSubscriptions: c, getSubscriptionCount: (l) => {
    let A = c()[l] ?? {};
    return go(A);
  }, isRequestSubscribed: (l, g) => !!c()?.[l]?.[g] };
  return (l, g) => {
    if (o || (o = JSON.parse(JSON.stringify(r.currentSubscriptions))), e4.util.resetApiState.match(l)) return o = r.currentSubscriptions = {}, a = null, [true, false];
    if (e4.internalActions.internal_getRTKQSubscriptions.match(l)) return [false, p];
    let A = u(r.currentSubscriptions, l), y = true;
    if (A) {
      a || (a = setTimeout(() => {
        let h = JSON.parse(JSON.stringify(r.currentSubscriptions)), [, C] = Li(o, () => h);
        g.next(e4.internalActions.subscriptionsUpdated(C)), o = h, a = null;
      }, 500));
      let R = typeof l.type == "string" && !!l.type.startsWith(n), f = t.rejected.match(l) && l.meta.condition && !!l.meta.arg.subscribe;
      y = !R && !f;
    }
    return [y, false];
  };
};
function wP(e4) {
  for (let t in e4) return false;
  return true;
}
var PP = 2147483647 / 1e3 - 1;
var EP = ({ reducerPath: e4, api: t, queryThunk: r, context: n, internalState: o }) => {
  let { removeQueryResult: a, unsubscribeQueryResult: i } = t.internalActions, s = Pt(i.match, r.fulfilled, r.rejected);
  function u(p) {
    let l = o.currentSubscriptions[p];
    return !!l && !wP(l);
  }
  let c = {}, d = (p, l, g) => {
    if (s(p)) {
      let A = l.getState()[e4], { queryCacheKey: y } = i.match(p) ? p.payload : p.meta.arg;
      m(y, A.queries[y]?.endpointName, l, A.config);
    }
    if (t.util.resetApiState.match(p)) for (let [A, y] of Object.entries(c)) y && clearTimeout(y), delete c[A];
    if (n.hasRehydrationInfo(p)) {
      let A = l.getState()[e4], { queries: y } = n.extractRehydrationInfo(p);
      for (let [R, f] of Object.entries(y)) m(R, f?.endpointName, l, A.config);
    }
  };
  function m(p, l, g, A) {
    let R = n.endpointDefinitions[l]?.keepUnusedDataFor ?? A.keepUnusedDataFor;
    if (R === 1 / 0) return;
    let f = Math.max(0, Math.min(R, PP));
    if (!u(p)) {
      let h = c[p];
      h && clearTimeout(h), c[p] = setTimeout(() => {
        u(p) || g.dispatch(a({ queryCacheKey: p })), delete c[p];
      }, f * 1e3);
    }
  }
  return d;
};
var Qy = new Error("Promise never resolved before cacheEntryRemoved.");
var TP = ({ api: e4, reducerPath: t, context: r, queryThunk: n, mutationThunk: o, internalState: a }) => {
  let i = $i(n), s = $i(o), u = or(n, o), c = {}, d = (l, g, A) => {
    let y = m(l);
    if (n.pending.match(l)) {
      let R = A[t].queries[y], f = g.getState()[t].queries[y];
      !R && f && p(l.meta.arg.endpointName, l.meta.arg.originalArgs, y, g, l.meta.requestId);
    } else if (o.pending.match(l)) g.getState()[t].mutations[y] && p(l.meta.arg.endpointName, l.meta.arg.originalArgs, y, g, l.meta.requestId);
    else if (u(l)) {
      let R = c[y];
      R?.valueResolved && (R.valueResolved({ data: l.payload, meta: l.meta.baseQueryMeta }), delete R.valueResolved);
    } else if (e4.internalActions.removeQueryResult.match(l) || e4.internalActions.removeMutationResult.match(l)) {
      let R = c[y];
      R && (delete c[y], R.cacheEntryRemoved());
    } else if (e4.util.resetApiState.match(l)) for (let [R, f] of Object.entries(c)) delete c[R], f.cacheEntryRemoved();
  };
  function m(l) {
    return i(l) ? l.meta.arg.queryCacheKey : s(l) ? l.meta.arg.fixedCacheKey ?? l.meta.requestId : e4.internalActions.removeQueryResult.match(l) ? l.payload.queryCacheKey : e4.internalActions.removeMutationResult.match(l) ? Qa(l.payload) : "";
  }
  function p(l, g, A, y, R) {
    let f = r.endpointDefinitions[l], h = f?.onCacheEntryAdded;
    if (!h) return;
    let C = {}, b = new Promise((z) => {
      C.cacheEntryRemoved = z;
    }), w = Promise.race([new Promise((z) => {
      C.valueResolved = z;
    }), b.then(() => {
      throw Qy;
    })]);
    w.catch(() => {
    }), c[A] = C;
    let v = e4.endpoints[l].select(f.type === "query" ? g : A), P = y.dispatch((z, k, q) => q), T = { ...y, getCacheEntry: () => v(y.getState()), requestId: R, extra: P, updateCachedData: f.type === "query" ? (z) => y.dispatch(e4.util.updateQueryData(l, g, z)) : void 0, cacheDataLoaded: w, cacheEntryRemoved: b }, M = h(g, T);
    Promise.resolve(M).catch((z) => {
      if (z !== Qy) throw z;
    });
  }
  return d;
};
var kP = ({ api: e4, context: { apiUid: t }, reducerPath: r }) => (n, o) => {
  e4.util.resetApiState.match(n) && o.dispatch(e4.internalActions.middlewareRegistered(t)), typeof process < "u";
};
var OP = ({ reducerPath: e4, context: t, context: { endpointDefinitions: r }, mutationThunk: n, queryThunk: o, api: a, assertTagType: i, refetchQuery: s, internalState: u }) => {
  let { removeQueryResult: c } = a.internalActions, d = Pt(or(n), Ca(n)), m = Pt(or(n, o), Sn(n, o)), p = [], l = (y, R) => {
    d(y) ? A(zy(y, "invalidatesTags", r, i), R) : m(y) ? A([], R) : a.util.invalidateTags.match(y) && A(Vp(y.payload, void 0, void 0, void 0, void 0, i), R);
  };
  function g(y) {
    for (let R in y.queries) if (y.queries[R]?.status === "pending") return true;
    for (let R in y.mutations) if (y.mutations[R]?.status === "pending") return true;
    return false;
  }
  function A(y, R) {
    let f = R.getState(), h = f[e4];
    if (p.push(...y), h.config.invalidationBehavior === "delayed" && g(h)) return;
    let C = p;
    if (p = [], C.length === 0) return;
    let b = a.util.selectInvalidatedBy(f, C);
    t.batch(() => {
      let w = Array.from(b.values());
      for (let { queryCacheKey: v } of w) {
        let P = h.queries[v], T = u.currentSubscriptions[v] ?? {};
        P && (go(T) === 0 ? R.dispatch(c({ queryCacheKey: v })) : P.status !== "uninitialized" && R.dispatch(s(P, v)));
      }
    });
  }
  return l;
};
var qP = ({ reducerPath: e4, queryThunk: t, api: r, refetchQuery: n, internalState: o }) => {
  let a = {}, i = (p, l) => {
    (r.internalActions.updateSubscriptionOptions.match(p) || r.internalActions.unsubscribeQueryResult.match(p)) && u(p.payload, l), (t.pending.match(p) || t.rejected.match(p) && p.meta.condition) && u(p.meta.arg, l), (t.fulfilled.match(p) || t.rejected.match(p) && !p.meta.condition) && s(p.meta.arg, l), r.util.resetApiState.match(p) && d();
  };
  function s({ queryCacheKey: p }, l) {
    let g = l.getState()[e4], A = g.queries[p], y = o.currentSubscriptions[p];
    if (!A || A.status === "uninitialized") return;
    let { lowestPollingInterval: R, skipPollingIfUnfocused: f } = m(y);
    if (!Number.isFinite(R)) return;
    let h = a[p];
    h?.timeout && (clearTimeout(h.timeout), h.timeout = void 0);
    let C = Date.now() + R;
    a[p] = { nextPollTimestamp: C, pollingInterval: R, timeout: setTimeout(() => {
      (g.config.focused || !f) && l.dispatch(n(A, p)), s({ queryCacheKey: p }, l);
    }, R) };
  }
  function u({ queryCacheKey: p }, l) {
    let A = l.getState()[e4].queries[p], y = o.currentSubscriptions[p];
    if (!A || A.status === "uninitialized") return;
    let { lowestPollingInterval: R } = m(y);
    if (!Number.isFinite(R)) {
      c(p);
      return;
    }
    let f = a[p], h = Date.now() + R;
    (!f || h < f.nextPollTimestamp) && s({ queryCacheKey: p }, l);
  }
  function c(p) {
    let l = a[p];
    l?.timeout && clearTimeout(l.timeout), delete a[p];
  }
  function d() {
    for (let p of Object.keys(a)) c(p);
  }
  function m(p = {}) {
    let l = false, g = Number.POSITIVE_INFINITY;
    for (let A in p) p[A].pollingInterval && (g = Math.min(p[A].pollingInterval, g), l = p[A].skipPollingIfUnfocused || l);
    return { lowestPollingInterval: g, skipPollingIfUnfocused: l };
  }
  return i;
};
var DP = ({ api: e4, context: t, queryThunk: r, mutationThunk: n }) => {
  let o = ji(r, n), a = Sn(r, n), i = or(r, n), s = {};
  return (c, d) => {
    if (o(c)) {
      let { requestId: m, arg: { endpointName: p, originalArgs: l } } = c.meta, g = t.endpointDefinitions[p], A = g?.onQueryStarted;
      if (A) {
        let y = {}, R = new Promise((b, w) => {
          y.resolve = b, y.reject = w;
        });
        R.catch(() => {
        }), s[m] = y;
        let f = e4.endpoints[p].select(g.type === "query" ? l : m), h = d.dispatch((b, w, v) => v), C = { ...d, getCacheEntry: () => f(d.getState()), requestId: m, extra: h, updateCachedData: g.type === "query" ? (b) => d.dispatch(e4.util.updateQueryData(p, l, b)) : void 0, queryFulfilled: R };
        A(l, C);
      }
    } else if (i(c)) {
      let { requestId: m, baseQueryMeta: p } = c.meta;
      s[m]?.resolve({ data: c.payload, meta: p }), delete s[m];
    } else if (a(c)) {
      let { requestId: m, rejectedWithValue: p, baseQueryMeta: l } = c.meta;
      s[m]?.reject({ error: c.payload ?? c.error, isUnhandledError: !p, meta: l }), delete s[m];
    }
  };
};
var VP = ({ reducerPath: e4, context: t, api: r, refetchQuery: n, internalState: o }) => {
  let { removeQueryResult: a } = r.internalActions, i = (u, c) => {
    qp.match(u) && s(c, "refetchOnFocus"), Dp.match(u) && s(c, "refetchOnReconnect");
  };
  function s(u, c) {
    let d = u.getState()[e4], m = d.queries, p = o.currentSubscriptions;
    t.batch(() => {
      for (let l of Object.keys(p)) {
        let g = m[l], A = p[l];
        if (!A || !g) continue;
        (Object.values(A).some((R) => R[c] === true) || Object.values(A).every((R) => R[c] === void 0) && d.config[c]) && (go(A) === 0 ? u.dispatch(a({ queryCacheKey: l })) : g.status !== "uninitialized" && u.dispatch(n(g, l)));
      }
    });
  }
  return i;
};
function NP(e4) {
  let { reducerPath: t, queryThunk: r, api: n, context: o } = e4, { apiUid: a } = o, i = { invalidateTags: S(`${t}/invalidateTags`) }, s = (m) => m.type.startsWith(`${t}/`), u = [kP, EP, OP, qP, TP, DP];
  return { middleware: (m) => {
    let p = false, g = { ...e4, internalState: { currentSubscriptions: {} }, refetchQuery: d, isThisApiSliceAction: s }, A = u.map((f) => f(g)), y = IP(g), R = VP(g);
    return (f) => (h) => {
      if (!Di(h)) return f(h);
      p || (p = true, m.dispatch(n.internalActions.middlewareRegistered(a)));
      let C = { ...m, next: f }, b = m.getState(), [w, v] = y(h, C, b), P;
      if (w ? P = f(h) : P = v, m.getState()[t] && (R(h, C, b), s(h) || o.hasRehydrationInfo(h))) for (let T of A) T(h, C, b);
      return P;
    };
  }, actions: i };
  function d(m, p, l = {}) {
    return r({ type: "query", endpointName: m.endpointName, originalArgs: m.originalArgs, subscribe: false, forceRefetch: true, queryCacheKey: p, ...l });
  }
}
var Ly = Symbol();
var MP = ({ createSelector: e4 = W } = {}) => ({ name: Ly, init(t, { baseQuery: r, tagTypes: n, reducerPath: o, serializeQueryArgs: a, keepUnusedDataFor: i, refetchOnMountOrArgChange: s, refetchOnFocus: u, refetchOnReconnect: c, invalidationBehavior: d }, m) {
  $g();
  let p = (U) => (typeof process < "u", U);
  Object.assign(t, { reducerPath: o, endpoints: {}, internalActions: { onOnline: Dp, onOffline: $y, onFocus: qp, onFocusLost: jy }, util: {} });
  let { queryThunk: l, mutationThunk: g, patchQueryData: A, updateQueryData: y, upsertQueryData: R, prefetch: f, buildMatchThunkActions: h } = xP({ baseQuery: r, reducerPath: o, context: m, api: t, serializeQueryArgs: a, assertTagType: p }), { reducer: C, actions: b } = FP({ context: m, queryThunk: l, mutationThunk: g, reducerPath: o, assertTagType: p, config: { refetchOnFocus: u, refetchOnReconnect: c, refetchOnMountOrArgChange: s, keepUnusedDataFor: i, reducerPath: o, invalidationBehavior: d } });
  Mr(t.util, { patchQueryData: A, updateQueryData: y, upsertQueryData: R, prefetch: f, resetApiState: b.resetApiState }), Mr(t.internalActions, b);
  let { middleware: w, actions: v } = NP({ reducerPath: o, context: m, queryThunk: l, mutationThunk: g, api: t, assertTagType: p });
  Mr(t.util, v), Mr(t, { reducer: C, middleware: w });
  let { buildQuerySelector: P, buildMutationSelector: T, selectInvalidatedBy: M, selectCachedArgsForQuery: z } = bP({ serializeQueryArgs: a, reducerPath: o, createSelector: e4 });
  Mr(t.util, { selectInvalidatedBy: M, selectCachedArgsForQuery: z });
  let { buildInitiateQuery: k, buildInitiateMutation: q, getRunningMutationThunk: O, getRunningMutationsThunk: Q, getRunningQueriesThunk: D, getRunningQueryThunk: j } = RP({ queryThunk: l, mutationThunk: g, api: t, serializeQueryArgs: a, context: m });
  return Mr(t.util, { getRunningMutationThunk: O, getRunningMutationsThunk: Q, getRunningQueryThunk: j, getRunningQueriesThunk: D }), { name: Ly, injectEndpoint(U, J) {
    var ue;
    let te = t;
    (ue = te.endpoints)[U] ?? (ue[U] = {}), Gy(J) ? Mr(te.endpoints[U], { name: U, select: P(U, J), initiate: k(U, J) }, h(l, U)) : SP(J) && Mr(te.endpoints[U], { name: U, select: T(), initiate: q(U) }, h(g, U));
  } };
} });
var Wy = vP(MP());
var QP = async (e4, t, r) => {
  let n = t.getState(), { accessToken: o, environment: a, organizationId: i } = n.configuration, s = n.generatedAnswer.answerConfigurationId, u = { ...e4, headers: { ...e4?.headers || {}, Authorization: `Bearer ${o}` } };
  try {
    let c = de(i, a);
    return { data: Uy({ baseUrl: `${c}/rest/organizations/${i}/answer/v1/configs/${s}` })(u, t, r) };
  } catch (c) {
    return { error: c };
  }
};
var uc = Wy({ reducerPath: "answer", baseQuery: _y(QP, { maxRetries: 3 }), endpoints: () => ({}) });
var LP = (e4, t) => {
  let { contentFormat: r } = t;
  e4.contentFormat = r, e4.isStreaming = true, e4.isLoading = false;
};
var BP = (e4, t) => {
  e4.answer === void 0 ? e4.answer = t.textDelta : typeof t.textDelta == "string" && (e4.answer = e4.answer.concat(t.textDelta));
};
var UP = (e4, t) => {
  e4.citations = t.citations;
};
var _P = (e4, t) => {
  e4.generated = t.answerGenerated, e4.isStreaming = false;
};
var jP = (e4, t) => {
  e4.error = { message: t.errorMessage, code: t.code }, e4.isStreaming = false, e4.isLoading = false, console.error(`${t.errorMessage} - code ${t.code}`);
};
var $P = (e4, t) => {
  let r = JSON.parse(e4.data);
  r.finishReason === "ERROR" && r.errorMessage && jP(t, r);
  let n = r.payload.length ? JSON.parse(r.payload) : {};
  switch (r.payloadType) {
    case "genqa.headerMessageType":
      n.contentFormat && LP(t, n);
      break;
    case "genqa.messageType":
      n.textDelta && BP(t, n);
      break;
    case "genqa.citationsType":
      n.citations && UP(t, n);
      break;
    case "genqa.endOfStreamType":
      (t.answer?.length || n.answerGenerated) && _P(t, n);
      break;
  }
};
var vn = uc.injectEndpoints({ overrideExisting: true, endpoints: (e4) => ({ getAnswer: e4.query({ queryFn: () => ({ data: { contentFormat: void 0, answer: void 0, citations: void 0, error: void 0, generated: false, isStreaming: true, isLoading: true } }), async onCacheEntryAdded(t, { getState: r, cacheDataLoaded: n, updateCachedData: o }) {
  await n;
  let { configuration: a, generatedAnswer: i } = r(), { organizationId: s, environment: u, accessToken: c } = a, d = de(s, u);
  await oa(`${d}/rest/organizations/${s}/answer/v1/configs/${i.answerConfigurationId}/generate`, { method: "POST", body: JSON.stringify(t), headers: { Authorization: `Bearer ${c}`, Accept: "application/json", "Content-Type": "application/json", "Accept-Encoding": "*" }, fetch, onopen: async (m) => {
    let p = m.headers.get("x-answer-id");
    p && o((l) => {
      l.answerId = p;
    });
  }, onmessage: (m) => {
    o((p) => {
      $P(m, p);
    });
  }, onerror: (m) => {
    throw m;
  } });
} }) }) });
var Yy = W((e4) => Da(e4)?.q, (e4) => e4.search.requestId, (e4, t) => ({ q: e4, requestId: t }));
var lc = {};
var GP = (e4, t) => ({ ...lc, [e4]: zs(t)?.map((r) => lp(r, up())).sort((r, n) => r.facetId > n.facetId ? 1 : n.facetId > r.facetId ? -1 : 0) });
var zP = (e4) => e4.pagination ? e4.pagination.firstResult + e4.pagination.numberOfResults > 5e3 ? 5e3 - e4.pagination.firstResult : e4.pagination.numberOfResults : void 0;
var Ky = (e4, t) => {
  let r = Da(e4)?.q, n = vy(e4), o = by(e4), a = Fy(e4) ?? [];
  return r && t === "fetch" && (lc = GP(r, e4)), { q: r, pipelineRuleParameters: { mlGenerativeQuestionAnswering: { responseFormat: e4.generatedAnswer.responseFormat, citationsFieldToInclude: a } }, ...n?.length && { searchHub: n }, ...o?.length && { pipeline: o }, ...lc[r]?.length && { facets: lc[r] }, ...e4.fields && { fieldsToInclude: e4.fields.fieldsToInclude }, ...e4.didYouMean && { queryCorrection: { enabled: e4.didYouMean.enableDidYouMean && e4.didYouMean.queryCorrectionMode === "next", options: { automaticallyCorrect: e4.didYouMean.automaticallyCorrectQuery ? "whenNoResults" : "never" } }, enableDidYouMean: e4.didYouMean.enableDidYouMean && e4.didYouMean.queryCorrectionMode === "legacy" }, ...e4.pagination && { numberOfResults: zP(e4), firstResult: e4.pagination.firstResult }, tab: e4.configuration.analytics.originLevel2 };
};
var Va = (e4) => vn.endpoints.getAnswer.select(Ky(e4, "select"))(e4);
var Jy = $(Gn, (e4) => e4);
var cS = bt(tS(), 1);
var dc = { q: new StringValue(), enableQuerySyntax: new BooleanValue(), aq: new StringValue(), cq: new StringValue(), firstResult: new NumberValue({ min: 0 }), numberOfResults: new NumberValue({ min: 0 }), sortCriteria: new StringValue(), f: new RecordValue(), fExcluded: new RecordValue(), cf: new RecordValue(), nf: new RecordValue(), mnf: new RecordValue(), df: new RecordValue(), debug: new BooleanValue(), sf: new RecordValue(), tab: new StringValue(), af: new RecordValue() };
var ge = S("searchParameters/restore", (e4) => x(e4, dc));
var pc = S("tab/register", (e4) => {
  let t = new RecordValue({ values: { id: E, expression: se } });
  return x(e4, t);
});
var ut = S("tab/updateActiveTab", (e4) => x(e4, E));
var mc = bt(ys(), 1);
var iS = bt(oS(), 1);
var sS = bt(aS(), 1);
mc.default.extend(sS.default);
mc.default.extend(iS.default);
var gc = () => ({ organizationId: "", accessToken: "", search: { locale: "en-US", timezone: mc.default.tz.guess(), authenticationProviders: [] }, analytics: { enabled: true, originContext: "Search", originLevel2: "default", originLevel3: "default", anonymous: false, deviceId: "", userDisplayName: "", documentLocation: "", trackingId: "", analyticsMode: "next", source: {} }, knowledge: { answerConfigurationId: "" }, environment: "prod" });
var fc = $(gc(), (e4) => e4.addCase(io, (t, r) => {
  JP(t, r.payload);
}).addCase(so, (t, r) => {
  XP(t, r.payload);
}).addCase(ds, (t, r) => {
  ZP(t, r.payload);
}).addCase(ps, (t) => {
  t.analytics.enabled = false;
}).addCase(ms, (t) => {
  t.analytics.enabled = true;
}).addCase(hh, (t, r) => {
  t.analytics.originLevel2 = r.payload.originLevel2;
}).addCase(yh, (t, r) => {
  t.analytics.originLevel3 = r.payload.originLevel3;
}).addCase(ut, (t, r) => {
  t.analytics.originLevel2 = r.payload;
}).addCase(ge, (t, r) => {
  t.analytics.originLevel2 = r.payload.tab || t.analytics.originLevel2;
}));
function JP(e4, t) {
  isNullOrUndefined(t.accessToken) || (e4.accessToken = t.accessToken), e4.environment = t.environment ?? "prod", isNullOrUndefined(t.organizationId) || (e4.organizationId = t.organizationId);
}
function XP(e4, t) {
  isNullOrUndefined(t.proxyBaseUrl) || (e4.search.apiBaseUrl = t.proxyBaseUrl), isNullOrUndefined(t.locale) || (e4.search.locale = t.locale), isNullOrUndefined(t.timezone) || (e4.search.timezone = t.timezone), isNullOrUndefined(t.authenticationProviders) || (e4.search.authenticationProviders = t.authenticationProviders);
}
function ZP(e4, t) {
  isNullOrUndefined(t.enabled) || (e4.analytics.enabled = t.enabled), isNullOrUndefined(t.originContext) || (e4.analytics.originContext = t.originContext), isNullOrUndefined(t.originLevel2) || (e4.analytics.originLevel2 = t.originLevel2), isNullOrUndefined(t.originLevel3) || (e4.analytics.originLevel3 = t.originLevel3), isNullOrUndefined(t.proxyBaseUrl) || (e4.analytics.apiBaseUrl = t.proxyBaseUrl), isNullOrUndefined(t.trackingId) || (e4.analytics.trackingId = t.trackingId), isNullOrUndefined(t.analyticsMode) || (e4.analytics.analyticsMode = t.analyticsMode), isNullOrUndefined(t.source) || (e4.analytics.source = t.source);
  let r = (0, cS.default)();
  r && (e4.analytics.analyticsMode = "next", e4.analytics.trackingId = r), isNullOrUndefined(t.runtimeEnvironment) || (e4.analytics.runtimeEnvironment = t.runtimeEnvironment), isNullOrUndefined(t.anonymous) || (e4.analytics.anonymous = t.anonymous), isNullOrUndefined(t.deviceId) || (e4.analytics.deviceId = t.deviceId), isNullOrUndefined(t.userDisplayName) || (e4.analytics.userDisplayName = t.userDisplayName), isNullOrUndefined(t.documentLocation) || (e4.analytics.documentLocation = t.documentLocation);
}
var bS = bt(FS(), 1);
var wS = { organizationId: E, accessToken: E, name: new StringValue({ required: false, emptyAllowed: false }), analytics: new RecordValue({ options: { required: false }, values: { enabled: new BooleanValue({ required: false }), originContext: new StringValue({ required: false }), originLevel2: new StringValue({ required: false }), originLevel3: new StringValue({ required: false }), analyticsMode: new StringValue({ constrainTo: ["legacy", "next"], required: false, default: "next" }), proxyBaseUrl: new StringValue({ required: false, url: true }) } }), environment: new StringValue({ required: false, default: "prod", constrainTo: ["prod", "hipaa", "stg", "dev"] }) };
var ES = new Schema({ ...wS, insightId: E, search: new RecordValue({ options: { required: false }, values: { locale: ne } }) });
var _a = { id: E };
var Lr = S("querySuggest/register", (e4) => x(e4, { ..._a, count: new NumberValue({ min: 0 }) }));
var kS = S("querySuggest/unregister", (e4) => x(e4, _a));
var Br = S("querySuggest/selectSuggestion", (e4) => x(e4, { ..._a, expression: se }));
var Ur = S("querySuggest/clear", (e4) => x(e4, _a));
var ho = L("querySuggest/fetch", async (e4, { getState: t, rejectWithValue: r, extra: { apiClient: n, validatePayload: o, navigatorContext: a } }) => {
  o(e4, _a);
  let i = e4.id, s = await ME(i, t(), a), u = await n.querySuggest(s);
  return oe(u) ? r(u.error) : { id: i, q: s.q, ...u.success };
});
var ME = async (e4, t, r) => ({ accessToken: t.configuration.accessToken, organizationId: t.configuration.organizationId, url: t.configuration.search.apiBaseUrl ?? Le(t.configuration.organizationId, t.configuration.environment), count: t.querySuggest[e4].count, q: t.querySet[e4], locale: t.configuration.search.locale, timezone: t.configuration.search.timezone, actionsHistory: t.configuration.analytics.enabled ? _e.getHistory() : [], ...t.context && { context: t.context.contextValues }, ...t.pipeline && { pipeline: t.pipeline }, ...t.searchHub && { searchHub: t.searchHub }, tab: t.configuration.analytics.originLevel2, ...t.configuration.analytics.enabled && { visitorId: await it(t.configuration.analytics), ...t.configuration.analytics.enabled && t.configuration.analytics.analyticsMode === "legacy" ? await Ir(t.configuration.analytics) : js(t.configuration.analytics, r) }, ...t.configuration.search.authenticationProviders.length && { authentication: t.configuration.search.authenticationProviders.join(",") } });
var ja = { id: E, query: se };
var yo = S("querySet/register", (e4) => x(e4, ja));
var Pn = S("querySet/update", (e4) => x(e4, ja));
var OS = S("commerce/querySet/register", (e4) => x(e4, ja));
var qS = S("commerce/querySet/update", (e4) => x(e4, ja));
var St = (e4) => e4.error !== void 0;
function Rc(e4, t = "prod") {
  return `${de(e4, t)}/rest/organizations/${e4}/commerce/v2`;
}
var xc = (e4) => LE(e4.cartItems, e4.cart);
function LE(e4, t) {
  let r = e4.reduce((n, o) => {
    let { productId: a, quantity: i } = t[o];
    return a in n || (n[a] = { productId: a, quantity: 0 }), n[a].quantity += i, n;
  }, {});
  return [...Object.values(r)];
}
var DS = S("commerce/querySuggest/clear", (e4) => x(e4, { id: E }));
var _r = L("commerce/querySuggest/fetch", async (e4, { getState: t, rejectWithValue: r, extra: { apiClient: n, validatePayload: o, navigatorContext: a } }) => {
  o(e4, { id: E });
  let i = t(), s = UE(e4.id, i, a), u = await n.querySuggest(s);
  return St(u) ? r(u.error) : { id: e4.id, query: s.query, ...u.success };
});
var VS = S("commerce/querySuggest/register", (e4) => x(e4, { id: E, count: new NumberValue({ min: 0 }) }));
var NS = S("commerce/querySuggest/selectSuggestion", (e4) => x(e4, { id: E, expression: se }));
var UE = (e4, t, r) => {
  let { view: n, ...o } = t.commerceContext;
  return { accessToken: t.configuration.accessToken, url: t.configuration.commerce.apiBaseUrl ?? Rc(t.configuration.organizationId, t.configuration.environment), organizationId: t.configuration.organizationId, trackingId: t.configuration.analytics.trackingId, query: t.querySet[e4], ...o, ...t.configuration.analytics.enabled ? { clientId: r.clientId } : {}, context: { ...r.userAgent ? { user: { userAgent: r.userAgent } } : {}, view: { ...n, ...r.referrer ? { referrer: r.referrer } : {} }, capture: t.configuration.analytics.enabled, cart: xc(t.cart), source: Et(t.configuration.analytics) } };
};
var QS = { f: new RecordValue(), cf: new RecordValue(), nf: new RecordValue(), mnf: new RecordValue(), df: new RecordValue(), sortCriteria: new RecordValue(), page: new NumberValue({ min: 0 }), perPage: new NumberValue({ min: 1 }) };
var LS = { q: new StringValue(), ...QS };
var BS = S("commerce/searchParameters/restore", (e4) => x(e4, LS));
var $a = ((r) => (r.Relevance = "relevance", r.Fields = "fields", r))($a || {});
var Fc = ((r) => (r.Ascending = "asc", r.Descending = "desc", r))(Fc || {});
var JW = new RecordValue({ options: { required: false }, values: { by: new EnumValue({ enum: $a, required: true }), fields: new ArrayValue({ each: new RecordValue({ values: { name: new StringValue(), direction: new EnumValue({ enum: Fc }) } }) }) } });
var o2 = new RecordValue({ options: { required: false }, values: { by: new EnumValue({ enum: $a, required: true }), fields: new ArrayValue({ each: new RecordValue({ values: { field: new StringValue({ required: true }), direction: new EnumValue({ enum: Fc }), displayName: new StringValue() } }) }) } });
var tt = (e4, t) => ({ ...HE(e4, t), facets: [...YE(e4), ...KE(e4)], ...e4.commerceSort && { sort: JE(e4.commerceSort.appliedSort) } });
var HE = (e4, t, r) => {
  let { view: n, ...o } = e4.commerceContext;
  return { accessToken: e4.configuration.accessToken, url: e4.configuration.commerce.apiBaseUrl ?? Rc(e4.configuration.organizationId, e4.configuration.environment), organizationId: e4.configuration.organizationId, trackingId: e4.configuration.analytics.trackingId, ...o, ...e4.configuration.analytics.enabled ? { clientId: t.clientId } : {}, context: { ...t.userAgent ? { user: { userAgent: t.userAgent } } : {}, view: { ...n, ...t.referrer ? { referrer: t.referrer } : {} }, capture: e4.configuration.analytics.enabled, cart: xc(e4.cart), source: Et(e4.configuration.analytics) }, ...WE(e4, r) };
};
var WE = (e4, t) => {
  let r = t ? e4.commercePagination?.recommendations[t] : e4.commercePagination?.principal;
  return r && { page: r.page, ...r.perPage && { perPage: r.perPage } };
};
function YE(e4) {
  return !e4.facetOrder || !e4.commerceFacetSet ? [] : e4.facetOrder.filter((t) => e4.commerceFacetSet?.[t]).map((t) => e4.commerceFacetSet[t].request).filter((t) => t && t.values.length > 0);
}
function KE(e4) {
  return e4.manualNumericFacetSet ? Object.entries(e4.manualNumericFacetSet).filter(([t, r]) => r.manualRange !== void 0).map(([t, r]) => ({ facetId: t, field: t, numberOfValues: 1, isFieldExpanded: false, preventAutoSelect: true, type: "numericalRange", values: [r.manualRange], initialNumberOfValues: 1 })) : [];
}
function JE(e4) {
  return e4.by === "relevance" ? { sortCriteria: "relevance" } : { sortCriteria: "fields", fields: e4.fields.map(({ name: t, direction: r }) => ({ field: t, direction: r })) };
}
var f2 = S("commerce/facets/core/updateNumberOfValues", (e4) => x(e4, { facetId: E, numberOfValues: new NumberValue({ required: true, min: 1 }) }));
var h2 = S("commerce/facets/core/updateIsFieldExpanded", (e4) => x(e4, { facetId: E, isFieldExpanded: new BooleanValue({ required: true }) }));
var zS = S("commerce/facets/core/clearAll");
var y2 = S("commerce/facets/core/deselectAllValues", (e4) => x(e4, { facetId: E }));
var S2 = S("commerce/facets/core/updateFreezeCurrentValues", (e4) => x(e4, { facetId: E, freezeCurrentValues: new BooleanValue({ required: true }) }));
var HS = S("commerce/facets/core/updateAutoSelectionForAll", (e4) => x(e4, { allow: new BooleanValue({ required: true }) }));
var bc = { slotId: Eg };
var ZE = { ...bc, pageSize: new NumberValue({ required: true, min: 0 }) };
var F2 = S("commerce/pagination/setPageSize", (e4) => x(e4, ZE));
var eT = { ...bc, page: new NumberValue({ required: true, min: 0 }) };
var YS = S("commerce/pagination/selectPage", (e4) => x(e4, eT));
var b2 = S("commerce/pagination/nextPage", (e4) => x(e4, bc));
var v2 = S("commerce/pagination/previousPage", (e4) => x(e4, bc));
var I2 = S("commerce/pagination/registerRecommendationsSlot", (e4) => x(e4, { slotId: E }));
var vc = W((e4) => e4.commercePagination?.principal.perPage || 0, (e4) => e4);
var E2 = W((e4, t) => e4.commercePagination?.recommendations[t]?.perPage || 0, (e4) => e4);
var Ic = W((e4) => e4.commercePagination?.principal.totalEntries || 0, (e4) => e4);
var T2 = W((e4, t) => e4.commercePagination?.recommendations[t]?.totalEntries || 0, (e4) => e4);
var k2 = W((e4) => e4.commercePagination?.principal.page || 0, (e4) => e4);
var O2 = W((e4, t) => e4.commercePagination?.recommendations[t]?.page || 0, (e4) => e4);
var wc = S("commerce/query/update", (e4) => x(e4, { query: new StringValue() }));
var KS = S("commerce/triggers/query/updateIgnore", (e4) => x(e4, { q: new StringValue({ emptyAllowed: true, required: true }) }));
var JS = S("commerce/triggers/query/applyModification", (e4) => x(e4, new RecordValue({ values: { originalQuery: ne, modification: ne } })));
var oT = "coveo-headless-internal-state";
var Pc = Symbol.for(oT);
var mY = W((e4) => e4[Pc].commerceSearch.responseId, (e4) => e4);
var gY = W((e4) => e4.commerceSearch.responseId, (e4) => e4);
var fY = W((e4) => e4.commerceSearch.requestId, (e4) => e4);
var Xp = W((e4) => e4.commerceSearch?.products.length || 0, (e4) => e4);
var ZS = W((e4) => ({ total: Ic(e4), current: Xp(e4) }), ({ current: e4, total: t }) => e4 < t);
var hY = W((e4) => e4.commerceSearch?.isLoading, (e4) => isNullOrUndefined(e4) ? false : e4);
var yY = W((e4) => e4.commerceSearch?.error, (e4) => e4 ?? null);
var Ec = W((e4) => e4.commerceQuery?.query, (e4) => e4 ?? "");
var SY = W((e4) => e4.commerceSearch?.queryExecuted, (e4) => e4);
var eC = (e4, t) => isNullOrUndefined(t.queryCorrection?.correctedQuery) ? Ec(e4) : t.queryCorrection.correctedQuery;
var Ga = class {
  constructor(t) {
    this.config = t;
  }
  async process(t) {
    return this.processQueryErrorOrContinue(t) ?? await this.processQueryCorrectionsOrContinue(t) ?? await this.processQueryTriggersOrContinue(t) ?? this.processSuccessResponse(t);
  }
  async fetchFromAPI(t) {
    let r = (/* @__PURE__ */ new Date()).getTime(), n = await this.extra.apiClient.search(t), o = (/* @__PURE__ */ new Date()).getTime() - r, a = this.getState().commerceQuery.query || "";
    return { response: n, duration: o, queryExecuted: a, requestExecuted: t };
  }
  processSuccessResponse(t) {
    return { ...t, response: this.getSuccessResponse(t), originalQuery: this.getCurrentQuery() };
  }
  processQueryErrorOrContinue(t) {
    return St(t.response) ? this.rejectWithValue(t.response.error) : null;
  }
  async processQueryCorrectionsOrContinue(t) {
    let r = this.getState(), n = this.getSuccessResponse(t);
    if (!n || !r.didYouMean) return null;
    let { queryCorrection: o } = n;
    if (!(!isNullOrUndefined(o) && !isNullOrUndefined(o.correctedQuery))) return null;
    let { correctedQuery: i, originalQuery: s } = n.queryCorrection;
    return this.onUpdateQueryForCorrection(i), { ...t, response: { ...n }, queryExecuted: eC(r, n), originalQuery: s };
  }
  async processQueryTriggersOrContinue(t) {
    let r = this.getSuccessResponse(t);
    if (!r) return null;
    let n = r.triggers.find((s) => s.type === "query")?.content || "";
    if (!n) return null;
    if (this.getState().triggers?.queryModification.queryToIgnore === n) return this.dispatch(KS({ q: "" })), null;
    let a = this.getCurrentQuery(), i = await this.automaticallyRetryQueryWithTriggerModification(n);
    return St(i.response) ? this.rejectWithValue(i.response.error) : { ...i, response: { ...i.response.success }, originalQuery: a };
  }
  async automaticallyRetryQueryWithTriggerModification(t) {
    return this.dispatch(JS({ newQuery: t, originalQuery: this.getCurrentQuery() })), this.onUpdateQueryForCorrection(t), await this.fetchFromAPI({ ...tt(this.getState(), this.navigatorContext), query: t });
  }
  get dispatch() {
    return this.config.dispatch;
  }
  get rejectWithValue() {
    return this.config.rejectWithValue;
  }
  getState() {
    return this.config.getState();
  }
  get navigatorContext() {
    return this.config.extra.navigatorContext;
  }
  getCurrentQuery() {
    let t = this.getState();
    return t.commerceQuery.query !== void 0 ? t.commerceQuery.query : "";
  }
  getSuccessResponse(t) {
    return St(t.response) ? null : t.response.success;
  }
  get extra() {
    return this.config.extra;
  }
  onUpdateQueryForCorrection(t) {
    this.dispatch(wc({ query: t }));
  }
};
var Co = L("commerce/search/executeSearch", async (e4, t) => {
  let { getState: r } = t, n = r(), { navigatorContext: o } = t.extra, a = tt(n, o), i = Ec(n), s = new Ga(t), u = await s.fetchFromAPI({ ...a, query: i });
  return s.process(u);
});
var GY = L("commerce/search/fetchMoreProducts", async (e4, t) => {
  let { getState: r } = t, n = r(), { navigatorContext: o } = t.extra;
  if (!ZS(n)) return null;
  let i = vc(n), u = Xp(n) / i, c = Ec(n), d = tt(n, o), m = new Ga(t), p = await m.fetchFromAPI({ ...d, query: c, page: u });
  return m.process(p);
});
var zY = L("commerce/search/prepareForSearchWithQuery", (e4, t) => {
  let { dispatch: r } = t;
  x(e4, { query: new StringValue(), clearFilters: new BooleanValue() }), e4.clearFilters && (r(zS()), r(Er())), r(HS({ allow: true })), r(wc({ query: e4.query })), r(YS({ page: 0 }));
});
var HY = L("commerce/search/fetchInstantProducts", async (e4, { getState: t, rejectWithValue: r, extra: n }) => {
  let o = t(), { apiClient: a, navigatorContext: i } = n, { q: s } = e4, u = await a.productSuggestions({ ...tt(o, i), query: s });
  if (St(u)) return r(u.error);
  let c = u.success.products.slice(0, 5);
  return { response: { ...u.success, products: c } };
});
var sT = { child: new RecordValue({ options: { required: true }, values: { permanentid: new StringValue({ required: true }) } }) };
var WY = S("commerce/search/promoteChildToParent", (e4) => x(e4, sT));
var Ao = $(ws(), (e4) => {
  e4.addCase(yo, (t, r) => oC(t, r.payload)).addCase(OS, (t, r) => oC(t, r.payload)).addCase(Pn, (t, r) => {
    let { id: n, query: o } = r.payload;
    za(t, n, o);
  }).addCase(qS, (t, r) => {
    let { id: n, query: o } = r.payload;
    za(t, n, o);
  }).addCase(Br, (t, r) => {
    let { id: n, expression: o } = r.payload;
    za(t, n, o);
  }).addCase(NS, (t, r) => {
    let { id: n, expression: o } = r.payload;
    za(t, n, o);
  }).addCase(Co.fulfilled, (t, r) => {
    let { queryExecuted: n } = r.payload;
    Zp(t, n);
  }).addCase(ce.fulfilled, (t, r) => {
    let { queryExecuted: n } = r.payload;
    Zp(t, n);
  }).addCase(ge, nC).addCase(BS, nC).addCase(me.fulfilled, (t, r) => {
    if (r.payload) for (let [n, o] of Object.entries(r.payload.querySet)) za(t, n, o);
  });
});
function nC(e4, t) {
  isNullOrUndefined(t.payload.q) || Zp(e4, t.payload.q);
}
function Zp(e4, t) {
  Object.keys(e4).forEach((r) => e4[r] = t);
}
var za = (e4, t, r) => {
  t in e4 && (e4[t] = r);
};
var oC = (e4, t) => {
  let { id: r, query: n } = t;
  r in e4 || (e4[r] = n);
};
var G = E;
var lT = { categoryFacetId: G, categoryFacetPath: new ArrayValue({ required: true, each: E }) };
var Tn = { state: E, start: new NumberValue({ required: true }), end: new NumberValue({ required: true }), endInclusive: new BooleanValue({ required: true }), numberOfResults: new NumberValue({ required: true, min: 0 }) };
var kn = { start: E, end: E, endInclusive: new BooleanValue({ required: true }), state: E, numberOfResults: new NumberValue({ required: true, min: 0 }) };
var ur = (e4) => ({ facetId: G, selection: typeof e4.start == "string" ? new RecordValue({ values: kn }) : new RecordValue({ values: Tn }) });
var On = { value: E, numberOfResults: new NumberValue({ min: 0 }), state: E };
var ST = new NumberValue({ min: 1, default: 8, required: false });
var CT = new NumberValue({ min: 1, max: 20, default: 5, required: false });
var AT = { desiredCount: CT, numberOfValues: ST };
var P3 = S("automaticFacet/setOptions", (e4) => x(e4, AT));
var E3 = S("automaticFacet/deselectAll", (e4) => x(e4, G));
var RT = E;
var dC = S("automaticFacet/toggleSelectValue", (e4) => x(e4, { field: RT, selection: new RecordValue({ values: On }) }));
var wT = { state: new Value({ required: true }), numberOfResults: new NumberValue({ required: true, min: 0 }), value: new StringValue({ required: true, emptyAllowed: true }), path: new ArrayValue({ required: true, each: E }), moreValuesAvailable: new BooleanValue({ required: false }) };
function em(e4) {
  e4.children.forEach((t) => {
    em(t);
  }), nt({ state: e4.state, numberOfResults: e4.numberOfResults, value: e4.value, path: e4.path, moreValuesAvailable: e4.moreValuesAvailable }, wT);
}
var Fo = { facetId: G, field: E, tabs: new RecordValue({ options: { required: false }, values: { included: new ArrayValue({ each: new StringValue() }), excluded: new ArrayValue({ each: new StringValue() }) } }), activeTab: new StringValue({ required: false }), delimitingCharacter: new StringValue({ required: false, emptyAllowed: true }), filterFacetCount: new BooleanValue({ required: false }), injectionDepth: new NumberValue({ required: false, min: 0 }), numberOfValues: new NumberValue({ required: false, min: 1 }), sortCriteria: new Value({ required: false }), basePath: new ArrayValue({ required: false, each: E }), filterByBasePath: new BooleanValue({ required: false }) };
var bo = S("categoryFacet/register", (e4) => x(e4, Fo));
var vo = S("categoryFacet/toggleSelectValue", (e4) => {
  try {
    return nt(e4.facetId, E), em(e4.selection), { payload: e4, error: null };
  } catch (t) {
    return { payload: e4, error: mt(t) };
  }
});
var jr = S("categoryFacet/deselectAll", (e4) => x(e4, Fo.facetId));
var Ka = S("categoryFacet/updateNumberOfValues", (e4) => x(e4, { facetId: Fo.facetId, numberOfValues: Fo.numberOfValues }));
var Qc = S("categoryFacet/updateSortCriterion", (e4) => x(e4, { facetId: Fo.facetId, criterion: new Value() }));
var fC = S("categoryFacet/updateBasePath", (e4) => x(e4, { facetId: Fo.facetId, basePath: new ArrayValue({ each: E }) }));
var Ja = { facetId: G, captions: new RecordValue({ options: { required: false } }), numberOfValues: new NumberValue({ required: false, min: 1 }), query: new StringValue({ required: false, emptyAllowed: true }) };
var VT = { path: new ArrayValue({ required: true, each: E }), displayValue: se, rawValue: se, count: new NumberValue({ required: true, min: 0 }) };
var Lc = S("categoryFacet/selectSearchResult", (e4) => x(e4, { facetId: G, value: new RecordValue({ values: VT }) }));
var hC = S("categoryFacetSearch/register", (e4) => x(e4, Ja));
var yC = { facetId: G, value: new RecordValue({ values: { displayValue: se, rawValue: se, count: new NumberValue({ required: true, min: 0 }) } }) };
var SC = S("facetSearch/register", (e4) => x(e4, Ja));
var Bc = S("facetSearch/update", (e4) => x(e4, Ja));
var Uc = S("facetSearch/toggleSelectValue", (e4) => x(e4, yC));
var _c = S("facetSearch/toggleExcludeValue", (e4) => x(e4, yC));
function Xa(e4) {
  let t = CC(e4.start, e4), r = CC(e4.end, e4), n = e4.endInclusive ?? false, o = e4.state ?? "idle";
  return { start: t, end: r, endInclusive: n, state: o };
}
function CC(e4, t) {
  let { dateFormat: r } = t;
  return Oh(e4) ? (As(e4), Eh(e4)) : typeof e4 == "string" && vr(e4) ? (As(e4), e4) : (bh(e4, r), Cs(co(e4, r)));
}
var Mt = new StringValue({ regex: /^[a-zA-Z0-9-_]+$/ });
var Qt = new StringValue({ required: true });
var RC = new ArrayValue({ each: new StringValue() });
var xC = new StringValue();
var FC = new BooleanValue();
var Lt = new BooleanValue();
var Bt = new NumberValue({ min: 0 });
var At = new NumberValue({ min: 1 });
var $c = new BooleanValue({ required: true });
var QT = new RecordValue();
var LT = new StringValue();
var BT = { captions: QT, numberOfValues: At, query: LT };
var Io = new RecordValue({ values: BT });
var Gc = new RecordValue({ options: { required: false }, values: { type: new StringValue({ constrainTo: ["simple"], emptyAllowed: false, required: true }), values: new ArrayValue({ required: true, max: 25, each: new StringValue({ emptyAllowed: false, required: true }) }) } });
var c4 = new BooleanValue();
var zc = new ArrayValue({ min: 1, max: 25, required: false, each: new StringValue({ emptyAllowed: false, required: true }) });
var UT = { facetId: G, field: new StringValue({ required: true, emptyAllowed: true }), tabs: new RecordValue({ options: { required: false }, values: { included: new ArrayValue({ each: new StringValue() }), excluded: new ArrayValue({ each: new StringValue() }) } }), activeTab: new StringValue({ required: false }), filterFacetCount: new BooleanValue({ required: false }), injectionDepth: new NumberValue({ required: false, min: 0 }), numberOfValues: new NumberValue({ required: false, min: 1 }), sortCriteria: new Value({ required: false }), resultsMustMatch: new Value({ required: false }), allowedValues: Gc, customSort: zc };
var wo = S("facet/register", (e4) => x(e4, UT));
var Gr = S("facet/toggleSelectValue", (e4) => x(e4, { facetId: G, selection: new RecordValue({ values: On }) }));
var zr = S("facet/toggleExcludeValue", (e4) => x(e4, { facetId: G, selection: new RecordValue({ values: On }) }));
var Ae = S("facet/deselectAll", (e4) => x(e4, G));
var Wc = S("facet/updateSortCriterion", (e4) => x(e4, { facetId: G, criterion: new Value({ required: true }) }));
var Za = S("facet/updateNumberOfValues", (e4) => x(e4, { facetId: G, numberOfValues: new NumberValue({ required: true, min: 1 }) }));
var ei = S("facet/updateIsFieldExpanded", (e4) => x(e4, { facetId: G, isFieldExpanded: new BooleanValue({ required: true }) }));
var qn = S("facet/updateFreezeCurrentValues", (e4) => x(e4, { facetId: G, freezeCurrentValues: new BooleanValue({ required: true }) }));
var Po = S("rangeFacet/updateSortCriterion", (e4) => x(e4, { facetId: G, criterion: new Value({ required: true }) }));
var jT = { start: E, end: E, endInclusive: new BooleanValue({ required: true }), state: E };
var $T = { facetId: G, field: E, tabs: new RecordValue({ options: { required: false }, values: { included: new ArrayValue({ each: new StringValue() }), excluded: new ArrayValue({ each: new StringValue() }) } }), activeTab: new StringValue({ required: false }), currentValues: new ArrayValue({ required: false, each: new RecordValue({ values: jT }) }), generateAutomaticRanges: new BooleanValue({ required: true }), filterFacetCount: new BooleanValue({ required: false }), injectionDepth: new NumberValue({ required: false, min: 0 }), numberOfValues: new NumberValue({ required: false, min: 1 }), sortCriteria: new Value({ required: false }), rangeAlgorithm: new Value({ required: false }) };
function wC(e4) {
  return vr(e4) ? Ta(e4) : e4;
}
function Kc(e4) {
  e4.currentValues && e4.currentValues.forEach((t) => {
    let { start: r, end: n } = Xa(t);
    if (co(wC(r)).isAfter(co(wC(n)))) throw new Error(`The start value is greater than the end value for the date range ${t.start} to ${t.end}`);
  });
}
var Ut = S("dateFacet/register", (e4) => {
  try {
    return nt(e4, $T), Kc(e4), { payload: e4, error: null };
  } catch (t) {
    return { payload: e4, error: mt(t) };
  }
});
var _t = S("dateFacet/toggleSelectValue", (e4) => x(e4, { facetId: G, selection: new RecordValue({ values: kn }) }));
var jt = S("dateFacet/toggleExcludeValue", (e4) => x(e4, { facetId: G, selection: new RecordValue({ values: kn }) }));
var lr = S("dateFacet/updateFacetValues", (e4) => {
  try {
    return nt(e4, { facetId: G, values: new ArrayValue({ each: new RecordValue({ values: kn }) }) }), Kc({ currentValues: e4.values }), { payload: e4, error: null };
  } catch (t) {
    return { payload: e4, error: mt(t) };
  }
});
var Jc = Po;
var Xc = Ae;
var GT = { state: E, start: new NumberValue({ required: true }), end: new NumberValue({ required: true }), endInclusive: new BooleanValue({ required: true }) };
var zT = { facetId: G, field: E, tabs: new RecordValue({ options: { required: false }, values: { included: new ArrayValue({ each: new StringValue() }), excluded: new ArrayValue({ each: new StringValue() }) } }), activeTab: new StringValue({ required: false }), currentValues: new ArrayValue({ required: false, each: new RecordValue({ values: GT }) }), generateAutomaticRanges: new BooleanValue({ required: true }), filterFacetCount: new BooleanValue({ required: false }), injectionDepth: new NumberValue({ required: false, min: 0 }), numberOfValues: new NumberValue({ required: false, min: 1 }), sortCriteria: new Value({ required: false }), rangeAlgorithm: new Value({ required: false }) };
function tu(e4) {
  e4.currentValues && e4.currentValues.forEach(({ start: t, end: r }) => {
    if (t > r) throw new Error(`The start value is greater than the end value for the numeric range ${t} to ${r}`);
  });
}
var $t = S("numericFacet/register", (e4) => {
  try {
    return x(e4, zT), tu(e4), { payload: e4, error: null };
  } catch (t) {
    return { payload: e4, error: mt(t) };
  }
});
var Gt = S("numericFacet/toggleSelectValue", (e4) => x(e4, { facetId: G, selection: new RecordValue({ values: Tn }) }));
var zt = S("numericFacet/toggleExcludeValue", (e4) => x(e4, { facetId: G, selection: new RecordValue({ values: Tn }) }));
var dr = S("numericFacet/updateFacetValues", (e4) => {
  try {
    return nt(e4, { facetId: G, values: new ArrayValue({ each: new RecordValue({ values: Tn }) }) }), tu({ currentValues: e4.values }), { payload: e4, error: null };
  } catch (t) {
    return { payload: e4, error: mt(t) };
  }
});
var ru = Po;
var nu = Ae;
var To = $(qt(), (e4) => {
  e4.addCase(Qs, (t, r) => {
    let n = dm(t), o = r.payload;
    t.defaultNumberOfResults = t.numberOfResults = o, t.firstResult = ni(n, o);
  }).addCase(Ls, (t, r) => {
    t.numberOfResults = r.payload, t.firstResult = 0;
  }).addCase(ut, (t) => {
    t.firstResult = 0;
  }).addCase(Bs, (t, r) => {
    let n = r.payload;
    t.firstResult = ni(n, t.numberOfResults);
  }).addCase(Vt, (t, r) => {
    let n = r.payload;
    t.firstResult = ni(n, t.numberOfResults);
  }).addCase(_s, (t) => {
    let r = dm(t), n = Math.max(r - 1, 1);
    t.firstResult = ni(n, t.numberOfResults);
  }).addCase(Us, (t) => {
    let r = dm(t), n = HT(t), o = Math.min(r + 1, n);
    t.firstResult = ni(o, t.numberOfResults);
  }).addCase(me.fulfilled, (t, r) => {
    r.payload && (t.numberOfResults = r.payload.pagination.numberOfResults, t.firstResult = r.payload.pagination.firstResult);
  }).addCase(ge, (t, r) => {
    t.firstResult = r.payload.firstResult ?? t.firstResult, t.numberOfResults = r.payload.numberOfResults ?? t.defaultNumberOfResults;
  }).addCase(ce.fulfilled, (t, r) => {
    let { response: n } = r.payload;
    t.totalCountFiltered = n.totalCountFiltered;
  }).addCase(Ae, (t) => {
    Ve(t);
  }).addCase(jt, (t) => {
    Ve(t);
  }).addCase(zr, (t) => {
    Ve(t);
  }).addCase(zt, (t) => {
    Ve(t);
  }).addCase(_c, (t) => {
    Ve(t);
  }).addCase(Gr, (t) => {
    Ve(t);
  }).addCase(jr, (t) => {
    Ve(t);
  }).addCase(vo, (t) => {
    Ve(t);
  }).addCase(Lc, (t) => {
    Ve(t);
  }).addCase(_t, (t) => {
    Ve(t);
  }).addCase(Gt, (t) => {
    Ve(t);
  }).addCase(qe, (t) => {
    Ve(t);
  }).addCase(lr, (t) => {
    Ve(t);
  }).addCase(dr, (t) => {
    Ve(t);
  }).addCase(Uc, (t) => {
    Ve(t);
  }).addCase(dC, (t) => {
    Ve(t);
  });
});
function Ve(e4) {
  e4.firstResult = qt().firstResult;
}
function dm(e4) {
  let { firstResult: t, numberOfResults: r } = e4;
  return pm(t, r);
}
function HT(e4) {
  let { totalCountFiltered: t, numberOfResults: r } = e4;
  return mm(t, r);
}
function ni(e4, t) {
  return (e4 - 1) * t;
}
function pm(e4, t) {
  return Math.round(e4 / t) + 1;
}
function mm(e4, t) {
  let r = Math.min(e4, 5e3);
  return Math.ceil(r / t);
}
var ie = S("facetOptions/update", (e4 = { freezeFacetOrder: true }) => x(e4, { freezeFacetOrder: new BooleanValue({ required: false }) }));
var He = S("facetOptions/facet/enable", (e4) => x(e4, G));
var he = S("facetOptions/facet/disable", (e4) => x(e4, G));
function Oo(e4, t) {
  let { facetId: r, criterion: n } = t, o = e4[r]?.request;
  o && (o.sortCriteria = n);
}
function oi(e4) {
  e4 && (e4.currentValues = e4.currentValues.map((t) => ({ ...t, state: "idle" })), e4.preventAutoSelect = true);
}
function cu(e4, t) {
  e4 && (e4.numberOfValues = t);
}
var lu = { filterFacetCount: true, injectionDepth: 1e3, numberOfValues: 8, sortCriteria: "ascending", rangeAlgorithm: "even", resultsMustMatch: "atLeastOneValue" };
function du(e4, t) {
  let { request: r } = t, { facetId: n } = r;
  if (n in e4) return;
  let o = DC(r);
  r.numberOfValues = o, e4[n] = t;
}
function pu(e4, t, r) {
  let n = e4[t]?.request;
  n && (n.currentValues = r, n.numberOfValues = DC(n));
}
function mu(e4, t, r) {
  let n = e4[t]?.request;
  if (!n) return;
  let o = uu(n.currentValues, r);
  if (!o) return;
  let a = o.state === "selected";
  o.state = a ? "idle" : "selected", n.preventAutoSelect = true;
}
function gu(e4, t, r) {
  let n = e4[t]?.request;
  if (!n) return;
  let o = uu(n.currentValues, r);
  if (!o) return;
  let a = o.state === "excluded";
  o.state = a ? "idle" : "excluded", n.preventAutoSelect = true;
}
function Wr(e4, t) {
  let r = e4[t]?.request;
  r && r.currentValues.forEach((n) => n.state = "idle");
}
function fu(e4, t) {
  Object.entries(e4).forEach(([r, { request: n }]) => {
    let o = t[r] || [];
    n.currentValues.forEach((s) => {
      let u = !!uu(o, s);
      return s.state = u ? "selected" : "idle", s;
    });
    let a = o.filter((s) => !uu(n.currentValues, s)), i = n.currentValues;
    i.push(...a), n.numberOfValues = Math.max(n.numberOfValues, i.length);
  });
}
function hu(e4, t, r) {
  t.forEach((n) => {
    let o = n.facetId, a = e4[o]?.request;
    if (!a) return;
    let i = r(n.values);
    a.currentValues = i, a.preventAutoSelect = false;
  });
}
function uu(e4, t) {
  let { start: r, end: n } = t;
  return e4.find((o) => o.start === r && o.end === n);
}
function DC(e4) {
  let { generateAutomaticRanges: t, currentValues: r, numberOfValues: n } = e4;
  return t ? Math.max(n, r.length) : r.length;
}
var Ht = $(eo(), (e4) => {
  e4.addCase(Ut, (t, r) => {
    let { payload: n } = r, o = tk(n);
    du(t, zf(o));
  }).addCase(me.fulfilled, (t, r) => r.payload?.dateFacetSet ?? t).addCase(ge, (t, r) => {
    let n = r.payload.df || {};
    fu(t, n);
  }).addCase(_t, (t, r) => {
    let { facetId: n, selection: o } = r.payload;
    mu(t, n, o);
  }).addCase(jt, (t, r) => {
    let { facetId: n, selection: o } = r.payload;
    gu(t, n, o);
  }).addCase(lr, (t, r) => {
    let { facetId: n, values: o } = r.payload;
    pu(t, n, o);
  }).addCase(Xc, (t, r) => {
    Wr(t, r.payload);
  }).addCase(qe, (t) => {
    Object.keys(t).forEach((r) => {
      Wr(t, r);
    });
  }).addCase(Jc, (t, r) => {
    Oo(t, r.payload);
  }).addCase(ce.fulfilled, (t, r) => {
    let n = r.payload.response.facets;
    hu(t, n, rk);
  }).addCase(he, (t, r) => {
    Wr(t, r.payload);
  });
});
function tk(e4) {
  return { ...lu, currentValues: [], preventAutoSelect: false, type: "dateRange", ...e4 };
}
function rk(e4) {
  return e4.map((t) => {
    let { numberOfResults: r, ...n } = t;
    return n;
  });
}
var Yr = $(to(), (e4) => {
  e4.addCase($t, (t, r) => {
    let { payload: n } = r, o = nk(n);
    du(t, Hf(o));
  }).addCase(me.fulfilled, (t, r) => r.payload?.numericFacetSet ?? t).addCase(ge, (t, r) => {
    let n = r.payload.nf || {};
    fu(t, n);
  }).addCase(Gt, (t, r) => {
    let { facetId: n, selection: o } = r.payload;
    mu(t, n, o);
  }).addCase(zt, (t, r) => {
    let { facetId: n, selection: o } = r.payload;
    gu(t, n, o);
  }).addCase(dr, (t, r) => {
    let { facetId: n, values: o } = r.payload;
    pu(t, n, o);
  }).addCase(nu, (t, r) => {
    Wr(t, r.payload);
  }).addCase(qe, (t) => {
    Object.keys(t).forEach((r) => {
      Wr(t, r);
    });
  }).addCase(ru, (t, r) => {
    Oo(t, r.payload);
  }).addCase(ce.fulfilled, (t, r) => {
    let n = r.payload.response.facets;
    hu(t, n, ok);
  }).addCase(he, (t, r) => {
    Wr(t, r.payload);
  });
});
function nk(e4) {
  return { ...lu, currentValues: [], preventAutoSelect: false, type: "numericalRange", ...e4 };
}
function ok(e4) {
  return e4.map((t) => {
    let { numberOfResults: r, ...n } = t;
    return n;
  });
}
var ck = { results: new ArrayValue({ required: true, each: new RecordValue({ values: ls }) }), maxLength: new NumberValue({ required: true, min: 1, default: 10 }) };
var yu = S("recentResults/registerRecentResults", (e4) => x(e4, ck));
var Wt = S("recentResults/pushRecentResult", (e4) => (Ee(e4), { payload: e4 }));
var Su = S("recentResults/clearRecentResults");
function VC() {
  return { results: [], maxLength: 10 };
}
var NC = $(VC(), (e4) => {
  e4.addCase(yu, (t, r) => {
    t.results = r.payload.results.slice(0, r.payload.maxLength), t.maxLength = r.payload.maxLength;
  }).addCase(Su, (t) => {
    t.results = [];
  }).addCase(Wt, (t, r) => {
    let n = r.payload;
    t.results = t.results.filter((a) => a.uniqueId !== n.uniqueId);
    let o = t.results.slice(0, t.maxLength - 1);
    t.results = [n, ...o];
  });
});
var Cu = S("insight/caseContext/set", (e4) => {
  let t = new RecordValue({ options: { required: true } }), r = x(e4, t).error;
  if (r) return { payload: e4, error: r };
  let n = Object.values(e4), o = new ArrayValue({ each: se }), a = x(n, o).error;
  return a ? { payload: e4, error: a } : { payload: e4 };
});
var Au = S("insight/caseId/set", (e4) => {
  let r = x(e4, se).error;
  return r ? { payload: e4, error: r } : { payload: e4 };
});
var Ru = S("insight/caseNumber/set", (e4) => {
  let r = x(e4, se).error;
  return r ? { payload: e4, error: r } : { payload: e4 };
});
var MC = $($h(), (e4) => {
  e4.addCase(Cu, (t, r) => {
    t.caseContext = r.payload;
  }).addCase(Au, (t, r) => {
    t.caseId = r.payload;
  }).addCase(Ru, (t, r) => {
    t.caseNumber = r.payload;
  });
});
var mk = new ArrayValue({ each: E, required: true });
var QC = (e4, t) => (x(e4, E), isString(t) ? x(t, E) : x(t, mk), { payload: { contextKey: e4, contextValue: t } });
var xu = S("context/set", (e4) => {
  for (let [t, r] of Object.entries(e4)) QC(t, r);
  return { payload: e4 };
});
var Fu = S("context/add", (e4) => QC(e4.contextKey, e4.contextValue));
var bu = S("context/remove", (e4) => x(e4, E));
var LC = $(bs(), (e4) => {
  e4.addCase(xu, (t, r) => {
    t.contextValues = r.payload;
  }).addCase(Fu, (t, r) => {
    t.contextValues[r.payload.contextKey] = r.payload.contextValue;
  }).addCase(bu, (t, r) => {
    delete t.contextValues[r.payload];
  }).addCase(me.fulfilled, (t, r) => {
    r.payload && (t.contextValues = r.payload.context.contextValues);
  });
});
var ai = { collectionField: new StringValue({ emptyAllowed: false, required: false }), parentField: new StringValue({ emptyAllowed: false, required: false }), childField: new StringValue({ emptyAllowed: false, required: false }), numberOfFoldedResults: new NumberValue({ min: 0, required: false }) };
var Kr = S("folding/register", (e4) => x(e4, ai));
var qo = L("folding/loadCollection", async (e4, { getState: t, rejectWithValue: r, extra: { apiClient: n, navigatorContext: o } }) => {
  let a = t(), i = a.configuration.analytics.analyticsMode === "legacy" ? await kr(a) : po(a, o), s = await n.search({ ...i, q: fk(a), enableQuerySyntax: true, cq: `@${a.folding.fields.collection}="${e4}"`, filterField: a.folding.fields.collection, childField: a.folding.fields.parent, parentField: a.folding.fields.child, filterFieldRange: 100 }, { origin: "foldingCollection" });
  return oe(s) ? r(s.error) : { collectionId: e4, results: s.success.results, rootResult: a.folding.collections[e4].result };
});
function fk(e4) {
  return e4.query.q === "" ? "" : e4.query.enableQuerySyntax ? `${e4.query.q} OR @uri` : `( <@- ${e4.query.q} -@> ) OR @uri`;
}
var vu = () => ({ enabled: false, fields: { collection: "foldingcollection", parent: "foldingparent", child: "foldingchild" }, filterFieldRange: 2, collections: {} });
var Jr = S("fields/registerFieldsToInclude", (e4) => x(e4, Oi));
var Iu = S("fields/fetchall/enable");
var wu = S("fields/fetchall/disable");
var Pu = L("fields/fetchDescription", async (e4, { extra: t, getState: r, rejectWithValue: n }) => {
  let o = r(), { accessToken: a, environment: i, organizationId: s } = o.configuration, { apiBaseUrl: u } = o.configuration.search, c = await t.apiClient.fieldDescriptions({ accessToken: a, organizationId: s, url: u ?? Le(s, i) });
  return oe(c) ? n(c.error) : c.success.fields;
});
var BC = ["author", "language", "urihash", "objecttype", "collection", "source", "permanentid"];
var hk = [...BC, "date", "filetype", "parents"];
var Y8 = [...hk, "ec_price", "ec_name", "ec_description", "ec_brand", "ec_category", "ec_item_group_id", "ec_shortdesc", "ec_thumbnails", "ec_images", "ec_promo_price", "ec_in_stock", "ec_rating"];
var UC = () => ({ fieldsToInclude: BC, fetchAllFields: false, fieldsDescription: [] });
var Do = $(UC(), (e4) => e4.addCase(Jr, (t, r) => {
  t.fieldsToInclude = [...new Set(t.fieldsToInclude.concat(r.payload))];
}).addCase(Iu, (t) => {
  t.fetchAllFields = true;
}).addCase(wu, (t) => {
  t.fetchAllFields = false;
}).addCase(Pu.fulfilled, (t, { payload: r }) => {
  t.fieldsDescription = r;
}).addCase(Kr, (t, { payload: r }) => {
  let n = vu().fields;
  t.fieldsToInclude.push(r.collectionField ?? n.collection, r.parentField ?? n.parent, r.childField ?? n.child);
}));
function aJ(e4) {
  return e4.addReducers({ fields: Do }), { registerFieldsToInclude: Jr, enableFetchAllFields: Iu, disableFetchAllFields: wu, fetchFieldsDescription: Pu };
}
var jC = new RecordValue({ options: { required: true }, values: { articleLanguage: ne, articlePublishStatus: ne, articleVersionNumber: ne, caseId: E, knowledgeArticleId: ne, name: ne, permanentId: ne, resultUrl: ne, source: ne, title: E, uriHash: ne } });
var Eu = S("insight/attachToCase/setAttachedResults", (e4) => x(e4, { results: new ArrayValue({ each: jC }), loading: new BooleanValue({ required: false, default: false }) }));
var Tu = S("insight/attachToCase/attach", (e4) => $C(e4));
var ku = S("insight/attachToCase/detach", (e4) => $C(e4));
var $C = (e4) => isNullOrUndefined(e4.result.permanentId) && isNullOrUndefined(e4.result.uriHash) ? { payload: e4, error: mt(new SchemaValidationError("Either permanentId or uriHash is required")) } : x(e4, { result: jC });
function GC() {
  return { results: [], loading: false };
}
var qu = $(GC(), (e4) => {
  e4.addCase(Eu, (t, r) => {
    let { results: n, loading: o } = r.payload;
    "results" in t && t.results?.length > 0 || (t.results = n, o && (t.loading = o));
  }).addCase(Tu, (t, r) => {
    (!isNullOrUndefined(r.payload.result.permanentId) || !isNullOrUndefined(r.payload.result.uriHash)) && (t.results = [...t.results, r.payload.result]);
  }).addCase(ku, (t, r) => {
    t.results = t.results.filter((n) => Rk(n, r.payload.result));
  });
});
var Rk = (e4, t) => {
  let r = !isNullOrUndefined(e4.permanentId) && e4?.permanentId === t?.permanentId, n = !isNullOrUndefined(e4.uriHash) && e4?.uriHash === t?.uriHash;
  return !(e4.caseId === t.caseId) || !r && !n;
};
var Du = () => new RecordValue({ values: { questionAnswerId: E }, options: { required: true } });
function Vo(e4) {
  return x(e4, Du());
}
var No = S("smartSnippet/expand");
var Mo = S("smartSnippet/collapse");
var Qo = S("smartSnippet/like");
var Lo = S("smartSnippet/dislike");
var Bo = S("smartSnippet/feedbackModal/open");
var Xr = S("smartSnippet/feedbackModal/close");
var Uo = S("smartSnippet/related/expand", (e4) => Vo(e4));
var _o = S("smartSnippet/related/collapse", (e4) => Vo(e4));
var ym = () => ({ liked: false, disliked: false, expanded: false, feedbackModalOpen: false, relatedQuestions: [] });
var HC = (e4, t) => e4.findIndex((r) => r.questionAnswerId === t.questionAnswerId);
function WC({ question: e4, answerSnippet: t, documentId: { contentIdKey: r, contentIdValue: n } }) {
  return Nn({ question: e4, answerSnippet: t, contentIdKey: r, contentIdValue: n });
}
function xk(e4, t) {
  let r = WC(e4);
  return t && r === t.questionAnswerId ? t : { contentIdKey: e4.documentId.contentIdKey, contentIdValue: e4.documentId.contentIdValue, expanded: false, questionAnswerId: r };
}
var Yt = $(ym(), (e4) => e4.addCase(No, (t) => {
  t.expanded = true;
}).addCase(Mo, (t) => {
  t.expanded = false;
}).addCase(Qo, (t) => {
  t.liked = true, t.disliked = false, t.feedbackModalOpen = false;
}).addCase(Lo, (t) => {
  t.liked = false, t.disliked = true;
}).addCase(Bo, (t) => {
  t.feedbackModalOpen = true;
}).addCase(Xr, (t) => {
  t.feedbackModalOpen = false;
}).addCase(ce.fulfilled, (t, r) => {
  let n = r.payload.response.questionAnswer.relatedQuestions.map((a, i) => xk(a, t.relatedQuestions[i])), o = WC(r.payload.response.questionAnswer);
  return t.questionAnswerId === o ? { ...t, relatedQuestions: n } : { ...ym(), relatedQuestions: n, questionAnswerId: o };
}).addCase(Uo, (t, r) => {
  let n = HC(t.relatedQuestions, r.payload);
  n !== -1 && (t.relatedQuestions[n].expanded = true);
}).addCase(_o, (t, r) => {
  let n = HC(t.relatedQuestions, r.payload);
  n !== -1 && (t.relatedQuestions[n].expanded = false);
}));
function Fk(e4, t) {
  return e4.raw[t.collection];
}
function Sm(e4, t) {
  return e4.raw[t.parent];
}
function ii(e4, t) {
  let r = e4.raw[t.child];
  return Fi(r) ? r[0] : r;
}
function bk(e4, t) {
  return (e4 || t) !== void 0 && e4 === t;
}
function KC(e4, t, r, n = []) {
  let o = ii(e4, r);
  return o ? n.indexOf(o) !== -1 ? [] : t.filter((a) => {
    let i = ii(a, r) === ii(e4, r);
    return Sm(a, r) === o && !i;
  }).map((a) => ({ result: a, children: KC(a, t, r, [...n, o]) })) : [];
}
function vk(e4, t) {
  return e4.find((r) => {
    let n = Sm(r, t) === void 0, o = bk(Sm(r, t), ii(r, t));
    return n || o;
  });
}
function JC(e4) {
  return e4.parentResult ? JC(e4.parentResult) : e4;
}
function Ik(e4, t, r) {
  let n = ss(e4), o = r ?? vk(n, t) ?? JC(e4);
  return { result: o, children: KC(o, n, t), moreResultsAvailable: true, isLoadingMoreResults: false };
}
function Vu(e4, t, r) {
  let n = {};
  return e4.forEach((o) => {
    let a = Fk(o, t);
    a && (!ii(o, t) && !o.parentResult || (n[a] = Ik(o, t, r)));
  }), n;
}
function YC(e4, t) {
  if (!e4.collections[t]) throw new Error(`Missing collection ${t} from ${Object.keys(e4.collections)}: Folding most probably in an invalid state...`);
  return e4.collections[t];
}
var Nu = $(vu(), (e4) => e4.addCase(ce.fulfilled, (t, { payload: r }) => {
  t.collections = t.enabled ? Vu(r.response.results, t.fields) : {};
}).addCase(Xs.fulfilled, (t, { payload: r }) => {
  t.collections = t.enabled ? Vu(r.response.results, t.fields) : {};
}).addCase(Zs.fulfilled, (t, { payload: r }) => {
  t.collections = t.enabled ? { ...t.collections, ...Vu(r.response.results, t.fields) } : {};
}).addCase(Kr, (t, { payload: r }) => t.enabled ? t : { enabled: true, collections: {}, fields: { collection: r.collectionField ?? t.fields.collection, parent: r.parentField ?? t.fields.parent, child: r.childField ?? t.fields.child }, filterFieldRange: r.numberOfFoldedResults ?? t.filterFieldRange }).addCase(qo.pending, (t, { meta: r }) => {
  let n = r.arg;
  YC(t, n).isLoadingMoreResults = true;
}).addCase(qo.rejected, (t, { meta: r }) => {
  let n = r.arg;
  YC(t, n).isLoadingMoreResults = false;
}).addCase(qo.fulfilled, (t, { payload: { collectionId: r, results: n, rootResult: o } }) => {
  let a = Vu(n, t.fields, o);
  if (!a || !a[r]) throw new Error(`Unable to create collection ${r} from received results: ${JSON.stringify(n)}. Folding most probably in an invalid state... `);
  t.collections[r] = a[r], t.collections[r].moreResultsAvailable = false;
}));
var XC = async (e4, t) => ({ accessToken: e4.configuration.accessToken, organizationId: e4.configuration.organizationId, url: de(e4.configuration.organizationId, e4.configuration.environment), userId: t });
var Ek = { ticketCreationDate: new StringValue({ emptyAllowed: false, ISODate: true }), excludedCustomActions: new ArrayValue({ required: false, each: ne }) };
var jo = S("insight/userActions/registerUserActions", (e4) => x(e4, Ek));
var Zr = L("insight/userActions/fetch", async (e4, { getState: t, rejectWithValue: r, extra: { apiClient: n } }) => {
  let o = t(), a = await n.userActions(await XC(o, e4));
  return oe(a) ? r(a.error) : { response: a.success };
});
function ZC() {
  return { timeline: void 0, excludedCustomActions: [], loading: false };
}
var Tk = 1e3;
var kk = Tk * 60;
var Cm = 30 * kk;
var Ok = 2;
var qk = 2;
var rA = (e4, t) => {
  if (!e4.ticketCreationDate || !t?.length) return { precedingSessions: [], session: void 0, followingSessions: [] };
  let n = new Date(e4.ticketCreationDate).getTime(), o = e4.excludedCustomActions, a = Vk(t);
  return Mk(a, n, o);
};
var Dk = (e4) => {
  let t = JSON.parse(e4.value);
  return { actionType: e4.name, timestamp: Number(e4.time), eventData: { type: t.event_type, value: t.event_value }, cause: t.cause, searchHub: t.origin_level_1, document: { title: t.title, uriHash: t.uri_hash, contentIdKey: t.content_id_key || t.c_contentidkey, contentIdValue: t.content_id_value || t.c_contentidvalue }, query: t.query_expression };
};
var Vk = (e4) => {
  let t = false, r = e4.reduce((n, o) => {
    try {
      let a = Dk(o);
      n.push(a);
    } catch {
      t = true;
    }
    return n;
  }, []).sort((n, o) => o.timestamp - n.timestamp);
  return t && console.warn("Some user actions could not be parsed. Please check the raw user actions data."), r;
};
var Nk = (e4, t) => Math.abs(e4.timestamp - t) < Cm;
var eA = (e4, t, r) => {
  if (e4.actions?.length) if (t >= e4.start - Cm && t <= e4.end + Cm) {
    let n = { actionType: "TICKET_CREATION", timestamp: t, eventData: {} }, o = e4.actions.findIndex((a) => a.timestamp <= n.timestamp);
    o === -1 ? (o = e4.actions.length, e4.start = t) : o === 0 && (e4.end = t), e4.actions.splice(o, 0, n), r.session = e4;
  } else t < e4.start ? r.followingSessions.push(e4) : r.precedingSessions.push(e4);
};
var tA = (e4, t) => {
  if (e4.actionType === "SEARCH" && !e4.query) return true;
  if (e4.actionType === "CUSTOM") {
    let r = e4.eventData?.type || "", n = e4.eventData?.value || "";
    return t.includes(r) || t.includes(n);
  }
  return false;
};
var Mk = (e4, t, r) => {
  let n = { precedingSessions: [], session: void 0, followingSessions: [] }, o = { start: e4[0].timestamp, end: e4[0].timestamp, actions: [] };
  return e4.forEach((a) => {
    if (Nk(a, o.start)) {
      o.actions.push(a), o.start = a.timestamp;
      return;
    }
    o.actions = o.actions.filter((i) => !tA(i, r)), eA(o, t, n), o = { start: a.timestamp, end: a.timestamp, actions: [a] };
  }), o.actions = o.actions.filter((a) => !tA(a, r)), eA(o, t, n), n.session === void 0 && (n.session = { start: t, end: t, actions: [{ actionType: "TICKET_CREATION", timestamp: t, eventData: {} }] }), { precedingSessions: n.precedingSessions.slice(0, Ok), session: n.session, followingSessions: n.followingSessions.slice(n.followingSessions.length - qk) };
};
var Mu = $(ZC(), (e4) => {
  e4.addCase(jo, (t, r) => {
    t.ticketCreationDate = r.payload.ticketCreationDate, r.payload.excludedCustomActions && (t.excludedCustomActions = r.payload.excludedCustomActions);
  }).addCase(Zr.pending, (t) => {
    t.loading = true, t.error = void 0;
  }).addCase(Zr.rejected, (t, r) => {
    t.loading = false, t.error = r.payload;
  }).addCase(Zr.fulfilled, (t, r) => {
    t.loading = false, t.error = void 0, t.timeline = rA(t, r.payload.response.value);
  });
});
var nA = () => ({});
var Qu = $(nA(), (e4) => e4.addCase(Lr, (t, r) => {
  oA(t, r.payload);
}).addCase(VS, (t, r) => {
  oA(t, r.payload);
}).addCase(kS, (t, r) => {
  delete t[r.payload.id];
}).addCase(ho.pending, aA).addCase(ho.fulfilled, (t, r) => {
  let n = t[r.meta.arg.id];
  if (!n || r.meta.requestId !== n.currentRequestId) return;
  let { q: o } = r.payload;
  o && n.partialQueries.push(o.replace(/;/, encodeURIComponent(";"))), n.responseId = r.payload.responseId, n.completions = r.payload.completions, n.isLoading = false, n.error = null;
}).addCase(ho.rejected, iA).addCase(_r.pending, aA).addCase(_r.fulfilled, (t, r) => {
  let n = t[r.meta.arg.id];
  if (!n || r.meta.requestId !== n.currentRequestId) return;
  let { query: o } = r.payload;
  o && n.partialQueries.push(o.replace(/;/, encodeURIComponent(";"))), n.responseId = r.payload.responseId, n.completions = r.payload.completions.map((a) => ({ expression: a.expression, highlighted: a.highlighted, score: 0, executableConfidence: 0 })), n.isLoading = false, n.error = null;
}).addCase(_r.rejected, iA).addCase(Ur, (t, r) => {
  sA(t, r.payload);
}).addCase(DS, (t, r) => {
  sA(t, r.payload);
}));
function oA(e4, t) {
  let r = t.id;
  r in e4 || (e4[r] = Qk(t));
}
function Qk(e4) {
  return { id: "", completions: [], responseId: "", count: 5, currentRequestId: "", error: null, partialQueries: [], isLoading: false, ...e4 };
}
function aA(e4, t) {
  let r = e4[t.meta.arg.id];
  r && (r.currentRequestId = t.meta.requestId, r.isLoading = true);
}
function iA(e4, t) {
  let r = e4[t.meta.arg.id];
  r && (r.error = t.payload || null, r.isLoading = false);
}
function sA(e4, t) {
  let r = e4[t.id];
  r && (r.responseId = "", r.completions = [], r.partialQueries = []);
}
var cA = W((e4) => e4.queryCorrection.correctedQuery !== "" || e4.wasCorrectedTo !== "", (e4) => e4);
var uA = (e4, t) => {
  let r = { ...Lh(), ...t, correctedQuery: t?.correctedQuery || t?.corrections[0]?.correctedQuery || "" };
  e4.queryCorrection = r, e4.wasCorrectedTo = r.correctedQuery;
};
var lA = $(Bh(), (e4) => {
  e4.addCase(Rs, (t) => {
    t.enableDidYouMean = true;
  }).addCase(Mh, (t) => {
    t.enableDidYouMean = false;
  }).addCase(Qh, (t) => {
    t.automaticallyCorrectQuery = true;
  }).addCase(xs, (t) => {
    t.automaticallyCorrectQuery = false;
  }).addCase(ce.pending, (t) => {
    t.queryCorrection = wr(), t.wasAutomaticallyCorrected = false, t.wasCorrectedTo = "";
  }).addCase(ce.fulfilled, (t, r) => {
    let { queryCorrection: n, queryCorrections: o } = r.payload.response;
    if (t.queryCorrectionMode === "legacy") {
      let a = o && o[0] ? o[0] : wr();
      t.queryCorrection = a;
    }
    t.queryCorrectionMode === "next" && uA(t, n), t.wasAutomaticallyCorrected = r.payload.automaticallyCorrected, t.originalQuery = r.payload.originalQuery;
  }).addCase($e, (t, r) => {
    t.wasCorrectedTo = r.payload;
  }).addCase(Fs, (t, r) => {
    t.queryCorrectionMode = r.payload;
  });
});
var U7 = { categoryFacetId: G, categoryFacetPath: new ArrayValue({ required: true, each: E }) };
function Lu(e4, t) {
  let r = e4[t];
  r && (r.request.numberOfValues = r.initialNumberOfValues, r.request.currentValues = [], r.request.preventAutoSelect = true);
}
function Am(e4, t, r) {
  e4.currentValues = _k(t, r), e4.numberOfValues = t.length ? 1 : r, e4.preventAutoSelect = true;
}
function _k(e4, t) {
  if (!e4.length) return [];
  let r = mA(e4[0], t), n = r;
  for (let o of e4.splice(1)) {
    let a = mA(o, t);
    n.children.push(a), n = a;
  }
  return n.state = "selected", n.retrieveChildren = true, [r];
}
function mA(e4, t) {
  return { value: e4, retrieveCount: t, children: [], state: "idle", retrieveChildren: false };
}
var Bu = $(Zn(), (e4) => {
  e4.addCase(bo, (t, r) => {
    let n = r.payload, { facetId: o } = n;
    if (o in t) return;
    let a = $k(n), i = a.numberOfValues;
    t[o] = { request: a, initialNumberOfValues: i };
  }).addCase(me.fulfilled, (t, r) => r.payload?.categoryFacetSet ?? t).addCase(ge, (t, r) => {
    let n = r.payload.cf || {};
    Object.keys(t).forEach((o) => {
      let a = t[o].request, i = n[o] || [];
      (i.length || a.currentValues.length) && Am(a, i, t[o].initialNumberOfValues);
    });
  }).addCase(Qc, (t, r) => {
    let { facetId: n, criterion: o } = r.payload, a = t[n]?.request;
    a && (a.sortCriteria = o);
  }).addCase(fC, (t, r) => {
    let { facetId: n, basePath: o } = r.payload, a = t[n]?.request;
    a && (a.basePath = [...o]);
  }).addCase(vo, (t, r) => {
    let { facetId: n, selection: o, retrieveCount: a } = r.payload, i = t[n]?.request;
    if (!i) return;
    let { path: s } = o, u = s.slice(0, s.length - 1), c = jk(i, u, a);
    if (c.length) {
      let m = c[0];
      m.retrieveChildren = true, m.state = "selected", m.children = [];
      return;
    }
    let d = fA(o.value, a);
    d.state = "selected", c.push(d), i.numberOfValues = 1;
  }).addCase(jr, (t, r) => {
    let n = r.payload;
    Lu(t, n);
  }).addCase(qe, (t) => {
    Object.keys(t).forEach((r) => Lu(t, r));
  }).addCase(Tr, (t, r) => Object.keys(t).forEach((n) => {
    t[n].request.preventAutoSelect = !r.payload.allow;
  })).addCase(Ka, (t, r) => {
    let { facetId: n, numberOfValues: o } = r.payload, a = t[n]?.request;
    if (a) {
      if (!a.currentValues.length) return cu(a, o);
      Gk(t, r.payload);
    }
  }).addCase(Lc, (t, r) => {
    let { facetId: n, value: o } = r.payload, a = t[n];
    if (!a) return;
    let i = [...o.path, o.rawValue];
    Am(a.request, i, a.initialNumberOfValues);
  }).addCase(ec.fulfilled, (t, r) => {
    gA(t, r.payload.response.facets);
  }).addCase(ce.fulfilled, (t, r) => {
    gA(t, r.payload.response.facets);
  }).addCase(he, (t, r) => {
    Lu(t, r.payload);
  });
});
var Rm = { delimitingCharacter: ";", filterFacetCount: true, injectionDepth: 1e3, numberOfValues: 5, sortCriteria: "occurrences", basePath: [], filterByBasePath: true, resultsMustMatch: "atLeastOneValue" };
function jk(e4, t, r) {
  let n = e4.currentValues;
  for (let o of t) {
    let a = n[0];
    (!a || o !== a.value) && (a = fA(o, r), n.length = 0, n.push(a)), a.retrieveChildren = false, a.state = "idle", n = a.children;
  }
  return n;
}
function $k(e4) {
  return { ...Rm, currentValues: [], preventAutoSelect: false, type: "hierarchical", ...e4 };
}
function fA(e4, t) {
  return { value: e4, state: "idle", children: [], retrieveChildren: true, retrieveCount: t };
}
function gA(e4, t) {
  t.forEach((r) => {
    if (!zk(e4, r)) return;
    let n = r.facetId, o = e4[n]?.request;
    if (!o) return;
    let a = Hk(o, r);
    o.currentValues = a ? [] : o.currentValues, o.preventAutoSelect = false;
  });
}
function Gk(e4, t) {
  let { facetId: r, numberOfValues: n } = t, o = e4[r]?.request.currentValues[0];
  if (o) {
    for (; o.children.length && o?.state !== "selected"; ) o = o.children[0];
    o.retrieveCount = n;
  }
}
function zk(e4, t) {
  return t.facetId in e4;
}
function Hk(e4, t) {
  let r = ft(e4.currentValues), n = ft(t.values);
  return r.length !== n.length;
}
var Go = $(ro(), (e4) => {
  e4.addCase(wo, (t, r) => {
    let { facetId: n } = r.payload;
    n in t || (t[n] = Wf(Wk(r.payload)));
  }).addCase(me.fulfilled, (t, r) => {
    if (r.payload && Object.keys(r.payload.facetSet).length !== 0) return r.payload.facetSet;
  }).addCase(ge, (t, r) => {
    let n = r.payload.f || {}, o = r.payload.fExcluded || {};
    Object.keys(t).forEach((i) => {
      let { request: s } = t[i], u = n[i] || [], c = o[i] || [], d = u.length + c.length, m = s.currentValues.filter((p) => !u.includes(p.value) && !c.includes(p.value));
      s.currentValues = [...u.map(yA), ...c.map(SA), ...m.map(Kk)], s.preventAutoSelect = d > 0, s.numberOfValues = Math.max(d, s.numberOfValues);
    });
  }).addCase(Gr, (t, r) => {
    let { facetId: n, selection: o } = r.payload, a = t[n]?.request;
    if (!a) return;
    a.preventAutoSelect = true;
    let i = a.currentValues.find((u) => u.value === o.value);
    if (!i) {
      Uu(a, o);
      return;
    }
    let s = i.state === "selected";
    i.state = s ? "idle" : "selected", a.freezeCurrentValues = true;
  }).addCase(zr, (t, r) => {
    let { facetId: n, selection: o } = r.payload, a = t[n]?.request;
    if (!a) return;
    a.preventAutoSelect = true;
    let i = a.currentValues.find((u) => u.value === o.value);
    if (!i) {
      Uu(a, o);
      return;
    }
    let s = i.state === "excluded";
    i.state = s ? "idle" : "excluded", a.freezeCurrentValues = true;
  }).addCase(qn, (t, r) => {
    let { facetId: n, freezeCurrentValues: o } = r.payload, a = t[n]?.request;
    a && (a.freezeCurrentValues = o);
  }).addCase(Ae, (t, r) => {
    oi(t[r.payload]?.request);
  }).addCase(qe, (t) => {
    Object.values(t).filter((r) => r.hasBreadcrumbs).forEach(({ request: r }) => oi(r));
  }).addCase(Er, (t) => {
    Object.values(t).filter((r) => !r.hasBreadcrumbs).forEach(({ request: r }) => oi(r));
  }).addCase(Tr, (t, r) => Object.values(t).forEach((n) => {
    n.request.preventAutoSelect = !r.payload.allow;
  })).addCase(Wc, (t, r) => {
    Oo(t, r.payload);
  }).addCase(Za, (t, r) => {
    let { facetId: n, numberOfValues: o } = r.payload;
    cu(t[n]?.request, o);
  }).addCase(ei, (t, r) => {
    let { facetId: n, isFieldExpanded: o } = r.payload, a = t[n]?.request;
    a && (a.isFieldExpanded = o);
  }).addCase(ce.fulfilled, (t, r) => {
    r.payload.response.facets.forEach((o) => hA(t[o.facetId]?.request, o));
  }).addCase(ec.fulfilled, (t, r) => {
    r.payload.response.facets.forEach((o) => hA(t[o.facetId]?.request, o));
  }).addCase(Uc, (t, r) => {
    let { facetId: n, value: o } = r.payload, a = t[n]?.request;
    if (!a) return;
    let { rawValue: i } = o, { currentValues: s } = a, u = s.find((d) => d.value === i);
    if (u) {
      u.state = "selected";
      return;
    }
    let c = yA(i);
    Uu(a, c), a.freezeCurrentValues = true, a.preventAutoSelect = true;
  }).addCase(_c, (t, r) => {
    let { facetId: n, value: o } = r.payload, a = t[n]?.request;
    if (!a) return;
    let { rawValue: i } = o, { currentValues: s } = a, u = s.find((d) => d.value === i);
    if (u) {
      u.state = "excluded";
      return;
    }
    let c = SA(i);
    Uu(a, c), a.freezeCurrentValues = true, a.preventAutoSelect = true;
  }).addCase(he, (t, r) => {
    if (!(r.payload in t)) return;
    let { request: n } = t[r.payload];
    oi(n);
  });
});
function Uu(e4, t) {
  let { currentValues: r } = e4, n = r.findIndex((s) => s.state === "idle"), o = n === -1 ? r.length : n, a = r.slice(0, o), i = r.slice(o + 1);
  e4.currentValues = [...a, t, ...i], e4.numberOfValues = e4.currentValues.length;
}
function hA(e4, t) {
  e4 && (e4.currentValues = t.values.map(Yk), e4.freezeCurrentValues = false, e4.preventAutoSelect = false);
}
var Fm = { filterFacetCount: true, injectionDepth: 1e3, numberOfValues: 8, sortCriteria: "automatic", resultsMustMatch: "atLeastOneValue" };
function Wk(e4) {
  return { ...Fm, type: "specific", currentValues: [], freezeCurrentValues: false, isFieldExpanded: false, preventAutoSelect: false, ...e4 };
}
function Yk(e4) {
  let { value: t, state: r } = e4;
  return { value: t, state: r };
}
function yA(e4) {
  return { value: e4, state: "selected" };
}
function SA(e4) {
  return { value: e4, state: "excluded" };
}
function Kk(e4) {
  return { ...e4, state: "idle" };
}
var ci = E;
var _u = new RecordValue({ options: { required: true }, values: { caption: se, expression: se, state: new StringValue({ constrainTo: ["idle", "selected", "excluded"] }) } });
var vA = new ArrayValue({ required: true, each: _u });
var ZX = S("staticFilter/register", (e4) => x(e4, { id: ci, values: vA }));
var IA = S("staticFilter/toggleSelect", (e4) => x(e4, { id: ci, value: _u }));
var wA = S("staticFilter/toggleExclude", (e4) => x(e4, { id: ci, value: _u }));
var eZ = S("staticFilter/deselectAllFilterValues", (e4) => x(e4, ci));
var aO = Object.getOwnPropertyNames;
var iO = Object.getOwnPropertySymbols;
var sO = Object.prototype.hasOwnProperty;
function MA(e4, t) {
  return function(n, o, a) {
    return e4(n, o, a) && t(n, o, a);
  };
}
function Yu(e4) {
  return function(r, n, o) {
    if (!r || !n || typeof r != "object" || typeof n != "object") return e4(r, n, o);
    var a = o.cache, i = a.get(r), s = a.get(n);
    if (i && s) return i === n && s === r;
    a.set(r, n), a.set(n, r);
    var u = e4(r, n, o);
    return a.delete(r), a.delete(n), u;
  };
}
function QA(e4) {
  return aO(e4).concat(iO(e4));
}
var GA = Object.hasOwn || function(e4, t) {
  return sO.call(e4, t);
};
function Yo(e4, t) {
  return e4 || t ? e4 === t : e4 === t || e4 !== e4 && t !== t;
}
var zA = "_owner";
var LA = Object.getOwnPropertyDescriptor;
var BA = Object.keys;
function cO(e4, t, r) {
  var n = e4.length;
  if (t.length !== n) return false;
  for (; n-- > 0; ) if (!r.equals(e4[n], t[n], n, n, e4, t, r)) return false;
  return true;
}
function uO(e4, t) {
  return Yo(e4.getTime(), t.getTime());
}
function UA(e4, t, r) {
  if (e4.size !== t.size) return false;
  for (var n = {}, o = e4.entries(), a = 0, i, s; (i = o.next()) && !i.done; ) {
    for (var u = t.entries(), c = false, d = 0; (s = u.next()) && !s.done; ) {
      var m = i.value, p = m[0], l = m[1], g = s.value, A = g[0], y = g[1];
      !c && !n[d] && (c = r.equals(p, A, a, d, e4, t, r) && r.equals(l, y, p, A, e4, t, r)) && (n[d] = true), d++;
    }
    if (!c) return false;
    a++;
  }
  return true;
}
function lO(e4, t, r) {
  var n = BA(e4), o = n.length;
  if (BA(t).length !== o) return false;
  for (var a; o-- > 0; ) if (a = n[o], a === zA && (e4.$$typeof || t.$$typeof) && e4.$$typeof !== t.$$typeof || !GA(t, a) || !r.equals(e4[a], t[a], a, a, e4, t, r)) return false;
  return true;
}
function li(e4, t, r) {
  var n = QA(e4), o = n.length;
  if (QA(t).length !== o) return false;
  for (var a, i, s; o-- > 0; ) if (a = n[o], a === zA && (e4.$$typeof || t.$$typeof) && e4.$$typeof !== t.$$typeof || !GA(t, a) || !r.equals(e4[a], t[a], a, a, e4, t, r) || (i = LA(e4, a), s = LA(t, a), (i || s) && (!i || !s || i.configurable !== s.configurable || i.enumerable !== s.enumerable || i.writable !== s.writable))) return false;
  return true;
}
function dO(e4, t) {
  return Yo(e4.valueOf(), t.valueOf());
}
function pO(e4, t) {
  return e4.source === t.source && e4.flags === t.flags;
}
function _A(e4, t, r) {
  if (e4.size !== t.size) return false;
  for (var n = {}, o = e4.values(), a, i; (a = o.next()) && !a.done; ) {
    for (var s = t.values(), u = false, c = 0; (i = s.next()) && !i.done; ) !u && !n[c] && (u = r.equals(a.value, i.value, a.value, i.value, e4, t, r)) && (n[c] = true), c++;
    if (!u) return false;
  }
  return true;
}
function mO(e4, t) {
  var r = e4.length;
  if (t.length !== r) return false;
  for (; r-- > 0; ) if (e4[r] !== t[r]) return false;
  return true;
}
var gO = "[object Arguments]";
var fO = "[object Boolean]";
var hO = "[object Date]";
var yO = "[object Map]";
var SO = "[object Number]";
var CO = "[object Object]";
var AO = "[object RegExp]";
var RO = "[object Set]";
var xO = "[object String]";
var FO = Array.isArray;
var jA = typeof ArrayBuffer == "function" && ArrayBuffer.isView ? ArrayBuffer.isView : null;
var $A = Object.assign;
var bO = Object.prototype.toString.call.bind(Object.prototype.toString);
function vO(e4) {
  var t = e4.areArraysEqual, r = e4.areDatesEqual, n = e4.areMapsEqual, o = e4.areObjectsEqual, a = e4.arePrimitiveWrappersEqual, i = e4.areRegExpsEqual, s = e4.areSetsEqual, u = e4.areTypedArraysEqual;
  return function(d, m, p) {
    if (d === m) return true;
    if (d == null || m == null || typeof d != "object" || typeof m != "object") return d !== d && m !== m;
    var l = d.constructor;
    if (l !== m.constructor) return false;
    if (l === Object) return o(d, m, p);
    if (FO(d)) return t(d, m, p);
    if (jA != null && jA(d)) return u(d, m, p);
    if (l === Date) return r(d, m, p);
    if (l === RegExp) return i(d, m, p);
    if (l === Map) return n(d, m, p);
    if (l === Set) return s(d, m, p);
    var g = bO(d);
    return g === hO ? r(d, m, p) : g === AO ? i(d, m, p) : g === yO ? n(d, m, p) : g === RO ? s(d, m, p) : g === CO ? typeof d.then != "function" && typeof m.then != "function" && o(d, m, p) : g === gO ? o(d, m, p) : g === fO || g === SO || g === xO ? a(d, m, p) : false;
  };
}
function IO(e4) {
  var t = e4.circular, r = e4.createCustomConfig, n = e4.strict, o = { areArraysEqual: n ? li : cO, areDatesEqual: uO, areMapsEqual: n ? MA(UA, li) : UA, areObjectsEqual: n ? li : lO, arePrimitiveWrappersEqual: dO, areRegExpsEqual: pO, areSetsEqual: n ? MA(_A, li) : _A, areTypedArraysEqual: n ? li : mO };
  if (r && (o = $A({}, o, r(o))), t) {
    var a = Yu(o.areArraysEqual), i = Yu(o.areMapsEqual), s = Yu(o.areObjectsEqual), u = Yu(o.areSetsEqual);
    o = $A({}, o, { areArraysEqual: a, areMapsEqual: i, areObjectsEqual: s, areSetsEqual: u });
  }
  return o;
}
function wO(e4) {
  return function(t, r, n, o, a, i, s) {
    return e4(t, r, s);
  };
}
function PO(e4) {
  var t = e4.circular, r = e4.comparator, n = e4.createState, o = e4.equals, a = e4.strict;
  if (n) return function(u, c) {
    var d = n(), m = d.cache, p = m === void 0 ? t ? /* @__PURE__ */ new WeakMap() : void 0 : m, l = d.meta;
    return r(u, c, { cache: p, equals: o, meta: l, strict: a });
  };
  if (t) return function(u, c) {
    return r(u, c, { cache: /* @__PURE__ */ new WeakMap(), equals: o, meta: void 0, strict: a });
  };
  var i = { cache: void 0, equals: o, meta: void 0, strict: a };
  return function(u, c) {
    return r(u, c, i);
  };
}
var Pee = Kt();
var Eee = Kt({ strict: true });
var Tee = Kt({ circular: true });
var kee = Kt({ circular: true, strict: true });
var Oee = Kt({ createInternalComparator: function() {
  return Yo;
} });
var qee = Kt({ strict: true, createInternalComparator: function() {
  return Yo;
} });
var Dee = Kt({ circular: true, createInternalComparator: function() {
  return Yo;
} });
var Vee = Kt({ circular: true, createInternalComparator: function() {
  return Yo;
}, strict: true });
function Kt(e4) {
  e4 === void 0 && (e4 = {});
  var t = e4.circular, r = t === void 0 ? false : t, n = e4.createInternalComparator, o = e4.createState, a = e4.strict, i = a === void 0 ? false : a, s = IO(e4), u = vO(s), c = n ? n(u) : wO(u);
  return PO({ circular: r, comparator: u, createState: o, equals: c, strict: i });
}
function EO(e4, t) {
  return e4.length !== t.length ? false : e4.every((r) => t.findIndex((n) => Pm(r, n)) !== -1);
}
var Pm = Kt({ createCustomConfig: (e4) => ({ ...e4, areArraysEqual: EO }) });
var OO = new Schema({ parameters: new RecordValue({ options: { required: true }, values: dc }) });
var Ju = (e4, t) => ({ ...e4 } && Object.keys({ ...e4 }).length === 0) || !t || !e4 ? true : e4.excluded && e4.excluded.includes(t) ? false : !!(e4.included && (e4.included.length === 0 || e4.included.includes(t)));
var Ne = $(Is(), (e4) => {
  e4.addCase(ie, (t, r) => ({ ...t, ...r.payload })).addCase(ce.fulfilled, (t) => {
    t.freezeFacetOrder = false;
  }).addCase(ce.rejected, (t) => {
    t.freezeFacetOrder = false;
  }).addCase(ut, (t, r) => {
    for (let n in t.facets) {
      let o = t.facets[n];
      Object.keys({ ...o.tabs }).length > 0 && (o.enabled = Ju(o.tabs, r.payload));
    }
  }).addCase(me.fulfilled, (t, r) => r.payload?.facetOptions ?? t).addCase(bo, (t, r) => {
    let { facetId: n, tabs: o, activeTab: a } = r.payload;
    Xu(o, a, t, n);
  }).addCase(wo, (t, r) => {
    let { facetId: n, tabs: o, activeTab: a } = r.payload;
    Xu(o, a, t, n);
  }).addCase(Ut, (t, r) => {
    let { facetId: n, tabs: o, activeTab: a } = r.payload;
    Xu(o, a, t, n);
  }).addCase($t, (t, r) => {
    let { facetId: n, tabs: o, activeTab: a } = r.payload;
    Xu(o, a, t, n);
  }).addCase(He, (t, r) => {
    t.facets[r.payload].enabled = true;
  }).addCase(he, (t, r) => {
    t.facets[r.payload].enabled = false;
  }).addCase(ge, (t, r) => {
    r.payload.tab && Object.entries(t.facets).forEach(([, n]) => {
      Object.keys(n.tabs ?? {}).length > 0 && (n.enabled = Ju(n.tabs, r.payload.tab));
    }), [...Object.keys(r.payload.f ?? {}), ...Object.keys(r.payload.fExcluded ?? {}), ...Object.keys(r.payload.cf ?? {}), ...Object.keys(r.payload.nf ?? {}), ...Object.keys(r.payload.df ?? {})].forEach((n) => {
      n in t || (t.facets[n] = dp()), t.facets[n].enabled = true;
    });
  });
});
function Xu(e4, t, r, n) {
  let o = { ...dp(), tabs: e4 ?? {} };
  e4 && Object.keys(e4).length > 0 && (o.enabled = Ju(e4, t)), r.facets[n] = o;
}
var JA = (e4, t, r, n) => {
  let a = `*${t.categoryFacetSearchSet[e4].options.query}*`, i = t.commerceFacetSet[pi(e4)]?.request, s = i && $O(i) ? i && GO(i) : [], u = s.length ? [s] : [], c = t.commerceQuery?.query, { url: d, accessToken: m, organizationId: p, trackingId: l, language: g, country: A, currency: y, clientId: R, context: f, ...h } = tt(t, n);
  return { url: d, accessToken: m, organizationId: p, facetId: pi(e4), facetQuery: a, ignorePaths: u, trackingId: l, language: g, country: A, currency: y, clientId: R, context: f, query: c, ...!r && { ...h, query: "" } };
};
function $O(e4) {
  return e4.type === "hierarchical";
}
var GO = (e4) => {
  let t = [], r = e4.values[0];
  for (; r; ) t.push(r.value), r = r.children[0];
  return t;
};
var XA = (e4, t, r, n) => {
  let a = `*${t.facetSearchSet[e4].options.query}*`, i = t.commerceQuery?.query, { url: s, accessToken: u, organizationId: c, trackingId: d, language: m, country: p, currency: l, clientId: g, context: A, ...y } = tt(t, n);
  return { url: s, accessToken: u, organizationId: c, facetId: pi(e4), facetQuery: a, trackingId: d, language: m, country: p, currency: l, clientId: g, context: A, query: i, ...!r && { ...y, query: "" } };
};
var ZA = (e4) => async ({ facetId: t, facetSearchType: r }, { getState: n, extra: { validatePayload: o, navigatorContext: a, apiClient: i } }) => {
  let s = n();
  o(t, E);
  let u = zO(s, t) || HO(s, t) ? XA(t, s, e4, a) : JA(t, s, e4, a), c = await i.facetSearch(u, r);
  return { facetId: t, response: c };
};
var tn = L("commerce/facetSearch/executeSearch", ZA(false));
var rn = L("commerce/facetSearch/facetFieldSuggest", ZA(true));
var zO = (e4, t) => "facetSearchSet" in e4 && e4.facetSearchSet[t] !== void 0 && e4.commerceFacetSet[t] !== void 0;
var HO = (e4, t) => "fieldSuggestionsOrder" in e4 ? e4.fieldSuggestionsOrder.some((r) => r.facetId === t && r.type === "regular") : false;
var Zu = "field_suggestion:";
function pi(e4) {
  return e4.startsWith(Zu) ? e4.slice(Zu.length) : e4;
}
function nn(e4) {
  return e4.startsWith(Zu) ? e4 : `${Zu}${e4}`;
}
var ore = W((e4) => e4[Pc].productListing.responseId, (e4) => e4);
var are = W((e4) => e4.productListing.responseId, (e4) => e4);
var ire = W((e4) => e4.productListing.requestId, (e4) => e4);
var Tm = W((e4) => e4.productListing?.products.length || 0, (e4) => e4);
var eR = W((e4) => ({ total: Ic(e4), current: Tm(e4) }), ({ current: e4, total: t }) => e4 < t);
var sre = W((e4) => e4.productListing?.isLoading, (e4) => isNullOrUndefined(e4) ? false : e4);
var cre = W((e4) => e4.productListing?.error, (e4) => e4 ?? null);
var el = L("commerce/productListing/fetch", async (e4, { getState: t, rejectWithValue: r, extra: { apiClient: n, navigatorContext: o } }) => {
  let a = t(), i = await n.getProductListing(tt(a, o));
  return St(i) ? r(i.error) : { response: i.success };
});
var Are = L("commerce/productListing/fetchMoreProducts", async (e4, { getState: t, rejectWithValue: r, extra: { apiClient: n, navigatorContext: o } }) => {
  let a = t();
  if (!eR(a)) return null;
  let s = vc(a), c = Tm(a) / s, d = await n.getProductListing({ ...tt(a, o), page: c });
  return St(d) ? r(d.error) : { response: d.success };
});
var JO = { child: new RecordValue({ options: { required: true }, values: { permanentid: new StringValue({ required: true }) } }) };
var Rre = S("commerce/productListing/promoteChildToParent", (e4) => x(e4, JO));
function mi(e4, t, r) {
  let { facetId: n } = t;
  if (e4[n]) return;
  let o = false, a = { ...Xt, ...t }, i = r();
  e4[n] = { options: a, isLoading: o, response: i, initialNumberOfValues: a.numberOfValues, requestId: "" };
}
function tl(e4, t) {
  let { facetId: r, ...n } = t, o = e4[r];
  o && (o.options = { ...o.options, ...n });
}
function on(e4, t, r) {
  let n = e4[t];
  n && (n.requestId = r, n.isLoading = true);
}
function an(e4, t) {
  let r = e4[t];
  r && (r.isLoading = false);
}
function rl(e4, t, r) {
  let { facetId: n, response: o } = t, a = e4[n];
  a && a.requestId === r && (a.isLoading = false, a.response = o);
}
function nl(e4, t, r) {
  let { facetId: n, response: o } = t, a = e4[n];
  a && a.requestId === r && (a.isLoading = false, "success" in o && (a.response = o.success));
}
function ol(e4, t, r, n) {
  let { facetId: o, response: a } = t, i = nn(o), s = e4[i];
  if (!s) mi(e4, { facetId: i }, n), s = e4[i];
  else if (s.requestId !== r) return;
  s.isLoading = false, "success" in a && (s.response = a.success);
}
function tR(e4, t, r, n) {
  if (t.fieldSuggestionsFacets) for (let o of t.fieldSuggestionsFacets) o.facetId in e4 || o.type !== "regular" || (e4[o.facetId] = { options: { ...Xt, query: t.query ?? "" }, isLoading: false, response: n(), initialNumberOfValues: Xt.numberOfValues, requestId: r });
}
function rR(e4, t, r, n) {
  if (t.fieldSuggestionsFacets) for (let o of t.fieldSuggestionsFacets) {
    let a = nn(o.facetId);
    a in e4 || o.type !== "hierarchical" || (e4[a] = { options: { ...Xt, query: t.query ?? "" }, isLoading: false, response: n(), initialNumberOfValues: Xt.numberOfValues, requestId: r });
  }
}
function gi(e4, t, r) {
  let { facetId: n } = t, o = e4[n];
  o && (o.requestId = "", o.isLoading = false, o.response = r(), o.options.numberOfValues = o.initialNumberOfValues, o.options.query = Xt.query);
}
function mr(e4, t) {
  Object.keys(e4).forEach((r) => gi(e4, { facetId: r }, t));
}
var Xt = { captions: {}, numberOfValues: 10, query: "" };
var nR = async (e4, t, r, n) => {
  let o = t.categoryFacetSearchSet[e4].options, a = t.categoryFacetSet[e4].request, { captions: i, query: s, numberOfValues: u } = o, { field: c, delimitingCharacter: d, basePath: m, filterFacetCount: p } = a, l = XO(a), g = l.length ? [l] : [], A = `*${s}*`;
  return { url: t.configuration.search.apiBaseUrl ?? Le(t.configuration.organizationId, t.configuration.environment), accessToken: t.configuration.accessToken, organizationId: t.configuration.organizationId, ...t.configuration.search.authenticationProviders.length && { authentication: t.configuration.search.authenticationProviders.join(",") }, basePath: m, captions: i, numberOfValues: u, query: A, field: c, delimitingCharacter: d, ignorePaths: g, filterFacetCount: p, type: "hierarchical", ...n ? {} : { searchContext: (await ct(t, r)).request } };
};
var XO = (e4) => {
  let t = [], r = e4.currentValues[0];
  for (; r; ) t.push(r.value), r = r.children[0];
  return t;
};
var oR = async (e4, t, r, n) => {
  let { captions: o, query: a, numberOfValues: i } = t.facetSearchSet[e4].options, { field: s, currentValues: u, filterFacetCount: c } = t.facetSet[e4].request, d = u.filter((p) => p.state !== "idle").map((p) => p.value), m = `*${a}*`;
  return { url: t.configuration.search.apiBaseUrl ?? Le(t.configuration.organizationId, t.configuration.environment), accessToken: t.configuration.accessToken, organizationId: t.configuration.organizationId, ...t.configuration.search.authenticationProviders && { authentication: t.configuration.search.authenticationProviders.join(",") }, captions: o, numberOfValues: i, query: m, field: s, ignoreValues: d, filterFacetCount: c, type: "specific", ...n ? {} : { searchContext: (await ct(t, r)).request } };
};
var aR = (e4) => async (t, { getState: r, extra: { apiClient: n, validatePayload: o, navigatorContext: a } }) => {
  let i = r(), s;
  o(t, E), ZO(i, t) ? s = await oR(t, i, a, e4) : s = await nR(t, i, a, e4);
  let u = await n.facetSearch(s);
  return { facetId: t, response: u };
};
var sn = L("facetSearch/executeSearch", aR(false));
var Mre = L("facetSearch/executeSearch", aR(true));
var al = S("facetSearch/clearResults", (e4) => x(e4, { facetId: G }));
var ZO = (e4, t) => e4.facetSearchSet !== void 0 && e4.facetSet !== void 0 && e4.facetSet[t] !== void 0;
function iR() {
  return {};
}
var sR = $(iR(), (e4) => {
  e4.addCase(hC, (t, r) => {
    let n = r.payload;
    mi(t, n, Dn);
  }).addCase(Bc, (t, r) => {
    tl(t, r.payload);
  }).addCase(tn.pending, (t, r) => {
    let { facetId: n } = r.meta.arg;
    on(t, n, r.meta.requestId);
  }).addCase(rn.pending, (t, r) => {
    let { facetId: n } = r.meta.arg;
    on(t, n, r.meta.requestId);
  }).addCase(sn.pending, (t, r) => {
    let n = r.meta.arg;
    on(t, n, r.meta.requestId);
  }).addCase(tn.rejected, (t, r) => {
    let { facetId: n } = r.meta.arg;
    an(t, n);
  }).addCase(rn.rejected, (t, r) => {
    let { facetId: n } = r.meta.arg;
    an(t, nn(n));
  }).addCase(sn.rejected, (t, r) => {
    let n = r.meta.arg;
    an(t, n);
  }).addCase(tn.fulfilled, (t, r) => {
    nl(t, r.payload, r.meta.requestId);
  }).addCase(rn.fulfilled, (t, r) => {
    ol(t, r.payload, r.meta.requestId, Dn);
  }).addCase(_r.fulfilled, (t, r) => {
    rR(t, r.payload, r.meta.requestId, Dn);
  }).addCase(sn.fulfilled, (t, r) => {
    rl(t, r.payload, r.meta.requestId);
  }).addCase(al, (t, { payload: { facetId: r } }) => {
    gi(t, { facetId: r }, Dn);
  }).addCase(el.fulfilled, (t) => mr(t, Dn)).addCase(Co.fulfilled, (t) => mr(t, Dn)).addCase(ce.fulfilled, (t) => {
    mr(t, Dn);
  });
});
function Dn() {
  return { moreValuesAvailable: false, values: [] };
}
var lt = W((e4) => e4, (e4) => {
  if (!e4) return "";
  for (let t in e4) if (e4[t].isActive) return e4[t].id;
  return "";
});
var lR = ["alphanumeric", "occurrences"];
var pR = new Schema({ field: Qt, tabs: new RecordValue({ options: { required: false }, values: { included: new ArrayValue({ each: new StringValue() }), excluded: new ArrayValue({ each: new StringValue() }) } }), basePath: RC, delimitingCharacter: xC, facetId: Mt, facetSearch: Io, filterByBasePath: FC, filterFacetCount: Lt, injectionDepth: Bt, numberOfValues: At, sortCriteria: new StringValue({ constrainTo: lR }) });
var mq = Intl.supportedValuesOf("currency");
var gq = new StringValue({ required: true, emptyAllowed: false, constrainTo: mq });
var Om = { url: E };
var qm = { language: E, country: E, currency: gq, view: new RecordValue({ options: { required: true }, values: Om }) };
var Zne = new Schema(qm);
var ooe = S("commerce/context/set", (e4) => x(e4, qm));
var gR = S("commerce/context/setView", (e4) => x(e4, Om));
function fR() {
  return {};
}
var il = $(fR(), (e4) => {
  e4.addCase(SC, (t, r) => {
    let n = r.payload;
    mi(t, n, cn);
  }).addCase(Bc, (t, r) => {
    tl(t, r.payload);
  }).addCase(tn.pending, (t, r) => {
    let { facetId: n } = r.meta.arg;
    on(t, n, r.meta.requestId);
  }).addCase(rn.pending, (t, r) => {
    let { facetId: n } = r.meta.arg;
    on(t, nn(n), r.meta.requestId);
  }).addCase(sn.pending, (t, r) => {
    let n = r.meta.arg;
    on(t, n, r.meta.requestId);
  }).addCase(tn.rejected, (t, r) => {
    let { facetId: n } = r.meta.arg;
    an(t, n);
  }).addCase(rn.rejected, (t, r) => {
    let { facetId: n } = r.meta.arg;
    an(t, nn(n));
  }).addCase(sn.rejected, (t, r) => {
    let n = r.meta.arg;
    an(t, n);
  }).addCase(tn.fulfilled, (t, r) => {
    nl(t, r.payload, r.meta.requestId);
  }).addCase(rn.fulfilled, (t, r) => {
    ol(t, r.payload, r.meta.requestId, cn);
  }).addCase(_r.fulfilled, (t, r) => {
    tR(t, r.payload, r.meta.requestId, cn);
  }).addCase(sn.fulfilled, (t, r) => {
    rl(t, r.payload, r.meta.requestId);
  }).addCase(al, (t, { payload: r }) => {
    gi(t, r, cn);
  }).addCase(ce.fulfilled, (t) => {
    mr(t, cn);
  }).addCase(el.fulfilled, (t) => mr(t, cn)).addCase(Co.fulfilled, (t) => mr(t, cn)).addCase(gR, (t) => mr(t, cn));
});
function cn() {
  return { moreValuesAvailable: false, values: [] };
}
var CR = { facetId: G, selection: new RecordValue({ values: On }) };
var AR = L("facet/executeToggleSelect", ({ facetId: e4, selection: t }, r) => {
  let { dispatch: n, extra: { validatePayload: o } } = r;
  o({ facetId: e4, selection: t }, CR), n(Gr({ facetId: e4, selection: t })), n(ie());
});
var RR = L("facet/executeToggleExclude", ({ facetId: e4, selection: t }, r) => {
  let { dispatch: n, extra: { validatePayload: o } } = r;
  o({ facetId: e4, selection: t }, CR), n(zr({ facetId: e4, selection: t })), n(ie());
});
var Ko = ["allValues", "atLeastOneValue"];
var sl = ["score", "alphanumeric", "alphanumericDescending", "occurrences", "automatic"];
var FR = new Schema({ facetId: Mt, tabs: new RecordValue({ options: { required: false }, values: { included: new ArrayValue({ each: new StringValue() }), excluded: new ArrayValue({ each: new StringValue() }) } }), field: Qt, filterFacetCount: Lt, injectionDepth: Bt, numberOfValues: At, sortCriteria: new StringValue({ constrainTo: sl }), resultsMustMatch: new StringValue({ constrainTo: Ko }), facetSearch: Io });
var IR = new Schema({ facetId: Mt, field: Qt, tabs: new RecordValue({ options: { required: false }, values: { included: new ArrayValue({ each: new StringValue() }), excluded: new ArrayValue({ each: new StringValue() }) } }), filterFacetCount: Lt, injectionDepth: Bt, numberOfValues: At, sortCriteria: new StringValue({ constrainTo: sl }), resultsMustMatch: new StringValue({ constrainTo: Ko }), facetSearch: Io, allowedValues: Gc, customSort: zc });
var pl = S("rangeFacet/executeToggleSelect", (e4) => x(e4, ur(e4.selection)));
var ml = S("rangeFacet/executeToggleExclude", (e4) => x(e4, ur(e4.selection)));
var PR = { facetId: G, selection: new RecordValue({ values: kn }) };
var ER = L("dateFacet/executeToggleSelect", (e4, { dispatch: t, extra: { validatePayload: r } }) => {
  r(e4, PR), t(_t(e4)), t(pl(e4)), t(ie());
});
var TR = L("dateFacet/executeToggleExclude", (e4, { dispatch: t, extra: { validatePayload: r } }) => {
  r(e4, PR), t(jt(e4)), t(ml(e4)), t(ie());
});
var hl = ["idle", "selected", "excluded"];
var yl = ["ascending", "descending"];
var Sl = ["even", "equiprobable"];
var Pq = { start: new StringValue(), end: new StringValue(), endInclusive: new BooleanValue(), state: new StringValue({ constrainTo: hl }) };
var Eq = new Schema({ facetId: Mt, field: Qt, tabs: new RecordValue({ options: { required: false }, values: { included: new ArrayValue({ each: new StringValue() }), excluded: new ArrayValue({ each: new StringValue() }) } }), generateAutomaticRanges: $c, filterFacetCount: Lt, injectionDepth: Bt, numberOfValues: At, currentValues: new ArrayValue({ each: new RecordValue({ values: Pq }) }), sortCriteria: new StringValue({ constrainTo: yl }), rangeAlgorithm: new StringValue({ constrainTo: Sl }) });
var qR = { facetId: G, selection: new RecordValue({ values: Tn }) };
var DR = L("numericFacet/executeToggleSelect", (e4, { dispatch: t, extra: { validatePayload: r } }) => {
  r(e4, qR), t(Gt(e4)), t(pl(e4)), t(ie());
});
var ose = L("numericFacet/executeToggleExclude", (e4, { dispatch: t, extra: { validatePayload: r } }) => {
  r(e4, qR), t(zt(e4)), t(ml(e4)), t(ie());
});
var Vq = { start: new NumberValue(), end: new NumberValue(), endInclusive: new BooleanValue(), state: new StringValue({ constrainTo: hl }) };
var Nq = new Schema({ facetId: Mt, tabs: new RecordValue({ options: { required: false }, values: { included: new ArrayValue({ each: new StringValue() }), excluded: new ArrayValue({ each: new StringValue() }) } }), field: Qt, generateAutomaticRanges: $c, filterFacetCount: Lt, injectionDepth: Bt, numberOfValues: At, currentValues: new ArrayValue({ each: new RecordValue({ values: Vq }) }), sortCriteria: new StringValue({ constrainTo: yl }), resultsMustMatch: new StringValue({ constrainTo: Ko }), rangeAlgorithm: new StringValue({ constrainTo: Sl }) });
var $q = new Schema({ numberOfPages: new NumberValue({ default: 5, min: 0 }) });
var Gq = new Schema({ page: new NumberValue({ min: 1 }) });
var iD = new Schema({ fieldsToInclude: new ArrayValue({ required: false, each: new StringValue({ required: true, emptyAllowed: false }) }) });
var ode = S("folding/register", (e4) => x(e4, ai));
var KR = L("folding/loadCollection", async (e4, { getState: t, rejectWithValue: r, extra: { apiClient: n } }) => {
  let o = t(), a = await Hh(o, e4), s = (await ey(n, o, a, { origin: "foldingCollection" })).response;
  return oe(s) ? r(s.error) : { collectionId: e4, results: s.success.results, rootResult: o.folding.collections[e4].result };
});
var Zo = $(fe(), (e4) => e4.addCase(Ge, (t, r) => ({ ...t, ...r.payload })).addCase($e, (t, r) => {
  t.q = r.payload;
}).addCase(Br, (t, r) => {
  t.q = r.payload.expression;
}).addCase(me.fulfilled, (t, r) => r.payload?.query ?? t).addCase(ge, (t, r) => {
  t.q = r.payload.q ?? t.q, t.enableQuerySyntax = r.payload.enableQuerySyntax ?? t.enableQuerySyntax;
}));
var pD = new Schema(ai);
var CD = new Schema({ numberOfResults: new NumberValue({ min: 0 }) });
var Bm = { open: new StringValue(), close: new StringValue() };
var vD = { id: E, numberOfSuggestions: new NumberValue({ min: 0 }), enableQuerySyntax: new BooleanValue(), highlightOptions: new RecordValue({ values: { notMatchDelimiters: new RecordValue({ values: Bm }), exactMatchDelimiters: new RecordValue({ values: Bm }), correctionDelimiters: new RecordValue({ values: Bm }) } }), clearFilters: new BooleanValue() };
var ax = new Schema(vD);
var sx = { by: new EnumValue({ enum: is, required: true }) };
var bl = S("sortCriteria/register", (e4) => cx(e4));
var vl = S("sortCriteria/update", (e4) => cx(e4));
var cx = (e4) => isArray(e4) ? (e4.forEach((t) => x(t, sx)), { payload: e4 }) : x(e4, sx);
var ux = $(Ze(), (e4) => {
  e4.addCase(bl, (t, r) => ir(r.payload)).addCase(vl, (t, r) => ir(r.payload)).addCase(me.fulfilled, (t, r) => r.payload?.sortCriteria ?? t).addCase(ge, (t, r) => r.payload.sortCriteria ?? t);
});
var px = $(Ps(), (e4) => {
  e4.addCase(pc, (t, r) => {
    let n = r.payload, { id: o } = n;
    o in t || (t[o] = { ...n, isActive: false });
  }).addCase(ut, (t, r) => {
    let n = r.payload;
    dx(t, n);
  }).addCase(ge, (t, r) => {
    let n = r.payload.tab || "";
    dx(t, n), ut(n);
  }).addCase(me.fulfilled, (t, r) => r.payload?.tabSet ?? t);
});
function dx(e4, t) {
  t in e4 && Object.keys(e4).forEach((n) => {
    e4[n].isActive = n === t;
  });
}
var LD = new Schema({ expression: se, id: E, clearFiltersOnTabChange: new BooleanValue() });
var BD = new Schema({ isActive: new BooleanValue() });
var Rx = (e4) => le("analytics/generatedAnswer/streamEnd", (t, r) => {
  let { id: n, answerAPIEnabled: o } = ze(r), a = e4 ? !r.generatedAnswer?.answer || !r.generatedAnswer?.answer.length : void 0;
  return n ? t.makeGeneratedAnswerStreamEnd({ ...o ? { answerAPIStreamId: n } : { generativeQuestionAnsweringId: n }, answerGenerated: e4, answerTextIsEmpty: a }) : null;
});
var Fx = async (e4) => ({ accessToken: e4.configuration.accessToken, organizationId: e4.configuration.organizationId, url: de(e4.configuration.organizationId, e4.configuration.environment), streamId: e4.search.extendedResults?.generativeQuestionAnsweringId });
var bx = ["text/plain", "text/markdown"];
var ea = new StringValue({ required: true });
var Ix = new StringValue();
var Si = new BooleanValue({ required: true });
var vV = { id: ea, title: ea, uri: ea, permanentid: ea, clickUri: Ix };
var wx = new StringValue({ required: true, constrainTo: bx });
var ta = S("generatedAnswer/setIsVisible", (e4) => x(e4, Si));
var Ci = S("generatedAnswer/setIsEnabled", (e4) => x(e4, Si));
var $m = S("generatedAnswer/updateMessage", (e4) => x(e4, { textDelta: ea }));
var Gm = S("generatedAnswer/updateCitations", (e4) => x(e4, { citations: new ArrayValue({ required: true, each: new RecordValue({ values: vV }) }) }));
var zm = S("generatedAnswer/updateError", (e4) => x(e4, { message: Ix, code: new NumberValue({ min: 0 }) }));
var un = S("generatedAnswer/resetAnswer");
var kl = S("generatedAnswer/like");
var Ol = S("generatedAnswer/dislike");
var ql = S("generatedAnswer/feedbackModal/open");
var Ai = S("generatedAnswer/expand");
var Dl = S("generatedAnswer/collapse");
var Vl = S("generatedAnswer/setId", (e4) => x(e4, { id: new StringValue({ required: true }) }));
var Nl = S("generatedAnswer/feedbackModal/close");
var ra = S("generatedAnswer/sendFeedback");
var yi = S("generatedAnswer/setIsLoading", (e4) => x(e4, Si));
var El = S("generatedAnswer/setIsStreaming", (e4) => x(e4, Si));
var Hm = S("generatedAnswer/setAnswerContentFormat", (e4) => x(e4, wx));
var Ml = S("generatedAnswer/updateResponseFormat", (e4) => x(e4, { contentFormat: new ArrayValue({ each: wx, default: ["text/plain"] }) }));
var Ql = S("knowledge/updateAnswerConfigurationId", (e4) => x(e4, ea));
var Ll = S("generatedAnswer/registerFieldsToIncludeInCitations", (e4) => x(e4, Oi));
var Wm = S("generatedAnswer/setIsAnswerGenerated", (e4) => x(e4, Si));
var Px = L("generatedAnswer/streamAnswer", async (e4, t) => {
  let r = t.getState(), { dispatch: n, extra: o } = t, { setAbortControllerRef: a } = e4, i = await Fx(r), s = (d, m) => {
    switch (d) {
      case "genqa.headerMessageType": {
        let p = JSON.parse(m);
        n(Hm(p.contentFormat));
        break;
      }
      case "genqa.messageType":
        n($m(JSON.parse(m)));
        break;
      case "genqa.citationsType":
        n(Gm(JSON.parse(m)));
        break;
      case "genqa.endOfStreamType": {
        let p = JSON.parse(m).answerGenerated;
        n(El(false)), n(Wm(p)), n(Rx(p));
        break;
      }
      default:
        r.debug && o.logger.warn(`Unknown payloadType: "${d}"`);
    }
  };
  n(yi(true));
  let u = (d) => d.streamId === t.getState().search.extendedResults.generativeQuestionAnsweringId, c = o.streamingClient?.streamGeneratedAnswer(i, { write: (d) => {
    u(i) && (n(yi(false)), d.payload && d.payloadType && s(d.payloadType, d.payload));
  }, abort: (d) => {
    u(i) && n(zm(d));
  }, close: () => {
    u(i) && n(El(false));
  }, resetAnswer: () => {
    u(i) && n(un());
  } });
  c ? a(c) : n(yi(false));
});
function Ym() {
  return { id: "", isVisible: true, isEnabled: true, isLoading: false, isStreaming: false, citations: [], liked: false, disliked: false, responseFormat: { contentFormat: ["text/plain"] }, feedbackModalOpen: false, feedbackSubmitted: false, fieldsToIncludeInCitations: [], isAnswerGenerated: false, expanded: false };
}
var Bl = $(Ym(), (e4) => e4.addCase(ta, (t, { payload: r }) => {
  t.isVisible = r;
}).addCase(Ci, (t, { payload: r }) => {
  t.isEnabled = r;
}).addCase(Vl, (t, { payload: r }) => {
  t.id = r.id;
}).addCase($m, (t, { payload: r }) => {
  t.isLoading = false, t.isStreaming = true, t.answer || (t.answer = ""), t.answer += r.textDelta, delete t.error;
}).addCase(Gm, (t, { payload: r }) => {
  t.isLoading = false, t.isStreaming = true;
  let n = /* @__PURE__ */ new Map();
  for (let o of [t.citations, r.citations]) for (let a of o) n.set(a.uri, a);
  t.citations = Array.from(n.values()), delete t.error;
}).addCase(zm, (t, { payload: r }) => {
  t.isLoading = false, t.isStreaming = false, t.error = { ...r, isRetryable: r.code === Yl }, t.citations = [], delete t.answer;
}).addCase(kl, (t) => {
  t.liked = true, t.disliked = false;
}).addCase(Ol, (t) => {
  t.liked = false, t.disliked = true;
}).addCase(ql, (t) => {
  t.feedbackModalOpen = true;
}).addCase(Nl, (t) => {
  t.feedbackModalOpen = false;
}).addCase(ra, (t) => {
  t.feedbackSubmitted = true;
}).addCase(un, (t) => ({ ...Ym(), ...t.answerConfigurationId ? { answerConfigurationId: t.answerConfigurationId } : {}, responseFormat: t.responseFormat, fieldsToIncludeInCitations: t.fieldsToIncludeInCitations, isVisible: t.isVisible, id: t.id })).addCase(yi, (t, { payload: r }) => {
  t.isLoading = r;
}).addCase(El, (t, { payload: r }) => {
  t.isStreaming = r;
}).addCase(Hm, (t, { payload: r }) => {
  t.answerContentFormat = r;
}).addCase(Ml, (t, { payload: r }) => {
  t.responseFormat = r;
}).addCase(Ll, (t, r) => {
  t.fieldsToIncludeInCitations = [...new Set(t.fieldsToIncludeInCitations.concat(r.payload))];
}).addCase(Wm, (t, { payload: r }) => {
  t.isAnswerGenerated = r;
}).addCase(Ai, (t) => {
  t.expanded = true;
}).addCase(Dl, (t) => {
  t.expanded = false;
}).addCase(Ql, (t, { payload: r }) => {
  t.answerConfigurationId = r;
}));
var Tx = uc.injectEndpoints({ endpoints: (e4) => ({ post: e4.mutation({ query: (t) => ({ url: "/evaluations", method: "POST", body: t }) }) }) });
var LV = new Schema({ content: new Value({ required: true }), conditions: new Value({ required: true }), priority: new NumberValue({ required: false, default: 0, min: 0 }), fields: new ArrayValue({ required: false, each: E }) });

// index.js
aJ();
/*! Bundled license information:

@coveo/bueno/dist/browser/bueno.esm.js:
  (**
   * @license
   *
   * Copyright 2024 Coveo Solutions Inc.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   * 
   *       http://www.apache.org/licenses/LICENSE-2.0
   * 
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@coveo/headless/dist/browser/insight/headless.esm.js:
  (**
   * @license
   *
   * Copyright 2024 Coveo Solutions Inc.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   * 
   *       http://www.apache.org/licenses/LICENSE-2.0
   * 
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
*/
