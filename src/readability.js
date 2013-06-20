var jsdom = require('jsdom');
var fetchUrl = require('fetch').fetchUrl;
var helpers = require('./helpers');

exports.debug = function (debug) {
  helpers.debug(debug);
};

exports.debug(false);

function Readability(document) {
  this._document = document;
  this.iframeLoads = 0;
  // Cache the body HTML in case we need to re-use it later
  this.bodyCache = null;
  this._articleContent = '';

  this.cache = {};

  helpers.prepDocument(this._document);
  this.cache = {
    'body': this._document.body.innerHTML
  };
}

Readability.prototype.getImage = function () {
  return helpers.grabImage(this._document);
}

Readability.prototype.getContent = function () {
  if (typeof this.cache['article-content'] !== 'undefined') {
    return this.cache['article-content'];
  }

  var articleContent = helpers.grabArticle(this._document);
  if (helpers.getInnerText(articleContent, false) === '') {
    this._document.body.innerHTML = this.cache.body;
    articleContent = helpers.grabArticle(this._document, true);
    if (helpers.getInnerText(articleContent, false) === '') {
      return this.cache['article-content'] = false;
    }
  }

  return this.cache['article-content'] = articleContent.innerHTML;
};

Readability.prototype.getTitle = function () {
  if (typeof this.cache['article-title'] !== 'undefined') {
    return this.cache['article-title'];
  }
  var title = this._document.title;
  var betterTitle;
  var commonSeparatingCharacters = [' | ', ' _ ', ' - ', '«', '»', '—'];
  var bestTitle = "";

  var self = this;
  commonSeparatingCharacters.forEach(function (char) {
    var tmpArray = title.split(char);
    if (tmpArray.length > 1) {
      if (betterTitle) bestTitle = title;
      betterTitle = tmpArray[0].trim();
    }
  });

  if (betterTitle && betterTitle.length > 10 && betterTitle.length > bestTitle.length ) {
    bestTitle = betterTitle;
  }

  var tmpTitle = "";
  var h1Array = this._document.getElementsByTagName("h1");
  for (var i = h1Array.length - 1; i >= 0; i--) {
    if(h1Array[i]["textContent"].length > tmpTitle.length)
        tmpTitle = h1Array[i]["textContent"];
  };
  if(tmpTitle.length > bestTitle.length) bestTitle = tmpTitle;

  return this.cache['article-title'] = bestTitle;
};

Readability.prototype.getDocument = function () {
  return this._document;
};

Readability.prototype.getHTML = function () {
  return this._document.getElementsByTagName('html')[0].innerHTML;
};

function read(html, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  if (html.indexOf('<') === -1) {
    fetchUrl(html, options, jsdomParse);
  } else {
    jsdomParse(null, null, html);
  }

  function jsdomParse(error, meta, body) {
    if (error) {
      return callback(error);
    }

    if(helpers.isBannedWebsite(meta.finalUrl)) {
      return callback("Website/Extension banned!");
    }

    if (typeof body !== 'string') body = body.toString();
    jsdom.env({
      html: body,
      done: function (errors, window) {
        if (errors) return callback(errors);
        if (!window.document.body) return callback(new Error('No body tag was found.'));
        callback(null, new Readability(window.document, options));
      }
    });
  }
}

module.exports.read = read;
