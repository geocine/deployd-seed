var hash = require('string-hash');

this.loginAttempts = 0;
this.blocked = false;
this.verified = false;

if(me){
    if(me.type == 'admin'){
        this.verified = true;
    }
} else {
    this.verificationToken = hash(this.username + Date.now()) + 'T' + Date.now();
    dpd.template.post({"template": 'verify-email.html'}, function (data) {
        ctx.utils.sendmail({
            recipients: [{address: this.email}],
            subject: 'Verify your email for ' + ctx.getConfig('name', 'Sed', true),
            body: data.html,
            bodyVariables: {
                appName: ctx.getConfig('name', 'Seed', true),
                link: ctx.appUrls.server + '/user/verify-email/' + this.verificationToken
            }
        });
    });
}