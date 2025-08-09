/***
Copyright 2025 Muzaffar Rayyan Auhammud

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
***/


import serverless from 'serverless-http'
import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import { v6 as uuidv6 } from 'uuid';
import { createHash } from 'crypto';

// Initialize express app
const app = express()
app.use(express.json())
app.use(express.urlencoded({extended: true}))

const router = express.Router()
router.use(cors())   // Apply express middlewares

// Custom params
const domain = "";
const githubUser = "";
const githubRepo = "";
const functionName = 'comment'

// Set correct router base path for the function
const routerBasePath = process.env.NODE_ENV === 'dev' ? `/${functionName}` : `/.netlify/functions/${functionName}/`
app.use(routerBasePath, router)

// The endpoint for ${domain}/.netlify/functions/${functionName}/post which the comments form use
router.post('/post', async (req, res) => {
    // Leave at the top to ensure we have proper Access Control for all future responses
    const allowOrigin = process.env.NODE_ENV === 'dev' ? '*' : `https://${domain}`;
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    
    // TODO: Return an error if req.body is null or undefined
    
    // These come from the comments form on the webpage
    const slug = req.body.slug ?? "";
    const name = req.body.name ?? "";
    const email = req.body.email ?? "";
    const replyTo = req.body.replyTo ?? "";
    const comment = req.body.comment ?? "";

    if (slug.trim() === "")
    {
        let result = { statusCode: 422, msg: `Error: slug cannot be empty.` }
        return res.send(JSON.stringify(result));
    }

    if (name.trim() === "")
    {
        let result = { statusCode: 422, msg: "Error: name cannot be empty." }
        return res.send(JSON.stringify(result));
    }

    if (email.trim() === "")
    {
        let result = { statusCode: 422, msg: "Error: email cannot be empty." }
        return res.send(JSON.stringify(result));
    }

    if (comment.trim() === "")
    {
        let result = { statusCode: 422, msg: "Error: comment cannot be empty." }
        return res.send(JSON.stringify(result));
    }

    // TODO: Validate slug (Directory should exist under /contents/posts)

    // TODO: Validate name (Alphabet only)

    // Validate name (Max 25 chars)
    if (name.length > 25)
    {
        let result = { statusCode: 422, msg: "Error: name cannot be more than 25 characters." }
        return res.send(JSON.stringify(result));
    }

    // Validate email (Max 60 chars)
    if (email.length > 60)
    {
        let result = { statusCode: 422, msg: "Error: email cannot be more than 60 characters." }
        return res.send(JSON.stringify(result));
    }

    // TODO: Validate email (Alphanumeric OR . OR @, Start and end with alphabet only, contain @ character only once, contain at least one period)
    // TODO: Validate reply_to (should be a valid _id which exists in a file under /contents/data/comments/slug)
    // TODO: Sanitize comment (Use HTMLEncode to prevent embedding external content)

    const commentData = {
        _id: uuidv6(), // Unique ID for each comment
        name: name,
        email: createHash('md5').update(email).digest('hex'), // For gravatar profile pics
        email_real: email, // To notify the commenter using some mail API when someone replies on the thread
        reply_to: replyTo, // ID of comment being replied to (if any)
        comment: comment,
        date: new Date().toISOString(),
    };

    const body = {
        message: `New comment in ${slug} by ${name}`,
        comitter: {
            name: "Monalisa Octocat",
            email: "octocat@github.com"
        },
        content: btoa(JSON.stringify(commentData))
    };

    const opts = {
        method: "PUT",
        headers: {
            "Authorization": "Bearer " + process.env.GITHUB_COMMENT_PAT,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        },
        body: JSON.stringify(body)
    };

    const filename = `comment-${Date.now()}.json`; // Unique timestamp-based filename
    const endpointBase = `https://api.github.com/repos/${githubUser}/${githubRepo}/contents/data/comments`;
    const endpoint = `${endpointBase}/${slug}/${filename}`;

    const errMsg = "There was an error processing your request. Please try again later.";
    const successMsg = "Thank you! Your comment has been received and will be published shortly :)";

    let statusCode = "";
    let msg = "";

    const githubResponse = await fetch(endpoint, opts)
    .catch((error) => {
        statusCode = 500;
        msg = `${errMsg} ${error.statusText}`;
    });

    // Send failure response to browser in case of exception while contacting GitHub API
    if (statusCode !== "")
    {
        let result = { statusCode: statusCode, msg: msg }
        return res.send(JSON.stringify(result));
    }

    // Successfully reached GitHub API
    if (githubResponse.ok)
    {
        // If commit success, GitHub API returns an object with "content" and "commit" properties.
        // On commit failure, GitHub API returns an object with "status" property.
        const data = await githubResponse.json();
        statusCode = Object.hasOwn(data, 'commit') ? 200 : 422;
        msg = Object.hasOwn(data, 'commit') ? successMsg : errMsg;

        if (statusCode >= 400)
        {
            msg = Object.hasOwn(data, 'status') ? data.status : errMsg;
        }
    }
    else
    {
        statusCode = githubResponse.status;
        msg = "Error: Failed to reach API. Please try again later.";
    }

    // Send response to browser (your JS script)
    let result = { statusCode: statusCode, msg: msg }
    return res.send(JSON.stringify(result));
})

// Export lambda handler
exports.handler = serverless(app)
