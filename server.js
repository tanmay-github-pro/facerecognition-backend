import express, { response } from "express";
import bcrypt from 'bcrypt-nodejs';
import cors from 'cors';
import knex from 'knex';

const db = knex({
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        user: 'postgres',
        password: 'Tanmay@postgres',
        database: 'faceRecogDB'
    }
});

/* db.select('*').from('users').then(data => {
    console.log(data);
}); */

const app = express();

// middleware (body-parser package not required)
app.use(express.json());

app.use(cors());

app.get('/', (req, res) => {
    db('users')
        .returning('*')
        .then(user => {
            res.json(user);
        });
})

app.post('/signin', (req, res) => {
    db.select('email', 'hash').from('login')
        .where('email', '=', req.body.email)
        .then(data => {
            const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
            if (isValid) {
                db.select('*').from('users')
                    .where('email', '=', req.body.email)
                    .then(user => {
                        res.json(user[0])
                    })
                    .catch(err => res.status(400).json('Unable to get user'))
            } else {
                res.status(400).json('Wrong Credentials!')
            }
        })
        .catch(err => res.status(400).json('Wromg Credentials'))

})

app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
      trx.insert({
        hash: hash,
        email: email
      })
      .into('login')
      .returning('email')
      .then(loginEmail => {
        trx('users')
          .returning('*')
          .insert({
            email: loginEmail[0],
            name: name,
            joined: new Date()
          })
          .then(user => {
            res.json(user[0]);
          })
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('unable to register'))
})

app.get('/profile/:id', (req, res) => {
    // console.log(req.params);
    const { id } = req.params;
    db.select('*').from('users')
        .where({ id })
        .then(user => {
            if (user.length)
                res.json(user[0]);
            else
                res.status(404).json('Not Found!')
        })
        .catch(err => res.status(400).json('Error Getting user'))
})

app.put('/image', (req, res) => {
    const { id } = req.body;
    db('users').where('id', '=', id)
        .increment('entries', 1)
        .returning('entries')
        .then(entries => {
            res.json(entries[0]);
        })
        .catch(err => res.status(400).json('unable to get entries'))
})

app.listen(3000, () => {
    console.log('App is running on port 3000');
});

/*
    / -> root route -> this is working

    /signIn --> POST(bcz data(user info) is send) request
                responds with success or fail
    /register -> POST because new user data is added
                response -> newly created user
    /profile/:userId -> ability to access profile of user at home screen
                        userId is a parameter
                        GET (to get user info)
    /image -> PUT (updating score(no of images)) -> user
 */