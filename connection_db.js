//Importo módulos
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const client = new MongoClient(process.env.DATABASE_URL);

//Función para conectar a MongoDB.
async function connectToDB() {
    console.log('\tConectando a la base de datos...');
    try {
        const connection = await client.connect();
        console.log('Se conecto correctamente');
        return client;
    } catch (error) {
        console.log('No se pudo establecer conexión a la base de datos');
    }
    return null;
};

//Función para desconectar de MongoDB.
async function desconnectDB() {
    try {
        await client.close();
        console.log('\tDesconectado de la base de datos');
    } catch (error) {
        console.log('No se a desconectado...');
    };
};

//Función para conectar la colección.
async function connectToCollection(collectionName) {
    const connection = await connectToDB();
    const db = connection.db(process.env.DATABASE_NAME);
    const collection = db.collection(collectionName);
    return collection;
};

//Función para generar un nuevo código.
async function generateCode(collection) {
    const maxCode = await collection.find().sort({ codigo: -1 }).limit(1).toArray();
    const newMaxCode = maxCode[0]?.codigo ?? 0;
    return newMaxCode + 1;
};

//Exportar funciones.
module.exports = { desconnectDB, connectToCollection, generateCode };