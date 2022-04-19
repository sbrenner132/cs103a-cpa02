import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
const mongo_URI = `mongodb+srv://sbrenner:${process.env.MONGO_SECRET}@cluster0.uhhej.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const db = mongoose.connection;

mongoose.connect(mongo_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
db.on('error', console.error.bind(console, 'mongoose connection error'));
db.on('open', () => loadTestUsers());

import faker from 'faker';
import randomColor from 'randomcolor';
import User from '../models/User.js';

const loadTestUsers = () => {
    const testNum = 20;

    const users = [];

    for (let i = 0; i < testNum; i++) {
        const person = faker.name;

        const name = [person.firstName(), person.lastName()].join(' ');
        const email = faker.internet.email(name);
        const username = faker.internet.userName(name);
        const passphrase = faker.internet.password();
        const color = randomColor();

        const user = new User({
            username,
            name,
            email,
            passphrase,
            color
        });

        users.push(user);
    }

    Promise.all(users.map(async (user) => {
        await user.save();
    })).then(() => {
        process.exit(1);
    }).catch(e => console.log(e));
}
