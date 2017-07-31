var crypto = require('crypto');
/**
 * A set of urls required by the app for verification, resetting password, etc 
 * for different app environments.
 * 
 * If null is provided, these are gotten from the project's package.json file.
 * 
 * Keys are the possible environment the app would run on e.g. development
 * The value of the keys is an object with keys:
 * - client: The web client root url
 * - server: The server url on which this app is hosted
 * - resetPassword: The url to the page where passwords will be reset
 * - verifyEmailFailed: The url to redirect to when email verification fails
 * - verifiedEmailAlready: The url to redirect to when an email that has already been verified is retried
 * - verifyEmailSuccess: The url to redirect to when email verification succeeds
 * @type Object
 */
var APP_URLS = null;
/**
 * Keys include sandbox (boolean), key (string), fromAddress (string)
 * @type object
 */
var SPARKPOST = null;

// ----------------------- DO NOT EDIT BELOW THIS LINE -------------------------

/**
 * Evaluates the value of a config path
 * @see ctx.getConfig()
 * @returns {mixed}
 */
ctx.__proto__.evalConfig = function (path, def, appConfig) {
    var value = ctx.getConfig(path, def, appConfig);
    try {
        return eval(value);
    }
    catch (e) {
        console.error('Eval "' + value + '" failed: ' + e);
        return def;
    }
};
/**
 * The app config object
 * @var {object}
 */
ctx.__proto__.appConfig = require('../../app-config.json');
/**
 * The config object the target resource
 * @var {object}
 */
ctx.__proto__.resourceConfig = resource && dpd[resource] ? dpd[resource].getResource().config : {};
/**
 * Fetches the value of the given path from the config
 * @param string path The path to the desired value. Children paths should be joined by dot (.)
 * @param mixed def The default value if the value does not exist in the config
 * @param boolean|string appConfig Indicates whether to get the value from the 
 * appConfig (TRUE) or the resourceConfig (FALSE). If string, it is the resource from
 * which to fetch the value
 * E.g. properties.fullName.required
 */
ctx.__proto__.getConfig = function (path, def, appConfig) {
    // split path by .
    var parts = path.split('.');
    // set result has the whole config
    if (typeof appConfig === 'string')
        // appConfig is string, therefore a resource name: load config for it.
        result = dpd[appConfig] ? dpd[appConfig].getResource().config : null;
    else // appConfig is boolean
        result = appConfig ? this.appConfig : this.resourceConfig;
    while (parts.length && result) {
        result = typeof result === 'object' ? result[parts.shift()] : null;
    }
    return !result && result != 0 ? def : result;
};
/**
 * The app urls for the type of server being run
 * @type {object}
 */
ctx.__proto__.appUrls = APP_URLS || ctx.getConfig('middleware.urls.' + ctx.server.options.env, {}, true);

// Utility methods
ctx.__proto__.utils = {
    /**
     * Sends an email with SparkPost Transmission API
     * @param {object} config Keys include key (string), sandbox (boolean) and
     * fromAddress (string)
     * @param {object} options Keys include:
     * recipients (array): Array of object with keys address and ...
     * subject (string): The subject of the email
     * body (string): The html content to send
     * bodyVariables (object): The variables to parse the body with
     * callback (Function): The callback to call with 2 params: result, error
     * @returns {Promise}
     */
    sendmail: function (options, config) {
        config = config || SPARKPOST || ctx.getConfig('middleware.sparkpost', {}, true);
        options.bodyVariables = options.bodyVariables || {};
        options.callback = options.callback || function () { };
        var SP = require('sparkpost'),
            sparkpost = new SP(config.key),
            utils = this;
        console.log('Send email [' + options.subject + ']:');
        return sparkpost.transmissions.send({
            options: {
                sandbox: config.sandbox
            },
            content: {
                from: config.fromAddress,
                subject: options.subject,
                html: utils.parse(options.body, options.bodyVariables)
            },
            recipients: options.recipients
        })
            .then(data => {
                console.log('Success!', data);
                options.callback(null);
            })
            .catch(err => {
                err = {
                    statusCode: err.statusCode,
                    errors: err.errors
                };
                // remove unnecessary info
                console.error('Error!', err);
                options.callback(null, err);
            });
    },
    /**
     * Fetches the mongodb's collection object
     * @param  {object} collection e.g. dpd.users
     * @returns {Promise}
     */
    mongo: function (collection) {
        return collection.getResource().store.getCollection();
    },
    /**
     * Parse the given content with the given variables
     * @param {string} content
     * @param {object} variables
     * @returns {string}
     */
    parse: function (content, variables) {
        for (var key in variables) {
            content = content.replace(new RegExp('{{' + key + '}}', 'g'), variables[key]);
        }
        return content;
    },
    /**
     * Redirects to the given url
     * @param {object} ctx The ctx object
     * @param {string} url The url to redirect to
     * @returns {void}
     */
    redirect: function (ctx, url) {
        ctx.res.statusCode = 302;
        ctx.res.setHeader("Location", url);
        ctx.res.end();
    }
};

/**
 * Gets the full user object
 * @param {function} callback
 * @retuns {Promise}
 */
ctx.__proto__.me = function (callback) {
    if(ctx.session.data.uid){
        dpd.users.getResource().store.find({id: ctx.session.data.uid}, function(err, user) {
            if (err) {
                callback(null);
            }
            var userHash = user ? crypto.createHash('md5').update(user.username + user.password).digest('hex') : null;
            if (ctx.session.data.userhash === userHash) {
                delete user.password;
                callback(user);
            } else {
                callback(null);
            }
        });
    } else {
        callback(null);
    }
};