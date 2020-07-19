const connection = require('../database/connection');
const {roles} = require('./roles');

module.exports = {
    async treatUser(req, res, next) {
        const providerUserId = req.user.id;
        const userDisplayName = req.user.displayName;
        const userEmail = req.user.emails[0].value;
        const provider = req.user.provider;
        console.log(`${provider} | ${providerUserId} | ${userDisplayName} | ${userEmail} | ${roles.NONE}`)

        //Verifica se o usuário já existe
        const user = await connection('users')
        .where({
            'provider': provider,
            'provider_user_id': providerUserId
        })
        .select([
            'users.*'
        ]);

        console.log(user);

        if (!user[0]){
            console.log(`Usuário não existe`);
            const [id] = await connection('users').insert({
                provider: provider,
                provider_user_id: providerUserId,
                name: userDisplayName,
                email: userEmail,
                role: roles.NONE
            })
            .catch(error => { 
                console.log('caught', error.message); 
            });
            req.user.id = id;
            req.user.role = roles.NONE;
            req.user.providerUserId = providerUserId;
        } else {
            //console.log('Usuário existe');
            req.user.id = user[0].id;
            req.user.role = user[0].role;
            req.user.providerUserId = providerUserId;
        }

        if (req.user.role == roles.NONE){
            return res.status(403).send({message: 'User not authorized'});
        } else {
            next();
        }
    },
}