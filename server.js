require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const userController = require('./controllers/userController');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/register', userController.register);
app.post('/api/login', userController.login);
app.post('/api/update', userController.updateUser);
app.post('/api/delete', userController.deleteUser);
app.get('/api/users', userController.listUsers);
app.post('/api/admin-detail', userController.adminDetail);
app.get('/api/logs', userController.getLogs);


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});