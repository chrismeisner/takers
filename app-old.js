const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const Airtable = require('airtable');
const axios = require('axios');
const { Dropbox } = require('dropbox');
const fetch = require('isomorphic-fetch'); // Required for Dropbox SDK

const app = express();
app.use(express.urlencoded({ extended: true }));

let accessToken = 'sl.BrDg5E4ccKvykWVsO_aA_YvQLOLi7IKUbCuG-NWWslFQZiHex-SW7bVRMn2lW63G9pwoG6doi5KP-B_40K_9Q0lxF_boj9Dp4e_XjB3o-TfY79HVLhT-dNus4BwCnc55vflBUBzAwIUECHEqyyZLGWA'; // Replace with your initial access token
let refreshToken = '1KhWJN8mUvEAAAAAAAAAASS7pzNNdV4LtfQ0s82jg3VNWXXOUsOduhfRfFc2KOp1'; // Store your refresh token here

// Updated Dropbox setup
const dbx = new Dropbox({ 
	fetch: fetch,
	clientId: 'ajk872ikp1a9lz2', 
	clientSecret: 'ce0sn830k5yr14e',
});

dbx.auth.setRefreshToken(refreshToken);

// Refresh access token if needed
async function checkAndRefreshToken() {
	if (dbx.auth.getAccessToken() === null || dbx.auth.isAccessTokenExpired()) {
		await dbx.auth.refreshAccessToken();
		accessToken = dbx.auth.getAccessToken();
	}
}

// Airtable setup
const airtableBase = new Airtable({ apiKey: 'patEF71MOUuCcneoW.d376f6081b53aab6900219831e0be8dd200458fb28443db567254fcd268a6268' }).base('app3n81ptFBce0myJ');

// Twilio credentials for authentication
const twilioAccountSid = 'AC0d824dda4621c3814c0385424f6d2197';
const twilioAuthToken = '2e56a22e5e769707a13d5bb55ccf4e88';

// Function to create a direct download link for a Dropbox file
async function getDropboxSharedLink(path) {
	try {
		const sharedLinkResponse = await dbx.sharingCreateSharedLinkWithSettings({
			path: path,
			settings: {
				requested_visibility: 'public'
			}
		});
		let link = sharedLinkResponse.result.url;
		link = link.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '');
		return link;
	} catch (error) {
		console.error('Error creating shared link in Dropbox:', error);
		throw error;
	}
}

app.post('/receive-sms', async (req, res) => {
	const incomingMsg = req.body.Body;
	const sender = req.body.From;
	const numMedia = parseInt(req.body.NumMedia, 10);

	let mediaUrls = [];
	for (let i = 0; i < numMedia; i++) {
		const mediaUrl = req.body[`MediaUrl${i}`];

		try {
			const response = await axios.get(mediaUrl, {
				responseType: 'arraybuffer',
				auth: {
					username: twilioAccountSid,
					password: twilioAuthToken
				}
			});
			const fileBuffer = response.data;
			const fileName = `media-${Date.now()}-${i}.png`;

			const dropboxResponse = await dbx.filesUpload({ path: '/' + fileName, contents: fileBuffer });
			
			// Create a direct download link for the uploaded file
			const dropboxFileUrl = await getDropboxSharedLink(dropboxResponse.result.path_display);
			mediaUrls.push({ url: dropboxFileUrl });
		} catch (error) {
			console.error(`Error processing media URL ${i}:`, error);
		}
	}

	airtableBase('Inbox').create([{
		"fields": { 
			"Number": sender, 
			"Message": incomingMsg, 
			"Attachment": mediaUrls.length > 0 ? mediaUrls : null
		}
	}], function(err) {
		if (err) {
			console.error('Error adding record to Airtable:', err);
			const twiml = new MessagingResponse();
			twiml.message('Failed to process your message.');
			res.writeHead(200, {'Content-Type': 'text/xml'});
			res.end(twiml.toString());
			return;
		}

		console.log(`Message from ${sender}: ${incomingMsg} added to Airtable`);
		const twiml = new MessagingResponse();
		twiml.message('Message received. Thank you!');
		res.writeHead(200, {'Content-Type': 'text/xml'});
		res.end(twiml.toString());
	});
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
