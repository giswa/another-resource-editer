import express from 'express'
import apiMocker from 'connect-api-mocker';

var app = express();

app.use('/api', apiMocker('mocks/azure'));

app.listen(8080);