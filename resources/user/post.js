switch (parts[0]) {
    case 'change-password':
        cancelUnless(body.newPassword === body.confirm, 'Passwords mismatch!');
        // get user
        ctx.me(function (user) {
            // check old password is correct
            dpd.users.login({
                username: user.username,
                password: body.oldPassword
            }, function (session, err) {
                if (!session)
                    setResult(null, 'Incorrect old password!');
                // Update password
                dpd.users.put(user.id, {
                    password: body.newPassword
                }, setResult);
            });
        });
        break;
    case 'resend-verification-email': // ajax
        cancelUnless(body.email, 'Email must be specified!');

        // get user with email as username
        dpd.users.get({ username: body.email }, function (users) {
            cancelUnless(users && users.length, 'No account found for that email!');
            cancelIf(users[0].verified, 'Account has already been verified!');
            // get template file
            dpd.template.post({ "template": 'verify-email.html' }, function (
                data) {
                // send email
                ctx.utils.sendmail({
                    recipients: [{ address: users[0].username }],
                    subject: 'Verify your email for '
                    + ctx.getConfig('name', 'Seed', true),
                    body: data.html,
                    bodyVariables: {
                        appName: ctx.getConfig('name', 'Seed', true),
                        link: ctx.appUrls.server + '/user/verify-email/' + users[0].verificationToken
                    },
                    callback: setResult
                });
            });
        });
        break;
    case 'reset-password': // ajax
        cancelUnless(body.password.trim(), 'Password is required!');
        cancelUnless(body.token, 'Invalid token!');
        cancelUnless(body.password === body.confirm);
        // get user with token
        dpd.users.get({ passwordToken: body.token }, function (users) {
            cancelUnless(users.length, 'Invalid token!');
            var user = users[0];
            // update user with new password and remove token
            dpd.users.put(user.id, {
                password: body.password,
                passwordToken: null
            }, setResult);
        });
        break;
    case 'send-password-reset-email': // ajax
        cancelUnless(body.email, 'Email must be specified!');

        var hash = require('string-hash'),
            token = hash(body.email + Date.now()) + 'T' + Date.now();

        // get user with email as username
        dpd.users.get({ email: body.email }, function (users) {
            cancelUnless(users.length, 'No account found for that email!');
            // save token
            dpd.users.put(users[0].id, { passwordToken: token }, function (
                user, error) {
                // reset url
                var url = ctx.appUrls.client + ctx.appUrls.resetPassword;
                if (url.indexOf('?') !== -1) {
                    url += '&';
                }
                else {
                    url += '?';
                }
                url += 'token=' + token;
                // get template file
                dpd.template.post({ "template": 'reset-password.html' }, function (data) {
                    // send email
                    ctx.utils.sendmail({
                        recipients: [{ address: user.email }],
                        subject: 'Reset Password for ' + ctx.getConfig('name', 'Seed', true),
                        body: data.html,
                        bodyVariables: {
                            appName: ctx.getConfig('name', 'Seed', true),
                            link: url
                        },
                        callback: setResult
                    });
                });
            });
        });
        break;
    case 'update-info':
        delete body.passwordToken;
        delete body.lastLogin;
        cancelIf(body.hasOwnProperty('firstName') && !body.firstName, 'First name cannot be empty!');
        cancelIf(body.hasOwnProperty('lastName') && !body.lastName, 'Last name cannot be empty!');
        dpd.users.put(ctx.user.id, body, setResult);
        break;
    case 'update':
        dpd.users.put(body.id, body, function(user){
            delete user.passwordToken;
            delete user.question;
            delete user.verificationToken;
            //setResult(null, user);
            ctx.done(null, user);
        });
        break;
    case 'delete-account':
        // cancel if provided id is not the same as the user id in token payload
        cancelIf(body.id !== ctx.user.id, 'Invalid action!');
        // get the user
        dpd.users.get(body.id, function (user) {
            // if account was not created by social login
            cancelIf(!user.profile && (!body.password || !body.email), 'Email and password must be provided!');
            if (body.password) {
                login({ email: user.email, password: body.password }, function (session, err) {
                    if (!session)
                        setResult(null, err);
                    dpd.users.del(user.id, setResult);
                });
            }
        });
        break;
    default:
        cancel('Not Implemented', 501);
}