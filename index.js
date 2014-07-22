(function(define){define(function(require,exports,module){
'use strict';

/**
 * Module Dependencies
 */

var evt = require('evt');
var attach = require('attach');

/**
 * Exports
 */

module.exports = View;

/**
 * Locals
 */

var counter = 1;

/**
 * Base view class. Accepts
 * or creates a root element
 * which we template into.
 *
 * @constructor
 */
function View(options) {
  // Override defaults.
  mixin(this, options || {});

  // Set up the root element.
  var el = this.el = this.el || document.createElement(this.tag);
  el.id = el.id || ('view-' + counter++);
  if (this.className) { el.classList.add(this.className); }
  el.classList.add(this.name);

  // Add object for storing child elements.
  this.els = this.els || {};

  // Ensure all methods are called within
  // the context of this view.
  bindAll(this);

  // Initialize view.
  this.initialize.apply(this, arguments);

  // Automatically attach event delegates.
  this.attach(this.events || {});
}

/**
 * Base view prototype,
 * mixed in event emitter.
 *
 * @type {Object}
 */
evt(View.prototype);

/**
 * Default tagName
 *
 * @type {String}
 */
View.prototype.tag = 'div';
View.prototype.name = 'view';

/**
 * Appends the root element
 * to the given parent.
 *
 * @param  {Element} parent
 * @return {View}
 */
View.prototype.appendTo = function(parent) {
  if (!parent) return this;
  parent.appendChild(this.el);
  this.emit('inserted');
  return this;
};

/**
 * Prepends the root element
 * to the given parent.
 *
 * @param  {Element} parent
 * @return {View}
 */
View.prototype.prependTo = function(parent) {
  if (!parent) return this;
  var first = parent.firstChild;

  if (first) parent.insertBefore(this.el, first);
  else this.appendTo(parent);

  this.emit('inserted');
  return this;
};

/**
 * Convenient shorthand
 * querySelector.
 *
 * @param  {String} query
 * @return {Element | null}
 */
View.prototype.find = function(query) {
  return this.el.querySelector(query);
};

/**
 * Attaches a DOM event listener for the specified
 * event name to the root element of the View. An
 * optional CSS selector can be specified to delegate
 * the given event handler for specific child elements.
 *
 * It can also attach multiple event listeners at once
 * following the same conventions as Backbone.View:
 *
 *   myView.attach({
 *
 *     // Attach a 'click' event handler to
 *     // the root element of the View
 *     'click': function(evt) {...},
 *
 *     // Attach a 'click' event handler to
 *     // child elements matching the '.button'
 *     // CSS selector
 *     'click .button': function(evt) {...},
 *
 *     // Attach a 'mouseup' event handler to
 *     // child elements matching the 'li > a'
 *     // CSS selector using a named event
 *     // handler (where `onMouseUp` is defined
 *     // as a method on the View)
 *     'mouseup li > a': 'onMouseUp'
 *   });
 *
 * @param  {String|Object} nameOrEvents
 * @param  {String} selector (optional)
 * @param  {Function} handler (optional)
 * @param  {Object} context (optional)
 */
View.prototype.attach = function(nameOrEvents, selector, handler) {
  if (typeof nameOrEvents !== 'object') {
    attach.on(this.el, nameOrEvents, selector, handler, this);
    return;
  }

  // Automatically resolve event handlers
  // specified by name.
  for (var key in nameOrEvents) {
    if (typeof nameOrEvents[key] !== 'function') {
      nameOrEvents[key] = this[nameOrEvents[key]];
    }
  }

  attach.many(this.el, nameOrEvents, this);
};

/**
 * Removes a DOM event listener for the specified
 * event name from the root element of the View. An
 * optional CSS selector and event handler can also
 * be specified to remove specific event listeners.
 * If all arguments are omitted, all event listeners
 * are removed for the View.
 *
 * @param  {String} name (optional)
 * @param  {String} selector (optional)
 */
View.prototype.detach = function(name, selector) {
  attach.off(this.el, name, selector);
};

/**
 * Removes the element from
 * its current DOM location.
 *
 * @param  {Object} options
 * @return {View}
 */
View.prototype.remove = function(options) {
  var silent = options && options.silent;
  var parent = this.el.parentNode;
  if (!parent) return this;
  parent.removeChild(this.el);
  if (!silent) this.emit('remove');
  return this;
};

View.prototype.get = function(key) {
  key = toDashed(key);
  return this.el.getAttribute('data-' + key);
};

View.prototype.set = function(key, value) {
  if (typeof key !== 'string') { return; }
  if (arguments.length === 1) { value = true; }
  if (!value) { return this.unset(key); }

  key = toDashed(key);

  var oldValue = this.el.getAttribute('data-' + key);
  var oldClass = oldValue && toClassName(key, oldValue);
  var newClass = toClassName(key, value);
  var classList = this.el.classList;

  if (oldClass) { classList.remove(oldClass); }
  if (newClass) { classList.add(newClass); }

  this.el.setAttribute('data-' + key, value);
};

View.prototype.unset = function(key) {
  key = toDashed(key);

  var oldValue = this.el.getAttribute('data-' + key);
  var oldClass = oldValue && toClassName(key, oldValue);

  if (oldClass) { this.el.classList.remove(oldClass); }

  this.el.removeAttribute('data-' + key);
};

/**
 * Returns a function that when called
 * will .set() the given key.
 *
 * If a value is passed to .setter(),
 * that value will always be used
 * when the returned function is called.
 * Else the value passed to the given
 * function will be used.
 *
 * Example:
 *
 * var setter = this.setter('key', 'value');
 * setter(); //=> this.set('key', 'value');
 * setter('value2'); //=> this.set('key', 'value');
 *
 * var setter = this.setter('key');
 * setter('value'); //=> this.set('key', 'value');
 * setter(); //=> this.set('key');
 *
 * @param  {String} key
 * @param  {*} value
 * @return {Function}
 */
View.prototype.setter = function(key, forced) {
  var self = this;
  return function(passed) {
    var value = forced !== undefined ? forced : passed;
    self.set(key, value);
  };
};

View.prototype.enable = function(key) {
  this.set(key ? key + '-enabled' : 'enabled');
  this.unset(key ? key + '-disabled' : 'disabled');
};

View.prototype.disable = function(key) {
  this.set(key ? key + '-disabled' : 'disabled');
  this.unset(key ? key + '-enabled' : 'enabled');
};

View.prototype.toggle = function(key) {
  if (this.get(key ? key + '-enabled' : 'enabled')) {
    return this.disable(key);
  }
  this.enable(key);
};

View.prototype.enabler = function(key) {
  return (function() { this.enable(key); }).bind(this);
};

View.prototype.disabler = function(key) {
  return (function() { this.disable(key); }).bind(this);
};

View.prototype.toggler = function(key) {
  return (function() { this.toggle(key); }).bind(this);
};

/**
 * Removes the element from
 * it's current context, firing
 * a 'destroy' event to allow
 * views to perform cleanup.
 *
 * Then clears any internal
 * references to aid GC.
 *
 * @return {[type]} [description]
 */
View.prototype.destroy = function(options) {
  var noRemove = options && options.noRemove;
  if (!noRemove) this.remove();
  this.detach();
  this.emit('destroy');
  this.el = null;
};

/**
 * Default `initialize` implementation
 * for simply calling the `render`
 * method for the View.
 *
 * NOTE: Overwrite if needed
 *
 * @return {View}
 */
View.prototype.initialize = function() {
  return this.render();
};

/**
 * Default `render` implementation
 * for simply injecting the contents
 * of the `template` property of the
 * View into the View's root element.
 *
 * If the `template` property is a
 * function, it will be called passing
 * in the arguments passed to this
 * method and its return value will be
 * injected into the View's root element.
 *
 * NOTE: Overwrite if needed
 *
 * @return {View}
 */
View.prototype.render = function() {
  var html = this.template;
  if (typeof html === 'function') {
    html = html.apply(this, arguments);
  }

  this.el.innerHTML = html;
  return this;
};

/**
 * Default `template` implementation
 * returning an empty HTML string.
 * for simply calling the `render`
 * method for the View.
 *
 * NOTE: Overwrite if needed
 *
 * @return {String}
 */
View.prototype.template = function() {
  return '';
};

/**
 * Extends the base view
 * class with the given
 * properties.
 *
 * TODO: Pull this out to
 * standalone module.
 *
 * @param  {Object} properties
 * @return {Function}
 */
View.extend = function(props) {
  var Parent = this;

  // The extended constructor
  // calls the parent constructor
  var Child = function() {
    Parent.apply(this, arguments);
  };

  Child.prototype = Object.create(Parent.prototype);
  Child.extend = View.extend;
  mixin(Child.prototype, props);

  return Child;
};

/**
 * Attempts to cast a value to a
 * boolean. If the value is a string
 * containing 'true' or 'false', it
 * will be converted to a boolean.
 * Otherwise, the value returned will
 * be the same as the value passed in.
 *
 * Examples:
 *   toBoolean(true); //=> true
 *   toBoolean(false); //=> false
 *   toBoolean('true'); //=> true
 *   toBoolean('false'); //=> false
 *   toBoolean('foo'); //=> 'foo'
 *   toBoolean(123); //=> 123
 *   toBoolean(null); //=> null
 *   toBoolean(); //=> undefined
 *
 * @param  {*} value
 *
 * @return {*}
 */
function toBoolean(value) {
  if (typeof value === 'boolean') { return value; }
  else if (value === 'true') { return true; }
  else if (value === 'false') { return false; }
  return value;
}

/**
 * Converts a key/value pair to
 * a CSS class name.
 *
 * Examples:
 *   toClassName('foo', true); //=> 'foo'
 *   toClassName('foo', false); //=> ''
 *   toClassName('foo', 'true'); //=> 'foo'
 *   toClassName('foo', 'false'); //=> ''
 *   toClassName('foo', 'bar'); //=> 'foo-bar'
 *   toClassName('foo'); //=> 'foo'
 *
 * @param  {String} key
 * @param  {*} value
 *
 * @return {String}
 */
function toClassName(key, value) {
  value = toBoolean(value);
  if (typeof value === 'boolean') { return value ? key : '' }
  else if (value) { return key + '-' + value; }
  else { return key; }
}

function toDashed(s) {
  return s.replace(/\W+/g, '-')
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function mixin(a, b) {
  for (var key in b) { a[key] = b[key]; }
  return a;
}

function bindAll(object) {
  var key;
  var fn;
  for (key in object) {
    fn = object[key];
    if (typeof fn === 'function') {
      object[key] = fn.bind(object);
    }
  }
}

});})((function(n,w){return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:function(c){
var m={exports:{}},r=function(n){return w[n];};w[n]=c(r,m.exports,m)||m.exports;};})('view',this));