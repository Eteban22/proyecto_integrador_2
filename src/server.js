// Importar módulo express
const express = require('express');
const { desconnectDB, connectToCollection, generateCode } = require('../connection_db.js');
const server = express();

server.use(express.json());
server.use(express.urlencoded({ extended: true }));

// Middleware para validar y convertir valores numéricos
const validateNumericFields = ((req, res, next) => {
    const { precio } = req.body;
    const { codigo } = req.params;
    if (precio && isNaN(Number(precio))) {
        return res.status(400).send(JSON.stringify({ message: 'El precio debe ser un número válido.' }));
    }
    req.priceNumber = Number(precio);
    req.codeNumber = Number(codigo);
    next();
});

// Obtener todos los muebles
server.get('/api/v1/muebles', async (req, res) => {
    const { categoria, precio_gte, precio_lte } = req.query;
    const categoriaRegex = { $regex: categoria, $options: 'i' };
    const precio_gte_Number = Number(precio_gte);
    const precio_lte_Number = Number(precio_lte);
    let muebles = [];
    try {
        const collection = await connectToCollection('muebles');
        if (categoria) muebles = await collection.find({ categoria: categoriaRegex }).sort({ nombre: 1 }).toArray();
        else if (precio_gte) muebles = await collection.find({ precio: { $gte: precio_gte_Number } }).sort({ precio: 1 }).toArray();
        else if (precio_lte) muebles = await collection.find({ precio: { $lte: precio_lte_Number } }).sort({ precio: -1 }).toArray();
        else muebles = await collection.find().toArray();
        res.status(200).send(JSON.stringify({ payload: muebles }));
    } catch (error) {
        console.log(error.message);
        res.status(500).send(JSON.stringify({ message: 'Se ha generado un error en el servidor' }));
    } finally {await desconnectDB()}
});

// Obtener un mueble por código
server.get('/api/v1/muebles/:codigo', validateNumericFields, async (req, res) => {
    try {
        const collection = await connectToCollection('muebles');
        const mueble = await collection.findOne({ codigo: req.codeNumber });
        if (!mueble) return res.status(400).send(JSON.stringify({ message: 'El código no corresponde a un mueble registrado' }));
        res.status(200).send(JSON.stringify({ payload: mueble }));
    } catch (error) {
        console.log(error.message);
        res.status(500).send(JSON.stringify({ message: 'Se ha generado un error en el servidor' }));
    } finally {await desconnectDB() }
});

// Crear mueble.
server.post('/api/v1/muebles', validateNumericFields, async (req, res) => {
    const { nombre, precio, categoria } = req.body;
    if (!nombre || !precio || !categoria) {
        return res.status(400).send(JSON.stringify({ message: 'Faltan datos relevantes' }));
    } try {
        const collection = await connectToCollection('muebles');
        const mueble = {
            codigo: await generateCode(collection),
            nombre,
            precio: req.priceNumber,
            categoria
        };
        await collection.insertOne(mueble);
        res.status(201).send(JSON.stringify({ message: 'Registro creado', payload: mueble }));
    } catch (error) {
        console.log(error.message);
        res.status(500).send(JSON.stringify({ message: 'Se ha generado un error en el servidor' }));
    } finally {await desconnectDB()}
});

// Actualizar un mueble por código.
server.put('/api/v1/muebles/:codigo', validateNumericFields, async (req, res) => {
    const { nombre, precio, categoria } = req.body;
    if (!nombre || !precio || !categoria) return res.status(400).send(JSON.stringify({ message: 'Faltan datos relevantes' }));
    if (req.priceNumber <= 0) {
        return res.status(400).send(JSON.stringify({ message: 'El precio debe ser un número positivo.' }));
    }
    try {
        const collection = await connectToCollection('muebles');
        let mueble = await collection.findOne({ codigo: { $eq: req.codeNumber } });
        if (!mueble) {
            return res.status(400).send(JSON.stringify({ message: 'El código no corresponde a un mueble registrado' }));
        }
        mueble = {
            codigo: req.codeNumber,
            nombre,
            precio: req.priceNumber,
            categoria
        };
        await collection.updateOne({ codigo: req.codeNumber }, { $set: mueble });
        res.status(200).send(JSON.stringify({ message: 'Registro actualizado', payload: mueble }));
    } catch (error) {
        console.log(error.message);
        res.status(500).send(JSON.stringify({ message: 'Se ha generado un error en el servidor' }));
    } finally {await desconnectDB()}
});

// Eliminar una mueble por código.
server.delete('/api/v1/muebles/:codigo', validateNumericFields, async (req, res) => {
    try {
        const collection = await connectToCollection('muebles');
        const mueble = await collection.findOne({ codigo: { $eq: req.codeNumber } });
        if (!mueble) {
            res.status(400).send(JSON.stringify({ message: 'El código no corresponde a un mueble registrado' }));
        } else {
            await collection.deleteOne({ codigo: { $eq: req.codeNumber } });
            res.status(200).send(JSON.stringify({ message: 'Registro eliminado' }));
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send(JSON.stringify({ message: 'Se ha generado un error en el servidor' }));
    } finally {await desconnectDB()}
});

// Control de rutas inexistentes.
server.use('*', (req, res) => {
    res.status(404).send(`<h1>Error 404</h1><h3>La URL indicada no existe en este servidor</h3>`);
});

// Escucha del servidor.
server.listen(process.env.SERVER_PORT, process.env.SERVER_HOST, () => {
    console.log(`Ejecutandose en http://${process.env.SERVER_HOST}:${process.env.SERVER_PORT}/api/v1/muebles`);
});