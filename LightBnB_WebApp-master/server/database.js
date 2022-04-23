const properties = require("./json/properties.json");
const users = require("./json/users.json");

// Set up node postgres
const { Pool } = require("pg");

const pool = new Pool({
  user: "vagrant",
  password: "123",
  host: "localhost",
  database: "lightbnb",
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  const queryString = `SELECT * 
  FROM users 
  WHERE email = $1`;

  return pool
    .query(queryString, [email])
    .then((result) => {
      // Return null if no result found
      if (!result) {
        return null;
      }
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  const queryString = `SELECT * 
  FROM users 
  WHERE id = $1`;

  return pool
    .query(queryString, [id])
    .then((result) => {
      // Return null if no result found
      if (!result) {
        return null;
      }
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithId = getUserWithId;

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const queryString = `INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3)
  RETURNING *;`;

  return pool
    .query(queryString, [user.name, user.email, user.password])
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryString = `SELECT reservations.*, properties.*,
  AVG(property_reviews.rating) AS average_rating
  FROM reservations
  JOIN properties ON properties.id = property_id
  JOIN property_reviews ON reservations.id = reservation_id
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;`;

  return pool
    .query(queryString, [guest_id, limit])
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {
  // Declare array to hold parameters passed into query
  const queryParams = [];

  // Beginning of query that will not change
  let queryString = `SELECT properties.*, AVG(rating) AS average_rating
  FROM properties
  LEFT JOIN property_reviews ON properties.id = property_id `;

  // Declare an array to hold pieces of WHERE query
  const whereQuery = [];

  // OPTIONS
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    whereQuery.push(`city LIKE $${queryParams.length} `);
  }

  if (options.owner_id) {
    queryParams.push(options.owner_id);
    whereQuery.push(`owner_id = $${queryParams.length} `);
  }

  if (options.minimum_price_per_night) {
    // Multiply value by 100 to convert dollars to cents
    queryParams.push(options.minimum_price_per_night * 100);
    whereQuery.push(`(cost_per_night) >= $${queryParams.length} `);
  }

  if (options.maximum_price_per_night) {
    // Multiply value by 100 to convert dollars to cents
    queryParams.push(options.maximum_price_per_night * 100);
    whereQuery.push(`(cost_per_night) <= $${queryParams.length} `);
  }

  // Add WHERE and its queries to the main query if it exists
  if (whereQuery.length > 0) {
    queryString += `WHERE ` + whereQuery.join(`AND `);
  }

  // Handle GROUP BY after potential WHERE query
  queryString += `GROUP BY properties.id `;

  // Handle HAVING scenario if dealing with aggregate query AVG
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `HAVING AVG(rating) > $${queryParams.length} `;
  }

  // Push limit to parameters passed in
  queryParams.push(limit);
  queryString += `ORDER BY cost_per_night
  LIMIT $${queryParams.length};`;

  return pool
    .query(queryString, queryParams)
    .then((res) => {
      return res.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getAllProperties = getAllProperties;

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  // Collection of keys in property object
  const keys = Object.keys(property);
  // Use keys to populate query string with appropriate names
  let queryString = `INSERT INTO properties (${keys.join(", ")}) 
  VALUES (`;

  // Declare array to hold parameters passed into query
  const queryParams = [];

  // Initialize string to hold parameter substitution references
  let valueIndex = "";
  for (let key of keys) {
    queryParams.push(property[key]);
    valueIndex += `$${queryParams.length}, `;
  }

  // Handle extra comma at the final value and return added property
  queryString += `${valueIndex.slice(0, -2)})
  RETURNING *;`;

  return pool
    .query(queryString, queryParams)
    .then((res) => {
      return res.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.addProperty = addProperty;
