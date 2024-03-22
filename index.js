const {ApolloServer} = require('apollo-server-express')
const typeDefs = require('./db/schema.js')
const resolvers = require('./db/resolvers.js')
const conectarDB = require('./config/db.js')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const express = require('express');
require('dotenv').config({path: 'variables.env'})

const app = express();

// Aplicar cors a la aplicación express
app.use(cors());

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



server.start().then(() => {
    // Aplicar el servidor Apollo a la aplicación express
    server.applyMiddleware({ app });

    // Iniciar el servidor Express
    app.listen({ port: process.env.PORT || 4000 }, () =>
       console.log(`🚀 Server ready at http://localhost:${process.env.PORT || 4000}${server.graphqlPath}`)
    );
}).catch(err => {
    console.log('Error starting server: ', err);
});
// ARRANCAR SERVIDOR
//  server.listen().then(({url})=>{
//      console.log(`Servidor Listo en la URL ${url}`)
//  })
