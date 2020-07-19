const environment = process.env.NODE_ENV || 'development';

module.exports = {
    async checkHttps(req, res, next) {
        if( environment !== 'development' && req.headers['x-forwarded-proto'] !== 'https') {
            return res.status(403).send({message: 'SSL required'});
        }
        // allow the request to continue
        next();
    },
}