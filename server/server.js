const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, '../client')));

const db = new sqlite3.Database('./quest_manager.db');

// Creación de tabas
db.serialize(() => {
    db.run("CREATE TABLE players (id INTEGER PRIMARY KEY, total_points INTEGER)");
    db.run("CREATE TABLE missions (id INTEGER PRIMARY KEY, title TEXT, difficulty TEXT, reward_points INTEGER)");
    db.run("CREATE TABLE rewards (id INTEGER PRIMARY KEY, description TEXT, points_required INTEGER)");


    db.run("INSERT INTO players (total_points) VALUES (0)");

    db.run("INSERT INTO missions (title, difficulty, reward_points) VALUES ('Limpiar el baño', 'Fácil', 50)");
    db.run("INSERT INTO missions (title, difficulty, reward_points) VALUES ('Lavar loza', 'Fácil', 30)");
    db.run("INSERT INTO missions (title, difficulty, reward_points) VALUES ('Hacer la compra', 'Normal', 40)");

    db.run("INSERT INTO rewards (description, points_required) VALUES ('Caminata por el parque', 50)");
    db.run("INSERT INTO rewards (description, points_required) VALUES ('Ida al cine', 200)");
    db.run("INSERT INTO rewards (description, points_required) VALUES ('Comprar un helado', 100)");
});

app.get('/', (req, res) => {
    res.send('¡Bienvenido a la aplicación de gestión de tareas!');
});

// Get puntos
app.get('/api/player', (req, res) => {
    db.get('SELECT total_points FROM players WHERE id = ?', [1], (err, player) => {
        if (err || !player) {
            return res.status(404).send({ message: 'Jugador no encontrado.' });
        }
        res.status(200).send({ total_points: player.total_points });
    });
});

// Get misiones
app.get('/api/missions', (req, res) => {
    db.all('SELECT * FROM missions', [], (err, missions) => {
        if (err) {
            return res.status(500).send({ message: 'Error al obtener misiones.' });
        }
        res.status(200).json(missions);
    });
});

// Agregar mision
app.post('/api/missions', (req, res) => {
    const { title, difficulty, reward_points } = req.body;
    db.run('INSERT INTO missions (title, difficulty, reward_points) VALUES (?, ?, ?)', [title, difficulty, reward_points], function (err) {
        if (err) {
            console.error('Error en la base de datos:', err);
            return res.status(500).send({ message: 'Error al agregar misión.' });
        }
        res.status(201).send({ message: 'Misión agregada con éxito.', id: this.lastID });
    });
});

// Completar mision
app.put('/api/missions/:id/complete', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM missions WHERE id = ?', [id], (err, mission) => {
        if (err || !mission) {
            return res.status(404).send({ message: 'Misión no encontrada.' });
        }
        db.run('DELETE FROM missions WHERE id = ?', [id], (err) => {
            if (err) {
                return res.status(500).send({ message: 'Error al completar la misión.' });
            }

            db.run('UPDATE players SET total_points = total_points + ?', [mission.reward_points], (err) => {
                if (err) {
                    return res.status(500).send({ message: 'Error al actualizar los puntos.' });
                }
                res.send({ message: 'Misión completada y puntos añadidos.' });
            });
        });
    });
});

// Get recompensas
app.get('/api/rewards', (req, res) => {
    db.all('SELECT * FROM rewards', [], (err, rewards) => {
        if (err) {
            return res.status(500).send({ message: 'Error al obtener recompensas.' });
        }
        res.status(200).json(rewards);
    });
});

// Agregar recompensas
app.post('/api/rewards', (req, res) => {
    const { description, points_required } = req.body;
    db.run('INSERT INTO rewards (description, points_required) VALUES (?, ?)', [description, points_required], function (err) {
        if (err) {
            console.error('Error en la base de datos:', err);
            return res.status(500).send({ message: 'Error al agregar recompensa.' });
        }
        res.status(201).send({ message: 'Recompensa agregada con éxito.', id: this.lastID });
    });
});

// Canjear recompensas
app.post('/api/rewards/:id/redeem', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM rewards WHERE id = ?', [id], (err, reward) => {
        if (err || !reward) {
            return res.status(404).send({ message: 'Recompensa no encontrada.' });
        }
        db.get('SELECT total_points FROM players WHERE id = ?', [1], (err, player) => {
            if (err || !player) {
                return res.status(404).send({ message: 'Jugador no encontrado.' });
            }
            if (player.total_points < reward.points_required) {
                return res.status(400).send({ message: 'No tienes suficientes puntos para canjear esta recompensa.' });
            }
            db.run('UPDATE players SET total_points = total_points - ?', [reward.points_required], (err) => {
                if (err) {
                    return res.status(500).send({ message: 'Error al canjear la recompensa.' });
                }
                res.send({ message: 'Recompensa canjeada con éxito.' });
            });
        });
    });
});

// // Ruta para resetear todas las misiones
// app.delete('/api/missions/reset', (req, res) => {
//     db.run('DELETE FROM missions', (err) => {
//         if (err) {
//             return res.status(500).send({ message: 'Error al resetear misiones.' });
//         }
//         res.send({ message: 'Todas las misiones han sido eliminadas.' });
//     });
// });

// Resetear todo
app.delete('/api/rewards/reset', (req, res) => {

    db.run('DELETE FROM missions', (err) => {
        if (err) {
            return res.status(500).send({ message: 'Error al resetear misiones.' });
        }

        db.run('DELETE FROM rewards', (err) => {
            if (err) {
                return res.status(500).send({ message: 'Error al resetear recompensas.' });
            }

            db.run('UPDATE players SET total_points = 0', (err) => {
                if (err) {
                    return res.status(500).send({ message: 'Error al restablecer los puntos.' });
                }
                res.send({ message: 'Todas las misiones y recompensas han sido eliminadas, y los puntos han sido restablecidos a 0.' });
            });
        });
    });
});

// Inicio server
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
