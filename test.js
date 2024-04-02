const axios = require('axios');
const express = require('express');
const wordpressSites = require('./wordpressSites.json');

const app = express();
const port = 3000;

async function fetchData(site) {
    try {
        const response = await axios.get(site.endpoint, {
            params: {
                '_fields[]': ['title', 'link', 'date', 'guid', 'excerpt', 'author', 'tags', 'categories', 'featured_media', 'comment_status', 'format', 'slug', 'sticky', 'template', 'meta'],
                'page': 1, // 'page': '1
                'per_page': 10
            }
        });


        const posts = response.data;

        console.log(posts);
        return posts;

    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

app.get('/posts', async (req, res) => {
    try {
        const allPosts = [];
        for (const site of wordpressSites) {
            const posts = await fetchData(site);
            allPosts.push(...posts);
        }
        res.json(allPosts);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
