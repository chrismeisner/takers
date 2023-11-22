const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const app = express();

const PORT = 3000;
const DROPBOX_APP_KEY = 'ajk872ikp1a9lz2'; // Replace with your Dropbox app key
const DROPBOX_APP_SECRET = 'ce0sn830k5yr14e'; // Replace with your app secret
const REDIRECT_URI = 'http://localhost:3000/oauth/callback';

// Redirect user to Dropbox authorization page
app.get('/oauth/redirect', (req, res) => {
	const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${DROPBOX_APP_KEY}&response_type=code&redirect_uri=${REDIRECT_URI}`;
	res.redirect(authUrl);
});

// Callback route to handle the OAuth 2.0 response
app.get('/oauth/callback', async (req, res) => {
	const code = req.query.code;
	try {
		const response = await axios.post('https://api.dropbox.com/oauth2/token', querystring.stringify({
			code,
			grant_type: 'authorization_code',
			redirect_uri: REDIRECT_URI,
			client_id: DROPBOX_APP_KEY,
			client_secret: DROPBOX_APP_SECRET
		}), {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		});

		console.log('Access Token:', response.data.access_token);
		console.log('Refresh Token:', response.data.refresh_token);

		res.send('Authorization successful, check your console for tokens.');
	} catch (error) {
		console.error('Error during authorization:', error);
		res.status(500).send('Authorization error');
	}
});

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
