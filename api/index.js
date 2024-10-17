const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configura la conexión a la base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, '../client')));

// Creación de tablas (solo una vez)
const createTables = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS players (
            id SERIAL PRIMARY KEY,
            total_points INTEGER DEFAULT 0
        );
        
        CREATE TABLE IF NOT EXISTS missions (
            id SERIAL PRIMARY KEY,
            title TEXT,
            difficulty TEXT,
            reward_points INTEGER
        );

        CREATE TABLE IF NOT EXISTS rewards (
            id SERIAL PRIMARY KEY,
            description TEXT,
            points_required INTEGER
        );
    `);
};

// Llama a la función para crear tablas
createTables().catch(err => console.error('Error al crear tablas:', err));

// Rutas
app.get('/', (req, res) => {
    res.send('¡Bienvenido a la aplicación de gestión de tareas!');
});

// Get puntos
app.get('/api/player', (req, res) => {
    pool.query('SELECT total_points FROM players WHERE id = $1', [1], (err, result) => {
        if (err || result.rows.length === 0) {
            return res.status(404).send({ message: 'Jugador no encontrado.' });
        }
        res.status(200).send({ total_points: result.rows[0].total_points });
    });
});

// Get misiones
app.get('/api/missions', (req, res) => {
    pool.query('SELECT * FROM missions', (err, result) => {
        if (err) {
            return res.status(500).send({ message: 'Error al obtener misiones.' });
        }
        res.status(200).json(result.rows);
    });
});

// Agregar misión
app.post('/api/missions', (req, res) => {
    const { title, difficulty, reward_points } = req.body;
    pool.query('INSERT INTO missions (title, difficulty, reward_points) VALUES ($1, $2, $3) RETURNING id', 
        [title, difficulty, reward_points], (err, result) => {
        if (err) {
            console.error('Error en la base de datos:', err);
            return res.status(500).send({ message: 'Error al agregar misión.' });
        }
        res.status(201).send({ message: 'Misión agregada con éxito.', id: result.rows[0].id });
    });
});

// Completar misión
app.put('/api/missions/:id/complete', (req, res) => {
    const id = req.params.id;
    pool.query('SELECT * FROM missions WHERE id = $1', [id], (err, result) => {
        if (err || result.rows.length === 0) {
            return res.status(404).send({ message: 'Misión no encontrada.' });
        }
        const mission = result.rows[0];
        pool.query('DELETE FROM missions WHERE id = $1', [id], (err) => {
            if (err) {
                return res.status(500).send({ message: 'Error al completar la misión.' });
            }

            pool.query('UPDATE players SET total_points = total_points + $1 WHERE id = $2', 
                [mission.reward_points, 1], (err) => {
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
    pool.query('SELECT * FROM rewards', (err, result) => {
        if (err) {
            return res.status(500).send({ message: 'Error al obtener recompensas.' });
        }
        res.status(200).json(result.rows);
    });
});

// Agregar recompensa
app.post('/api/rewards', (req, res) => {
    const { description, points_required } = req.body;
    pool.query('INSERT INTO rewards (description, points_required) VALUES ($1, $2) RETURNING id', 
        [description, points_required], (err, result) => {
        if (err) {
            console.error('Error en la base de datos:', err);
            return res.status(500).send({ message: 'Error al agregar recompensa.' });
        }
        res.status(201).send({ message: 'Recompensa agregada con éxito.', id: result.rows[0].id });
    });
});

// Canjear recompensa
app.post('/api/rewards/:id/redeem', (req, res) => {
    const id = req.params.id;
    pool.query('SELECT * FROM rewards WHERE id = $1', [id], (err, result) => {
        if (err || result.rows.length === 0) {
            return res.status(404).send({ message: 'Recompensa no encontrada.' });
        }
        const reward = result.rows[0];
        pool.query('SELECT total_points FROM players WHERE id = $1', [1], (err, result) => {
            if (err || result.rows.length === 0) {
                return res.status(404).send({ message: 'Jugador no encontrado.' });
            }
            const player = result.rows[0];
            if (player.total_points < reward.points_required) {
                return res.status(400).send({ message: 'No tienes suficientes puntos para canjear esta recompensa.' });
            }
            pool.query('UPDATE players SET total_points = total_points - $1 WHERE id = $2', 
                [reward.points_required, 1], (err) => {
                if (err) {
                    return res.status(500).send({ message: 'Error al canjear la recompensa.' });
                }
                res.send({ message: 'Recompensa canjeada con éxito.' });
            });
        });
    });
});

// Resetear todo
app.delete('/api/rewards/reset', (req, res) => {
    pool.query('DELETE FROM missions', (err) => {
        if (err) {
            return res.status(500).send({ message: 'Error al resetear misiones.' });
        }

        pool.query('DELETE FROM rewards', (err) => {
            if (err) {
                return res.status(500).send({ message: 'Error al resetear recompensas.' });
            }

            pool.query('UPDATE players SET total_points = 0', (err) => {
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
