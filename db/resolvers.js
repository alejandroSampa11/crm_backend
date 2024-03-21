const Usuario = require('./../models/Usuario.js')
const Producto = require('../models/Producto.js')
const Cliente = require('../models/Cliente.js')
const Pedido = require('../models/Pedido.js')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config({ path: 'variables.env' })
const crearToken = (usuario, secreta, expiresIn) => {
    // console.log(usuario)
    const { id, email, nombre, apellido } = usuario
    return jwt.sign({ id, email, nombre, apellido }, secreta, { expiresIn })
}

//RESOLVERS
const resolvers = {
    Query: {
        obtenerUsuario: async (_, {},ctx) => {
            // const usuarioId = await jwt.verify(token, process.env.SECRETA)
            // return usuarioId;
            return ctx.usuario;
        },
        obtenerProductos: async () => {
            try {
                const productos = await Producto.find({})
                return productos
            } catch (error) {
                console.log(error)
            }
        },
        obtenerProducto: async (_, { id }) => {
            //REVISRA SI EL PRODUCTO EXISTE
            const producto = await Producto.findById(id)
            if (!producto) {
                throw new Error('Producto No Encontrado')
            }

            return producto;
        },
        obtenerClientes: async () => {
            try {
                const clientes = await Cliente.find({})
                return clientes
            } catch (error) {
                console.log(error)
            }
        },
        obtenerClientesVendedor: async (_, { }, ctx) => {
            try {
                const clientes = await Cliente.find({ vendedor: ctx.usuario.id })
                return clientes
            } catch (error) {
                console.log(error)
            }
        },
        obtenerCliente: async (_, { id }, ctx) => {
            //REVISAR SI EL CLIENTE EXISTE O NO
            const cliente = await Cliente.findById(id);
            if (!cliente) {
                throw new Error('Cliente No Encontrado')
            }
            //QUIEN LO CREO PUEDE VERLO
            if (cliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No Tienes Las Credenciales')
            }
            return cliente;
        },
        obtenerPedidos: async()=>{
            try {
                const pedidos = await Pedido.find({})
                return pedidos
            } catch (error) {
                console.log(error)
            }
        },
        obtenerPedidosVendedor: async(_,{},ctx)=>{
            try {
                const pedidos = await Pedido.find({vendedor: ctx.usuario.id}).populate('cliente')
                // console.log(pedidos)
                return pedidos
            } catch (error) {
                console.log(error)
                
            }
        },
        obtenerPedido: async(_,{id},ctx)=>{
            //REVISAR SI EXISTE ESE PEDIDO
            const pedido = await Pedido.findById(id);
            if(!pedido){
                throw new Error('Pedido No Encontrado')
            }
            //SOLO QUIEN LO CREO PUEDE VERLO
            if(pedido.vendedor.toString() !== ctx.usuario.id){
                throw new Error('No tiene las credenciales')
            }

            //RETORNAR EL PEDIDO
            return pedido
        },
        obtenerPedidosEstado: async(_,{estado},ctx)=>{
            //REVISAR SI EXISTE ESE PEDIDO
            const pedidos = await Pedido.find({vendedor: ctx.usuario.id, estado});            
            return pedidos
        },
        mejoresClientes: async()=>{
            const clientes = await Pedido.aggregate([
                { $match : {estado: "COMPLETADO"}},
                {$group: {
                    _id: "$cliente",
                    total:{$sum: '$total'}
                }},
                {
                    $lookup:{
                        from: 'clientes',
                        localField: '_id',
                        foreignField:'_id',
                        as: "cliente"
                    }
                },
                {
                    $sort : {total:-1}
                }
            ]);
            return clientes;
        },
        mejoresVendedores: async()=>{
            const vendedores = await Pedido.aggregate([
                {$match: {estado: "COMPLETADO"}},
                {$group:{
                    _id:"$vendedor",
                    total: {$sum: '$total'}
                }},
                {
                    $lookup:{
                        from: 'usuarios',
                        localField: '_id',
                        foreignField:'_id',
                        as: 'vendedor'
                    }
                },
                {
                    $limit : 3
                },
                {
                    $sort : {total:-1}
                }
            ]);
            return vendedores;
        },
        buscarProducto: async(_,{texto})=>{
            const productos = await Producto.find({$text: {$search: texto}}).limit(10)
            return productos
        }
    },
    Mutation: {
        nuevoUsuario: async (_, { input }) => {
            const { email, password } = input;
            //REVISAR SI EL USUARIO YA ESTA REGISTRADO
            const existeUsuario = await Usuario.findOne({ email });
            // console.log(existeUsuario)
            if (existeUsuario) {
                throw new Error('El Usuario ya está registrado');
            }
            //HASHEAR PASSWORD
            const salt = await bcryptjs.genSaltSync(10);
            input.password = await bcryptjs.hashSync(password, salt);

            try {
                //GUARDARLO EN LA BD
                const usuario = new Usuario(input);
                usuario.save();
                return usuario;
            } catch (error) {
                console.log(error)
            }
        },
        autenticarUsuario: async (_, { input }) => {
            const { email, password } = input
            //SI EL USUARIO EXISTE
            const existeUsuario = await Usuario.findOne({ email });
            if (!existeUsuario) {
                throw new Error('El Usuario No Existe');
            }
            //REVISAR SI EL PASSWORD ES CORRECTO
            const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password);
            if (!passwordCorrecto) {
                throw new Error('Password Incorrecto');
            }

            //CREAR TOKEN
            return {
                token: crearToken(existeUsuario, process.env.SECRETA, '24h')
            }
        },
        nuevoProducto: async (_, { input }) => {
            try {
                const producto = new Producto(input)
                //GUARDAR EN LA BD
                const resultado = await producto.save()
                return resultado
            } catch (error) {
                console.log(error)
            }
        },
        actualizarProducto: async (_, { id, input }) => {
            //REVISRA SI EL PRODUCTO EXISTE
            let producto = await Producto.findById(id)
            if (!producto) {
                throw new Error('Producto No Encontrado')
            }

            //GUARDAR EN LA BASE DE DATOS
            producto = await Producto.findOneAndUpdate({ _id: id }, input, { new: true });
            return producto
        },
        eliminarProducto: async (_, { id }) => {
            //REVISRA SI EL PRODUCTO EXISTE
            let producto = await Producto.findById(id)
            if (!producto) {
                throw new Error('Producto No Encontrado')
            }
            //ELIMINAR 
            await Producto.findOneAndDelete({ _id: id });
            return "Producto Eliminado"
        },
        nuevoCliente: async (_, { input }, ctx) => {
            // console.log(ctx);
            const { email } = input
            //VERIFICAR SI EL CLIENTE YA ESTA REGISTRADO
            // console.log(input)
            const cliente = await Cliente.findOne({ email })
            if (cliente) {
                throw new Error('Cliente Ya Registrado')
            }

            const nuevoCliente = new Cliente(input);
            //ASIGNAR EL VENDEDOR
            nuevoCliente.vendedor = ctx.usuario.id;
            //GUARDARLO EN LA BD
            try {
                const resultado = await nuevoCliente.save()
                return resultado;
            } catch (error) {
                console.log(error)
            }
        },
        actualizarCliente: async (_, { id, input }, ctx) => {
            //VERIFICAR SI EXISTE O NO
            let cliente = await Cliente.findById(id)
            if (!cliente) {
                throw new Error("El Cliente No Existe")
            }
            //VERIFIFCAR SI EL VENDEDOR ES EL QUE EDITA
            if (cliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No Tienes Las Credenciales')
            }
            //GUARDAR EL CLIENTE
            cliente = await Cliente.findOneAndUpdate({ _id: id }, input, { new: true })
            return cliente;
        },
        eliminarCliente: async (_, { id }, ctx) => {
            //VERIFICAR SI EXISTE O NO
            let cliente = await Cliente.findById(id)
            if (!cliente) {
                throw new Error("El Cliente No Existe")
            }
            //VERIFIFCAR SI EL VENDEDOR ES EL QUE EDITA
            if (cliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No Tienes Las Credenciales')
            }
            //ELIMINAR CLIENTE
            await Cliente.findOneAndDelete({ _id: id })
            return "Cliente Eliminado"
        },
        nuevoPedido: async (_, { input }, ctx) => {
            const { cliente, pedido } = input;
            // console.log(pedido[0].cantidad)
            //VERIFICAR SI EL CLIENTE EXISTE
            let clienteExiste = await Cliente.findById(cliente);
            if (!clienteExiste) {
                throw new Error("El Cliente No Existe")
            }
            //SI EL CLIENTE ES DEL VENDEDOR
            if (clienteExiste.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No Tienes Las Credenciales')
            }   

            //REVISAR QUE EL STOCK ESTE DISPONIBLE
            for await(const articulo of pedido){
                const {id} = articulo
                const producto = await Producto.findById(id)
                if(articulo.cantidad > producto.existencia){
                    throw new Error(`El Articulo ${producto.nombre} excede la cantidad disponible`)
                }else{
                    //RESTAR LA CANTIDAD A LO DISPONIBLE
                    producto.existencia = producto.existencia -articulo.cantidad;
                    await producto.save();
                }
            };

            //CREAR UN NUEVO PEDIDO
            const nuevoPedido = new Pedido(input)

            //ASIGNARLE UN VENDEDOR
            nuevoPedido.vendedor = ctx.usuario.id

            //GUARDAR EN LA BASE DE DATOS
            const resultado = await nuevoPedido.save();
            return resultado;
        },
        actualizarPedido: async(_,{id, input},ctx)=>{
            const {cliente, pedido} = input
            //REVISAR SI EL PEDIDO EXISTE
            const existePedido = await Pedido.findById(id)
            if(!existePedido){
                throw new Error('Pedido No Encontrado')
            }
            //SI EL CLIENTE NO EXISTE
            const existeCliente = await Cliente.findById(cliente)
            if(!existeCliente){
                throw new Error('Cliente No Encontrado')
            }

            //SI EL CLIENTE Y PEDIDO PERTENECE AL VENDEDOR
            if(existeCliente.vendedor.toString() !== ctx.usuario.id){
                throw new Error('No Tienes Las Credenciales')
            }
            //REVISAR EL STOCK
            // for await(const articulo of pedido){
            //     const {id, cantidad} = articulo
            //     const producto = await Producto.findById(id)
            //     if(articulo.cantidad > producto.existencia){
            //         throw new Error(`El Articulo ${producto.nombre} excede la cantidad disponible`)
            //     }else{
            //         //RESTAR LA CANTIDAD A LO DISPONIBLE
            //         const newProdArray = existePedido.pedido.filter(producto=> producto.id == articulo.id)
            //         const p = newProdArray[0];
            //         let diferencia = articulo.cantidad - p.cantidad;
            //         producto.existencia -= diferencia;
            //         await producto.save()
            //     }
            // };

            //GUARDAR EL PEDIDO
            const resultado = await Pedido.findOneAndUpdate({_id: id}, input,{new: true})
            return resultado
        },
        eliminarPedido: async(_,{id},ctx)=>{
            //REVISAR SI EL PEDIDO EXISTE
            const existePedido = await Pedido.findById(id);
            if(!existePedido){
                throw new Error("Pedido No Encontrado")
            }
            
            if(existePedido.vendedor.toString() !== ctx.usuario.id){
                throw new Error("No Tienes Las Credenciales")
            }

            await Pedido.findOneAndDelete({_id: id})
            return "Pedido Eliminado"

        }
    }

}

module.exports = resolvers