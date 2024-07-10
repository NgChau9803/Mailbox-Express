const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "wpr",
  password: "fit2023",
  database: "wpr2023",
  port: 3306,
});

const User = `
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(225) UNIQUE NOT NULL,
        fullname varchar(225) NOT NULL,
        username VARCHAR(225) UNIQUE NOT NULL,
        password VARCHAR(225) NOT NULL
    );
`;

const Attachments = `
    CREATE TABLE IF NOT EXISTS attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename varchar(255) NULL,
        data longblob NULL
    );
`;


const Emails = `
    CREATE TABLE IF NOT EXISTS emails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT,
        receiver_id INT,
        subject varchar(255) NOT NULL,
        body TEXT NOT NULL,
        attachment INT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        delete_by INT NULL,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (receiver_id) REFERENCES users(id)
    );
`;

const alterEmails = `
    ALTER TABLE emails
    ADD CONSTRAINT fk_email_id FOREIGN KEY (attachment) REFERENCES attachments(id);
`;

const insertUser = `
    INSERT INTO users (email, fullname, username, password) VALUES
        ('ngocchau0405@gmail.com', 'vi nguyen ngoc chau', 'ngocchau', '0354387203'),
        ('anhvan123@gmail.com', 'tran van anh', 'anhvan', 'passwordlagi'),
        ('ducdeptrai2003@gmail.com', 'tran minh duc', 'minhduc', 'deptraiso1thegioi');
`;

const insertEmails = `
    INSERT INTO emails (sender_id, receiver_id, subject, body, attachment) VALUES
    (1, 2, 'Mathematic Problem', 'abcdefgh', NULL),
    (2, 1, 'Physics Problem', 'ijklmnopqrstuvwxyzafafakhfaf', NULL),
    (3, 1, 'Chemistry Problem', 'ABCDEFGHIJKLMNOPQRSTUVWXYAKHFAKJFA', NULL),
    (1, 3, 'Biology Problem', 'abcdEFGHijkLmnoPQRS', NULL),
    (3, 2, 'History Problem', 'ABCDefghiJKlmnOpqrsT', NULL),
    (2, 3, 'Geography Problem', 'ABCDefghIjklMNOpqrStu', NULL),
    (1, 2, 'English Problem', 'ABCDefgHiJklMNoPqrStuV', NULL),
    (3, 1, 'Art History Problem', 'ABCDefghiJklMNOPqrStuvwXyz', NULL);
`;

db.query(User, (err) => {
    if (err) throw err;
    console.log("Create Users")

    db.query(insertUser, (err) => {
        if (err) throw err;
        console.log("Insert Users sample")
    });
});

db.query(Emails, (err) => {
    if (err) throw err;
    console.log("Create Emails");
    db.query(insertEmails, (err) => {
        if (err) throw err;
        console.log('Insert emails sample')

        db.end();
    });
});

db.query(Attachments, (err) => {
    if (err) throw err;
    console.log("Create attachments")
});

db.query(alterEmails, (err) => {
    if (err) throw err;
    console.log("Add a foreign key constraint");
});