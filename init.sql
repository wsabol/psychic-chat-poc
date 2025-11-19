CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50),
    content TEXT,
    user_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_personal_info (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    birth_country VARCHAR(100),
    birth_province VARCHAR(100),
    birth_city VARCHAR(100),
    birth_date DATE,
    birth_time TIME,
    birth_timezone VARCHAR(100),
    sex VARCHAR(50),
    address_preference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_astrology (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    zodiac_sign VARCHAR(50),
    astrology_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

