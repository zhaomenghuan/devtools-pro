// source https://github.com/chimurai/http-proxy-middleware/blob/88136d181d/src/context-matcher.ts
const isGlob = require('is-glob');
const micromatch = require('micromatch');
const url = require('url');

const ERRORS = {
    ERR_CONTEXT_MATCHER_GENERIC: 'Invalid context. Expecting something like: "/api" or ["/api", "/ajax"]',
    ERR_CONTEXT_MATCHER_INVALID_ARRAY:
        'Invalid context. Expecting something like: ["/api", "/ajax"] or ["/api/**", "!**.html"]'
};
module.exports = function match(context, uri, req) {
    // single path
    if (isStringPath(context)) {
        return matchSingleStringPath(context, uri);
    }

    // single glob path
    if (isGlobPath(context)) {
        return matchSingleGlobPath(context, uri);
    }

    // multi path
    if (Array.isArray(context)) {
        if (context.every(isStringPath)) {
            return matchMultiPath(context, uri);
        }
        if (context.every(isGlobPath)) {
            return matchMultiGlobPath(context, uri);
        }

        throw new Error(ERRORS.ERR_CONTEXT_MATCHER_INVALID_ARRAY);
    }

    // custom matching
    if (typeof context === 'function') {
        const pathname = getUrlPathName(uri);
        return context(pathname, req);
    }

    throw new Error(ERRORS.ERR_CONTEXT_MATCHER_GENERIC);
};

/**
 * @param  {String} context '/api'
 * @param  {String} uri     'http://example.org/api/b/c/d.html'
 * @return {Boolean}
 */
function matchSingleStringPath(context, uri) {
    const pathname = getUrlPathName(uri);
    return pathname.indexOf(context) === 0;
}

function matchSingleGlobPath(pattern, uri) {
    const pathname = getUrlPathName(uri);
    const matches = micromatch([pathname], pattern);
    return matches && matches.length > 0;
}

function matchMultiGlobPath(patternList, uri) {
    return matchSingleGlobPath(patternList, uri);
}

/**
 * @param  {String} contextList ['/api', '/ajax']
 * @param  {String} uri     'http://example.org/api/b/c/d.html'
 * @return {Boolean}
 */
function matchMultiPath(contextList, uri) {
    let isMultiPath = false;

    for (const context of contextList) {
        if (matchSingleStringPath(context, uri)) {
            isMultiPath = true;
            break;
        }
    }

    return isMultiPath;
}

/**
 * Parses URI and returns RFC 3986 path
 *
 * @param  {String} uri from req.url
 * @return {String}     RFC 3986 path
 */
function getUrlPathName(uri) {
    return uri && url.parse(uri).pathname;
}

function isStringPath(context) {
    return typeof context === 'string' && !isGlob(context);
}

function isGlobPath(context) {
    return isGlob(context);
}
