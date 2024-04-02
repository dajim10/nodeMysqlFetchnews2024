


const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;
const mysql = require('mysql2');
const fs = require('fs');


// const wordpressSites = JSON.parse(fs.readFileSync('wordpressSites.json', 'utf8'));

// Define wordpressSites with hardcoded WordPress site URLs


// async function readWordpressSites() {
//     try {
//         const data = await fs.readFile('wordpressSites.json');
//         return JSON.parse(data);
//     } catch (error) {
//         console.error('Error reading JSON file:', error);
//         return [];
//     }
// }

// async function startServer() {
//     const wordpressSites = await readWordpressSites();

//     // Your server setup and route handlers here
// }

// startServer();



app.get('/posts/:categories', async (req, res) => {
    try {
        const { categories } = req.params;
        const categorySlugs = categories ? categories.split(',') : [];

        // Function to fetch category ID from WordPress API based on slug for each site
        const getCategoryIds = async (slug, siteUrl) => {
            const response = await axios.get(`${siteUrl}/wp-json/wp/v2/categories?slug=${slug}`);
            return response.data.map(category => category.id);
        };

        // Fetch category IDs for the given slugs from each site
        const categoryPromises = categorySlugs.map(async (categorySlug) => {
            return Promise.all([
                getCategoryIds(categorySlug, 'https://www.rmutsv.ac.th/ruts'),
                getCategoryIds(categorySlug, 'https://arit.rmutsv.ac.th/ruts'),
                getCategoryIds(categorySlug, 'https://personnel.rmutsv.ac.th/ruts')
                // Add more WordPress site URLs as needed
            ]);
        });
        // const categoryPromises = categorySlugs.map(async (categorySlug) => {
        //     return Promise.all(wordpressSites.map(siteUrl => getCategoryIds(categorySlug, siteUrl)));
        // });

        // Wait for all category requests to complete
        const categoryArrays = await Promise.all(categoryPromises);

        // Flatten the array of category IDs
        const categoryIds = categoryArrays.flat();

        if (!categoryIds.length) {
            return res.status(404).json({ error: 'Categories not found' });
        }

        // Array of WordPress site URLs
        // const wordpressSites = [
        //     'https://www.rmutsv.ac.th/ruts/wp-json/wp/v2/posts',
        //     'https://arit.rmutsv.ac.th/ruts/wp-json/wp/v2/posts',
        //     'https://personnel.rmutsv.ac.th/ruts/wp-json/wp/v2/posts',
        //     'https://inded.rmutsv.ac.th/ruts/wp-json/wp/v2/posts',
        //     // Add more WordPress site URLs as needed
        // ];

        // load wordpressSites from JSON file
        const wordpressSites = JSON.parse(fs.readFileSync('wordpressSites.json', 'utf8'));



        // Fetch posts from each WordPress site filtered by category IDs
        const postsPromises = wordpressSites.map(async (siteUrl) => {
            const response = await axios.get(siteUrl, {
                params: {
                    categories: categoryIds.join(','), // Filter by category IDs
                    _fields: 'date,guid,title,link,_links', // Specify fields to fetch
                    _embed: true,// Include embedded data
                    per_page: 1 // Limit to 10 posts
                }
            });
            return response.data.map(post => ({
                date: post.date,
                guid: post.guid,
                title: post.title.rendered,
                link: post.link,
                featureImage: post._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
                    post._links?.['wp:featuredmedia']?.[0]?.href ||
                    null
            }));
        });

        // Wait for all requests to complete
        const postsArrays = await Promise.all(postsPromises);

        // Concatenate arrays of posts
        const allPosts = [].concat(...postsArrays);

        res.json(allPosts);
    } catch (error) {
        console.error('Error fetching posts:', error.response?.data || error.message);
        res.status(500).json({ error: 'Error fetching posts' });
    }
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});


