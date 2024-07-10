const express = require("express");
const cookieParser = require("cookie-parser");
const mysql = require("mysql2");
const multer = require("multer");
const app = express();

const db = mysql.createConnection({
  host: "localhost",
  user: "wpr",
  password: "fit2023",
  database: "wpr2023",
  port: 3306,
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());
app.set("view engine", "ejs");

const storage = multer.memoryStorage();
const upload = multer({ storage });

const authenticate = (req, res, next) => {
  if (req.cookies && req.cookies.userId) {
    next();
  } else {
    res.status(403).render("denied");
  }
};

app.get("/", (req, res) => {
  const errMessage = "";
  if (req.cookies && req.cookies.userId) {
    res.redirect("/inbox");
  } else {
    res.render("signin", { errMessage });
  }
});

app.get("/signin", (req, res) => {
  const errMessage = "";
  if (req.cookies && req.cookies.userId) {
    res.redirect("/inbox");
  } else {
    res.render("signin", { errMessage });
  }
});

app.post("/signin", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const sql=
    "SELECT id, fullname FROM users WHERE username = ? AND password = ?";
  db.query(sql, [username, password], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error");
    }
    if (result.length > 0) {
      const user = result[0];
      res.cookie("userId", user.id, { httpOnly: true });
      res.cookie("fullName", `${user.fullname}`, { httpOnly: true });

      return res.redirect("/inbox");
    } else {
      const errMessage = "Wrong username or password, please try again";
      return res.render("signin", { errMessage });
    }
  });
});

app.get("/signup", (req, res) => {
  const errMessage = "";
  res.render("signup", { errMessage });
});

app.post("/signup", (req, res) => {
  const { fullname, email, username, password, reEnterPassword } = req.body;

  if (!fullname || !email || !username || !password || !reEnterPassword) {
    const errMessage = "All fields are required.";
    return res.render("signup", { errMessage });
  }

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    const errMessage = "Invalid email.";
    return res.render("signup", { errMessage });
  }

  if (password !== reEnterPassword) {
    const errMessage = "Passwords do not match.";
    return res.render("signup", { errMessage });
  }

  if (password.length < 6) {
    const errMessage = "Password must be at least 6 characters.";
    return res.render("signup", { errMessage });
  }

  const emailSql = "SELECT COUNT(*) AS count FROM users WHERE email = ?";
  db.query(emailSql, [email], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error");
    }

    const countEmail = result[0].count;
    if (countEmail === 0) {
      const insertUserSql = `INSERT INTO users (fullname, email, username, password) VALUES (?, ?, ?, ?)`;

      db.query(
        insertUserSql,
        [fullname, email, username, password],
        (err, result) => {
          if (err) {
            console.log(err);
            return res.status(500).send("Error");
          }
          return res.render("Welcome", { fullname: fullname });
        }
      );
    } else {
      const errMessage = "Email already exists.";
      return res.render("signup", { errMessage });
    }
  });
});

app.get("/compose", authenticate, (req, res) => {
  const getUser = "SELECT id, fullname FROM users WHERE id <> ?";
  db.query(getUser, [req.cookies.userId], (err, users) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error");
    }

    res.render("compose", {
      users,
      fullName: req.cookies.fullName,
      errMessage: req.query.errMessage,
      successMessage: req.query.successMessage,
    });
  });
});

app.post(
  "/compose",
  authenticate,
  upload.single("attachment"),
  (req, res) => {
    const { recipient, subject, body } = req.body;
    const attachment = req.file;

    if (!recipient) {
      const errMessage = "Please select a recipient.";
      res.redirect(`/compose?errorMessage=${encodeURIComponent(errMessage)}`);
      return;
    }

    const saveEmail =
      "INSERT INTO emails (sender_id, receiver_id, subject, body, attachment) VALUES (?, ?, ?, ?, NULL)";
    db.query(
      saveEmail,
      [req.cookies.userId, recipient, subject, body],
      (err, result) => {
        if (err) {
          console.log(err);
          const errMessage = "Error saving email to the database.";
          res.redirect(
            `/compose?errorMessage=${encodeURIComponent(errMessage)}`
          );
          return;
        }

        const emailId = result.insertId;

        if (attachment) {
          const saveAttachment =
            "INSERT INTO attachments (filename, data) VALUES (?, ?)";
          db.query(
            saveAttachment,
            [attachment.originalname, attachment.buffer],
            (err, result) => {
              if (err) {
                console.error(err);
                const errMessage = "Error saving attachment to the database.";
                res.redirect(
                  `/compose?errorMessage=${encodeURIComponent(errMessage)}`
                );
                return;
              }

              const attachmentId = result.insertId;
              const updateEmail =
                "UPDATE emails SET attachment = ? WHERE id = ?";
              db.query(updateEmail, [attachmentId, emailId], (err, result) => {
                if (err) {
                  console.error(err);
                  return;
                }
              });
              const successMessage = "Email sent successfully!";
              res.redirect(
                `/compose?successMessage=${encodeURIComponent(successMessage)}`
              );
            }
          );
        } else {
          const successMessage = "Email sent successfully!";
          res.redirect(
            `/compose?successMessage=${encodeURIComponent(successMessage)}`
          );
        }
      }
    );
  }
);

app.get("/inbox", authenticate, (req, res) => {
  const size = 5;
  const page = parseInt(req.query.page) || 1;
  const startIndex = (page - 1) * size;

  const sql = `
  SELECT emails.id, sender_id, CONCAT_WS(' ', users.fullname) AS senderName,
  subject, body, timestamp
  FROM emails
  LEFT JOIN users ON emails.sender_id = users.id
  WHERE receiver_id = ?
  ORDER BY timestamp DESC
  LIMIT ?, ?;
  `;

  db.query(sql, [req.cookies.userId, startIndex, size], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    const paginatedInbox = result.map((email) => ({
      id: email.id,
      senderName: email.senderName,
      subject: email.subject,
      timeReceived: email.timestamp,
    }));

    res.render("inbox", {
      fullName: req.cookies.fullName,
      inbox: paginatedInbox,
      currentPage: page,
      totalPages: Math.ceil(result.length / size),
    });
  });
});

app.get("/outbox", (req, res) => {
  const size = 5;
  const Page = parseInt(req.query.page) || 1;
  const Index = (Page - 1) * size;

  const sql = `
  SELECT emails.id, receiver_id, CONCAT_WS(' ', users.fullname) AS recipientName,
  subject, body, timestamp
  FROM emails
  LEFT JOIN users ON emails.receiver_id = users.id
  WHERE sender_id = ? AND (delete_by IS NULL OR delete_by <> ?)
  ORDER BY timestamp DESC
  LIMIT ?, ?;
  `;

  db.query(
    sql,
    [req.cookies.userId, req.cookies.userId, Index, size],
    (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send("Internal Server Err");
        return;
      }

      const Outbox = result.map((email) => ({
        id: email.id,
        recipientName: email.recipientName,
        subject: email.subject,
        timeSent: email.timestamp,
      }));

      res.render("outbox", {
        fullName: req.cookies.fullName,
        outbox: Outbox,
        Page: Page,
        totalPages: Math.ceil(req.query.page ? result.length / size : 1),
      });
    }
  );
});

app.get("/download/:attachmentId", (req, res) => {
  const attachmentId = req.params.attachmentId;

  const getAttachmentQuery =
    "SELECT filename, data FROM attachments WHERE id = ?";

  db.query(getAttachmentQuery, [attachmentId], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    if (results.length === 0) {
      res.status(404).send("Not found attachment");
      return;
    }

    const attachment = results[0];
    const fileName = attachment.filename;
    const data = Buffer.from(attachment.data, "base64");

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    res.send(data);
  });
});

app.get("/email/:emailId", authenticate, (req, res) => {
  const emailId = req.params.emailId;

  const emailDetailsQuery =
    "SELECT id, subject, body, attachment FROM emails WHERE id = ?";

  db.query(emailDetailsQuery, [emailId], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    if (results.length === 0) {
      res.status(404).send("Email not found");
      return;
    }

    const email = results[0];

    res.render("email-detail", {
      fullName: req.cookies.fullName,
      email: {
        id: email.id,
        subject: email.subject,
        body: email.body,
        hasAttachment: !!email.attachment,
      },
    });
  });
});

app.get("/signout", (req, res) => {
  Object.keys(req.cookies).forEach((cookie) => {
    res.clearCookie(cookie);
  });

  res.redirect("/signin");
});

app.post("/api/deleteEmails", authenticate, (req, res) => {
  const { emailId, object } = req.body;
  const updateQuery = `UPDATE emails SET delete_by = ? WHERE id IN (?) AND ${object} = ?`;
  db.query(
    updateQuery,
    [req.cookies.userId, emailId, req.cookies.userId],
    (err, result) => {
      if (err) {
        console.error(err);
        res
          .status(500)
          .json({ success: false, error: "Internal Server Error" });
        return;
      }

      res.status(200).json({ success: true });
    }
  );
});

app.listen(8000);
