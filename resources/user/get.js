switch (parts[0]) {
    // without JWT token
    case 'verify-email': // http
        if (parts.length < 2) {
            ctx.utils.redirect(ctx, ctx.appUrls.client + ctx.appUrls.verifyEmailFailed);
        }
        else {
            dpd.users.get({
                verificationToken: parts[1]
            }, function (users, error) {
                if (users.length) {
                    if (users[0].verified) {
                        ctx.utils.redirect(ctx, ctx.appUrls.client + ctx.appUrls.verifiedEmailAlready);
                    }
                    else {
                        dpd.users.put(users[0].id, {
                            verified: true
                        }, function (user, error) {
                            if (!user)
                                ctx.utils.redirect(ctx, ctx.appUrls.client + ctx.appUrls.verifyEmailFailed);
                            else
                                ctx.utils.redirect(ctx, ctx.appUrls.client + ctx.appUrls.verifyEmailSuccess);
                        });
                    }
                }
                else {
                    ctx.utils.redirect(ctx, ctx.appUrls.client + ctx.appUrls.verifyEmailFailed);
                }
            });
        }
        break;
        // with JWT token
    case 'me':
        ctx.me(setResult);
        break;
    default:
        cancel('Not Implemented', 501);
}