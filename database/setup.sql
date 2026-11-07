-- Run as a MySQL administrator, then set a unique password below.
CREATE DATABASE IF NOT EXISTS workbench CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'workbench'@'localhost' IDENTIFIED BY 'CHANGE_ME';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON workbench.* TO 'workbench'@'localhost';
