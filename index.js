const express = require('express');
const app = express();
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const { createRemoteJWKSet } = require('jose-cjs');
const { jwtVerify } = require('jose-cjs');


app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

if (!uri) {
    console.error('MONGODB_URI is not set. Add it to your environment variables.');
}

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

const JWKS = createRemoteJWKSet(
    new URL('https://sport-nest-zabedfolio.vercel.app/api/auth/jwks')
)

const verifyToken = async(req, res, next) => {
    const authHeader = req?.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try{
        const { payload } = await jwtVerify(token, JWKS);
    console.log('Token payload:', payload);
    next();
    } catch (err) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    
}

let dbPromise;

function getDb() {
    if (!uri) {
        return Promise.reject(new Error('MONGODB_URI is not configured'));
    }
    if (!dbPromise) {
        dbPromise = client.connect().then(() => {
            console.log('Connected to MongoDB');
            return client.db('SportNest');
        });
    }
    return dbPromise;
}

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.get('/facilities', async (req, res) => {
    try {
        const db = await getDb();
        const facilityCollection = db.collection('facilities');
        const { search, type } = req.query;
        const query = {};

        if (search) {
            query.facilityName = { $regex: search, $options: 'i' };
        }

        if (type && type !== 'all') {
            query.facilityType = { $in: type.split(',') };
        }

        const result = await facilityCollection.find(query).toArray();
        res.send(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch facilities' });
    }
});

app.post('/facilities', async (req, res) => {
    try {
        const db = await getDb();
        const facilityCollection = db.collection('facilities');
        const result = await facilityCollection.insertOne(req.body);
        res.send(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create facility' });
    }
});

app.get('/facilities/:id', async (req, res) => {
    try {
        const db = await getDb();
        const facilityCollection = db.collection('facilities');
        const result = await facilityCollection.findOne({
            _id: new ObjectId(req.params.id),
        });
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch facility' });
    }
});

app.patch('/facilities/:id', async (req, res) => {
    try {
        const db = await getDb();
        const facilityCollection = db.collection('facilities');
        const result = await facilityCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: req.body },
        );
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update facility' });
    }
});

app.delete('/facilities/:id', async (req, res) => {
    try {
        const db = await getDb();
        const facilityCollection = db.collection('facilities');
        const result = await facilityCollection.deleteOne({
            _id: new ObjectId(req.params.id),
        });
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete facility' });
    }
});

app.post('/bookings', async (req, res) => {
    try {
        const db = await getDb();
        const bookingCollection = db.collection('bookings');
        const result = await bookingCollection.insertOne(req.body);
        res.send(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create booking' });
    }
});

app.get('/bookings/:userId', async (req, res) => {
    try {
        const db = await getDb();
        const bookingCollection = db.collection('bookings');
        const result = await bookingCollection
            .find({ userId: req.params.userId })
            .toArray();
        res.send(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch bookings' });
    }
});

app.delete('/bookings/:bookingId', async (req, res) => {
    try {
        const db = await getDb();
        const bookingCollection = db.collection('bookings');
        const result = await bookingCollection.deleteOne({
            _id: new ObjectId(req.params.bookingId),
        });
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete booking' });
    }
});

if (require.main === module) {
    getDb()
        .then(() => client.db('admin').command({ ping: 1 }))
        .then(() => console.log('Pinged your deployment. You successfully connected to MongoDB!'))
        .catch(console.error);

    app.listen(PORT, () => {
        console.log(`${PORT} is running`);
    });
}

module.exports = app;
