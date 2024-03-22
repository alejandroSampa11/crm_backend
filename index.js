const {ApolloServer} = require('apollo-server')
const typeDefs = require('./db/schema.js')
const resolvers = require('./db/resolvers.js')
const conectarDB = require('./config/db.js')
const jwt = require('jsonwebtoken')
require('dotenv').config({path: 'variables.env'})


//CONECTAR A LA BASE DE DATOS
conectarDB();


//SERVIDOR
const server = new ApolloServer({
    typeDefs, 
    resolvers,
    context: ({req})=>{
        //console.log(req.headers['authorization'])
        // console.log(req.headers)
        const token = req.headers['authorization'] || '';
        if(token){
            try {
                const usuario = jwt.verify(token.replace('Bearer ',''), process.env.SECRETA)
                //console.log(usuario)
                return{
                    usuario
                } 
            } catch (error) {
                console.log('Hubo un Error')
                console.log(error)
            }
        }
    }
});

//ARRANCAR SERVIDOR
server.listen().then(({url})=>{
    console.log(`Servidor Listo en la URL ${url}`)
})