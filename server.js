const express = require('express');
const app = express();
require('dotenv').config();
const mysql = require('mysql2');
const axios = require('axios')

const connection = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
});

connection.connect((err) => {
    if (err) {
        console.log('Error connecting to Db');
        return;
    }

    console.log('Connection established');
}
);

app.get('/:category', (req, res) => {
    // console.log('Request received:', req.params.category)

    // Fetch all GraphQL endpoint URLs from the MySQL table
    connection.query(
        'SELECT graphql_endpoint FROM wp_sites',
        function (err, results, fields) {
            if (err) {
                console.error('Error fetching GraphQL endpoints from database:', err);
                res.status(500).send('Error fetching GraphQL endpoints from database');
                return;
            }

            if (results.length === 0) {
                res.status(404).send('No GraphQL endpoints found in database');
                return;
            }

            // Extract GraphQL endpoint URLs from the results
            const graphqlEndpoints = results.map(result => result.graphql_endpoint);

            // Make HTTP requests to all GraphQL endpoints
            const requests = graphqlEndpoints.map(endpoint => {
                return axios.post(endpoint, {
                    query: `
                    query {
                        posts (where : {categoryName: "${req.params.category}"}) {
                            edges {
                                node {
                                    id
                    title
                    date
                    link
                    guid
                    categories {
                        nodes {
                            id
                            name
                            link
                        }
                    }
                    featuredImage {
                        node {
                            altText
                            sourceUrl
                        }
                    }

                                }
                            }
                        }
                    }
                `
                });
            });

            // Execute all requests concurrently
            Promise.all(requests)
                .then(responses => {
                    // Extract data from all responses
                    const allData = responses.map(response => response.data.data.posts.edges.map(edge => ({
                        id: edge.node.id,
                        title: edge.node.title,
                        date: edge.node.date,
                        link: edge.node.link,
                        guid: edge.node.guid,
                        categories: edge.node.categories.nodes.map(category => ({
                            id: category.id,
                            name: category.name,
                            link: category.link
                        })),
                        featuredImage: edge.node.featuredImage ? {
                            altText: edge.node.featuredImage.node.altText,
                            sourceUrl: edge.node.featuredImage.node.sourceUrl
                        } : null

                        // Add more fields as needed
                    })));

                    res.send(allData); // Send the retrieved data as response
                })
                .catch(error => {
                    console.error('Error fetching data from WordPress GraphQL:', error);
                    res.status(500).send('Error fetching data from WordPress GraphQL');
                });
        }
    );
});



app.listen(process.env.PORT, () => {
    console.log('Server is running on port ' + process.env.PORT);
});
