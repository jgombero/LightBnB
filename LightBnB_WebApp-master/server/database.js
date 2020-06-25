const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

module.exports = {
  /// Users

  /**
   * Get a single user from the database given their email.
   * @param {String} email The email of the user.
   * @return {Promise<{}>} A promise to the user.
   */

  getUserWithEmail : function(email) {
    return pool.query(`
    SELECT *
    FROM users
    WHERE email = $1;
    `, [ email ])
    .then (res => res.rows[0])
    .catch(err => null);
  },

  /**
   * Get a single user from the database given their id.
   * @param {string} id The id of the user.
   * @return {Promise<{}>} A promise to the user.
   */

  getUserWithId : function(id) {
    return pool.query(`
    SELECT *
    FROM users 
    WHERE id = $1;
    `, [ id ])
    .then(res => res.rows[0])
    .catch(err => null);
  },

  /**
   * Add a new user to the database.
   * @param {{name: string, password: string, email: string}} user
   * @return {Promise<{}>} A promise to the user.
   */
  addUser : function(user) {
    return pool.query(`
    INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;
    `, [ user.name, user.email, user.password ])
    .then (res => res.rows[0])
    .catch (err => null);
  },


  /// Reservations

  /**
   * Get all reservations for a single user.
   * @param {string} guest_id The id of the user.
   * @return {Promise<[{}]>} A promise to the reservations.
   */
  getAllReservations : function(guest_id, limit = 10) {
    return pool.query(`SELECT properties.*, reservations.*, avg(rating) as average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  LEFT JOIN property_reviews ON properties.id = property_reviews.property_id 
  WHERE reservations.guest_id = $1
  AND reservations.end_date < now()::date
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;`, [ guest_id, limit ])
  .then(res =>  res.rows)
  .catch(err => null);
  },

  /// Properties

  /**
   * Get all properties.
   * @param {{}} options An object containing query options.
   * @param {*} limit The number of results to return.
   * @return {Promise<[{}]>}  A promise to the properties.
   */
  getAllProperties : function(options, limit = 10) {
    const queryParams = [];
    let queryString = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    LEFT JOIN property_reviews ON properties.id = property_id
    `;

    if (options.city) {
      queryParams.push(`%${options.city}%`);
      queryString += `WHERE city LIKE $${queryParams.length}`;
    } 

    if (options.owner_id && queryParams.length === 0) {
      queryParams.push(`${options.owner_id}`);
      queryString += `WHERE owner_id = $${queryParams.length}`;
    } else if (options.owner_id) {
      queryParams.push(`${options.owner_id}`);
      queryString += ` AND owner_id = $${queryParams.length}`;
    }

    if (options.minimum_price_per_night && queryParams.length === 0) {
      queryParams.push(options.minimum_price_per_night * 100);
      queryString += `WHERE cost_per_night >= $${queryParams.length}`;
    } else if (options.minimum_price_per_night) {
      queryParams.push(options.minimum_price_per_night * 100);
      queryString += ` AND cost_per_night >= $${queryParams.length}`;
    }

    if (options.maximum_price_per_night && queryParams.length === 0) {
      queryParams.push(options.maximum_price_per_night * 100);
      queryString += `WHERE cost_per_night <= $${queryParams.length}`;
    } else if (options.maximum_price_per_night) {
      queryParams.push(options.maximum_price_per_night * 100);
      queryString += ` AND cost_per_night <= $${queryParams.length}`;
    }

    queryString += `
    GROUP BY properties.id
    `;

    if (options.minimum_rating) {
      queryParams.push(options.minimum_rating);
      queryString += `HAVING avg(property_reviews.rating) >= $${queryParams.length}`;
    }

    queryParams.push(limit);
    queryString += `
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;

    return pool.query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => null);
  },

  /**
   * Add a property to the database
   * @param {{}} property An object containing all of the property details.
   * @return {Promise<{}>} A promise to the property.
   */
  addProperty : function(property) {
    const queryParams = [ property.owner_id, property.title, property.description, property.thumbnail_photo_url, property.cover_photo_url, property.cost_per_night, property.street, property.city, property.province, property.post_code, property.country, property.parking_spaces, property.number_of_bathrooms, property.number_of_bedrooms ];
    let queryString = `
    INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *;
    `;

    return pool.query(queryString, queryParams)
    .then(res =>  res.rows[0])
    .catch(err => null);
  }
};