## Installation

1. Copy the **contents** of `/src` in the root directory of your Hugo website git repository. Also make sure you have the directory structure `/data/comments` in your Hugo project.

2. Adjust the custom params found in the file `comment.js` to use your real domain, GitHub username, and repo name.

3. Commit the changes and wait for Netlify to deploy your website.

4. In Netlify, head to the **Environment variables** section of your project and create a variable called `GITHUB_COMMENT_PAT`.

5. Set the value of this variable to a GitHub Personal Access Token (fine-grained) which has the following permissions on your Hugo website git repo:
* Read access to metadata
* Read and Write access to code

If you don't already have such a token, you can create one from the GitHub Settings page: https://github.com/settings/personal-access-tokens


## Submitting Comments
Submitting a comment is as easy as making a `POST` request to the following endpoint:

```txt
https://{domain}/netlify/functions/comment/post
```

### Required Fields
The edge function expects to receive the following fields:
1. slug
2. name
3. email
4. replyTo
5. comment

You can include a JS script inside your Hugo page template which uses JavaScript Fetch API to `POST` the contents of the comments form found on the page to the above endpoint.

This will trigger the Netlify function which will in turn commit the comment file with the form data inside the `/data/comments` directory of your Hugo website.

