baseUrl = '/cfs';
FS.HTTP = FS.HTTP || {};

// Note the upload URL so that client uploader packages know what it is
FS.HTTP.uploadUrl = baseUrl + '/files';

/**
 * @method FS.HTTP.setBaseUrl
 * @public
 * @param {String} newBaseUrl - Change the base URL for the HTTP GET and DELETE endpoints.
 * @returns {undefined}
 */
FS.HTTP.setBaseUrl = function setBaseUrl(newBaseUrl) {

  // Adjust the baseUrl if necessary
  if (newBaseUrl.slice(0, 1) !== '/') {
    newBaseUrl = '/' + newBaseUrl;
  }
  if (newBaseUrl.slice(-1) === '/') {
    newBaseUrl = newBaseUrl.slice(0, -1);
  }

  // Update the base URL
  baseUrl = newBaseUrl;
  
  // Change the upload URL so that client uploader packages know what it is
  FS.HTTP.uploadUrl = baseUrl + '/files';

  // Remount URLs with the new baseUrl, unmounting the old, on the server only
  Meteor.isServer && mountUrls();
};

/*
 * FS.File extensions
 */

/** 
 * @method FS.File.prototype.url Construct the file url
 * @public
 * @param {object} [options]
 * @param {string} [options.store] Name of the store to get from. If not defined,
 * the first store defined in `options.stores` for the collection is used.
 * @param {boolean} [options.auth=null] Wether or not the authenticate
 * @param {boolean} [options.download=false] Should headers be set to force a download
 * @param {boolean} [options.brokenIsFine=false] Return the URL even if
 * we know it's currently a broken link because the file hasn't been saved in
 * the requested store yet.
 *
 * Return the http url for getting the file - on server set auth if wanting to
 * use authentication on client set auth to true or token
 */
FS.File.prototype.url = function(options) {
  var self = this;
  options = options || {};
  options = _.extend({
    store: null,
    auth: null,
    download: false,
    metadata: false,
    brokenIsFine: false
  }, options.hash || options); // check for "hash" prop if called as helper

  if (self.isMounted()) {
    var filename = '';
    var storeName = options.store;

    if (storeName) {
      var copyInfo = self.getCopyInfo(storeName);
      if (!copyInfo) {
        if (options.brokenIsFine) {
          copyInfo = {};
        } else {
          // We want to return null if we know the URL will be a broken
          // link because then we can avoid rendering broken links, broken
          // images, etc.
          return null;
        }
      }

      filename = copyInfo.name;
      if (filename && filename.length) {
        filename = '/' + filename;
      } else {
        filename = '';
      }
    }

    // TODO: Could we somehow figure out if the collection requires login?
    var authToken = '';
    if (typeof Accounts !== "undefined") {
      if (options.auth !== false) {
        authToken = Accounts._storedLoginToken() || '';
      }
    } else if (typeof options.auth === "string") {
      authToken = options.auth;
    }

    // Construct query string
    var params = [];
    if (authToken !== '') {
      params.push('token=' + authToken);
    }
    if (options.download) {
      params.push('download=true');
    }
    if (storeName) {
      params.push('store=' + storeName); //TODO url escape
    }
    
    var area;
    if (options.metadata) {
      area = '/record';
    } else {
      area = '/files';
    }

    var queryString;
    if (params.length) {
      queryString = '?' + params.join('&');
    } else {
      queryString = '';
    }

    // Construct and return the http method url
    return baseUrl + area + '/' + self.collection.name + '/' + self._id + filename + queryString;
  }

};