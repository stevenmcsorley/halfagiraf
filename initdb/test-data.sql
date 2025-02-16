-- -- =============================================================
-- -- Table: directories
-- -- Purpose: Holds niche-specific settings and configurations.
-- -- =============================================================
-- CREATE TABLE directories (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,              -- e.g., "EV Charging Stations", "Dog Grooming"
--     slug VARCHAR(255) NOT NULL UNIQUE,       -- e.g., "ev-charging", "dog-grooming"
--     seo_meta JSONB,                          -- SEO meta info: title, description, keywords, etc.
--     analytics_id VARCHAR(255),               -- Google Analytics (or other) tracking ID
--     adsense_id VARCHAR(255),                 -- AdSense account ID or similar
--     theme JSONB,                             -- Niche-specific theming/styling configuration
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

-- -- =============================================================
-- -- Table: listings
-- -- Purpose: Stores individual listings for each niche directory.
-- -- =============================================================
-- CREATE TABLE listings (
--     id SERIAL PRIMARY KEY,
--     directory_id INT NOT NULL,               -- Foreign key to directories table
--     name VARCHAR(255) NOT NULL,              -- Listing name (e.g., "bp pulse Charging Station")
--     slug VARCHAR(255) NOT NULL,              -- URL-friendly version of the name

--     -- Niche-specific fields (example based on EV Charging Station CSV data)
--     rating_avg NUMERIC(3,1),                 -- e.g., 4.0 (NULL if not available)
--     rating_count INTEGER,                    -- e.g., 2 (number of reviews)
--     details TEXT,                            -- e.g., "4.0(2) | Sponsored" or "No reviews"
--     place_url TEXT,                          -- URL to a map or location (e.g., Google Maps URL)
--     image_url TEXT,                          -- Main image URL (or "N/A")
--     location VARCHAR(255),                   -- General location info (e.g., "London")
    
--     -- Contact and location details
--     address TEXT,                            -- e.g., "45 St Martin's Ln, London WC2N 4HX"
--     open_status VARCHAR(255),                -- e.g., "Open 24 hours"
--     website VARCHAR(255),                    -- e.g., "chargers.bppulse.com"
--     telephone VARCHAR(50),                   -- e.g., "0800 464 3444" (can also be named "phone")
--     hero_image TEXT,                         -- URL for a featured or hero image
    
--     -- Geolocation data
--     latitude NUMERIC(10,7),                  -- e.g., 51.5105692
--     longitude NUMERIC(10,7),                 -- e.g., -0.1268192

--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
--     CONSTRAINT fk_directory
--         FOREIGN KEY(directory_id) 
--             REFERENCES directories(id)
--             ON DELETE CASCADE
-- );

-- -- =============================================================
-- -- Table: categories
-- -- Purpose: (Optional) Provides categorization for listings within each directory.
-- -- =============================================================
-- CREATE TABLE categories (
--     id SERIAL PRIMARY KEY,
--     directory_id INT NOT NULL,               -- Categories can be niche-specific
--     name VARCHAR(255) NOT NULL,              -- e.g., "Fast Chargers", "Mobile Grooming"
--     slug VARCHAR(255) NOT NULL,              -- URL-friendly version of the category name
--     description TEXT,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
--     CONSTRAINT fk_category_directory
--         FOREIGN KEY(directory_id)
--             REFERENCES directories(id)
--             ON DELETE CASCADE
-- );

-- -- =============================================================
-- -- Table: listing_categories
-- -- Purpose: Join table for many-to-many relationship between listings and categories.
-- -- =============================================================
-- CREATE TABLE listing_categories (
--     listing_id INT NOT NULL,
--     category_id INT NOT NULL,
--     PRIMARY KEY (listing_id, category_id),
--     CONSTRAINT fk_listing
--         FOREIGN KEY(listing_id)
--             REFERENCES listings(id)
--             ON DELETE CASCADE,
--     CONSTRAINT fk_category
--         FOREIGN KEY(category_id)
--             REFERENCES categories(id)
--             ON DELETE CASCADE
-- );

-- -- =============================================================
-- -- Table: reviews
-- -- Purpose: Stores user reviews and ratings for listings.
-- -- =============================================================
-- CREATE TABLE reviews (
--     id SERIAL PRIMARY KEY,
--     listing_id INT NOT NULL,                 -- Reference to a listing
--     reviewer_name VARCHAR(255),              -- Name of the reviewer (optional)
--     rating SMALLINT CHECK (rating >= 1 AND rating <= 5),  -- Rating from 1 to 5
--     review TEXT,                             -- Optional review text
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
--     CONSTRAINT fk_listing_review
--         FOREIGN KEY(listing_id)
--             REFERENCES listings(id)
--             ON DELETE CASCADE
-- );

-- -- =============================================================
-- -- Table: directory_users
-- -- Purpose: (Optional) Manage niche-specific administrators or editors.
-- -- =============================================================
-- CREATE TABLE directory_users (
--     id SERIAL PRIMARY KEY,
--     directory_id INT NOT NULL,               -- Associates the user with a specific directory
--     username VARCHAR(255) NOT NULL,
--     email VARCHAR(255) NOT NULL,
--     password_hash VARCHAR(255) NOT NULL,       -- Store a secure (hashed) password
--     role VARCHAR(50) DEFAULT 'admin',          -- e.g., admin, editor
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
--     CONSTRAINT fk_directory_user
--         FOREIGN KEY(directory_id)
--             REFERENCES directories(id)
--             ON DELETE CASCADE
-- );
-- -- 