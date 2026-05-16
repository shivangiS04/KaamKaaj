ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

INSERT INTO profiles (id, name, email, role, manager_id) VALUES
('5a83d68d-1aba-481c-8097-7e54c496df8a', 'Admin User', 'admin@demo.com', 'admin', NULL),
('d6ed3c04-db14-4cd4-8b56-dbb2e07db2d8', 'Manager One', 'manager1@demo.com', 'manager', NULL),
('d3d8e224-9ba1-4bf7-a86a-f4388eee3d01', 'Employee One', 'employee1@demo.com', 'employee', 'd6ed3c04-db14-4cd4-8b56-dbb2e07db2d8');

SELECT * FROM profiles ORDER BY role;
