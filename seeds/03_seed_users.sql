INSERT INTO users (email, password_hash, name, role)
VALUES
(
 'admin@example.com',
 '$2b$10$uU9MFr1U8Ztsqz8Yg7TxrOK9N7k2KpQyd0p7E2zZHDKJwZpZbXl3y',
 'Admin User',
 'admin'
),
(
 'user@example.com',
 '$2b$10$uU9MFr1U8Ztsqz8Yg7TxrOK9N7k2KpQyd0p7E2zZHDKJwZpZbXl3y',
 'Regular User',
 'user'
)
ON CONFLICT DO NOTHING;
