const express = require('express')
const app = express()
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');

app.use(cors());
app.use(express.json());
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const db = client.db("SportNest");
    const facilityCollection = db.collection("facilities");

    app.get('/facilities', async (req, res) => {
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
    });

    app.post('/facilities', async (req, res) => {
        const facilityData = req.body;
        const result = await facilityCollection.insertOne(facilityData);
        res.send(result);
    });

    app.get('/facilities/:id', async (req, res) => {
        const { id } = req.params;
        const result = await facilityCollection.findOne({
             _id: new ObjectId(id) 
            });
        res.json(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.listen(PORT, () => {
    console.log(`${PORT} is running`);
});