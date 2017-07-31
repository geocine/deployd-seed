var _ = require('lodash');

if (success) {
    dpd.users.put(me.id, {
        loginAttempts: 0,
        $skipEvents: true
    });
    cancelUnless(!me.blocked, 'Your account has been blocked', 400);
    cancelUnless(me.verified, 'Please check your email to activate your account', 400);
} else {
    var maxLoginAttempts = ctx.getConfig('maxLoginAttempts', 0, true);
    if (me && !me.blocked && maxLoginAttempts > 0) {
        if (!_.has(me, 'loginAttempts')) {
            me.loginAttempts = 0;
        }
        var loginAttempts = me.loginAttempts + 1;
        var remaining = (maxLoginAttempts + 1) - loginAttempts;
        if (remaining > 0) {
            dpd.users.put(me.id, {
                loginAttempts: { $inc: 1 },
                $skipEvents: true
            }, function (val, err) {
                cancel('You have ' + remaining + ' remaining login attempts', 400);
            });
        } else {
            dpd.users.put(me.id, {
                blocked: true,
                $skipEvents: true
            }, function (val, err) {
                cancel('Your account has been blocked', 400);
            });
        }
    }
    if(me) {
        cancelUnless(!me.blocked, 'Your account has been blocked', 400);
    } else {
        cancel(`The username that you've entered doesn't match any account`);
    }
}
