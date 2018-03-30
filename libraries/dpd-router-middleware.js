module.exports = function (Router, accountresource) {
    var middleware = function (req, res, next) {

        var resources = process.server.resources;
        if (!resources || !res) return next();

        var resource = resources.find(function (r) {
            return r.name == accountresource;
        });
        var error = function (msg) {
            console.error(msg);
            if (!res.send) return next(); // weird edgecase
            res.status(400).send({code: 400, message: msg});
        };
        if (!resource)
            return error("dpd-global-events: resource '" + accountresource + "' not found :(");

        var Context = require('deployd/lib/context');
        var ctx = new Context(resource, req, res, process.server);

        resource.handle(ctx, next);
    };

    var route = Router.prototype.route;
    Router.prototype.route = function (req, res) {
        var args = arguments;
        var me = this;
        middleware(req, res, function () {
            return route.apply(me, args);
        });
    };
};
