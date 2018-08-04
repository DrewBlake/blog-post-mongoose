"use strict";

const express = require("express");
const mongoose = require("mongoose");

// Mongoose internally uses a promise-like object,
// but its better to make Mongoose use built in es6 promises
mongoose.Promise = global.Promise;

// config.js is where we control constants for entire
// app like PORT and DATABASE_URL
const { PORT, DATABASE_URL } = require("./config");
const { BlogPosts, Author } = require("./models");

const app = express();
app.use(express.json());

app.get("/authors", (req, res) => {
  Author.find()
    .then(author => {
      res.json({
        author: author.map(author => author.serialize())
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    });
});

app.post("/authors", (req, res) => {
  const requiredFields = ["firstName", "lastName", "userName"];
  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  }
  Author.findOne({userName: req.body.userName}).then(author => {
    if(author) {
      const message = 'User name already taken, choose another user name';
      console.error(message);
      return res.status(400).send(message);
    }
    else {
       Author.create({
       firstName: req.body.firstName,
       lastName: req.body.lastName,
       userName: req.body.userName
      }).then(author => res.status(201).json(author.serialize()))
        .catch(err => {
          console.error(err);
          res.status(500).json({ message: "Internal server error" });
        });
    }
  }).catch(err => {
    console.error(err);
    res.status(500).json({ message: "Internal server error"});
  });
});

// DELETE author and BlogPosts of that author
app.delete("/authors/:id", (req, res) => {
  BlogPosts.remove({author: req.params.id})
  .then(() => {
    Author.findByIdAndRemove(req.params.id)
    .then(() => {
      res.status(204).json({message: "delete successful"});
    });
  })
  .catch(err => {
    res.status(500).json({ error: "Internal server error" });
  });
});

app.put("/authors/:id", (req, res) => {
  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    res.status(400).json({
      error: `Request path id ${req.params.id} and request body id ${req.body.id} values must match`
    });
  }

  const updated = {};
  const updateableFields = ['firstName', 'lastName', 'userName'];
  updateableFields.forEach(field => {
    if (field in req.body) {
      updated[field] = req.body[field];
    }
  });

  Author
    .findOne({ userName: updated.userName || '', _id: { $ne: req.params.id } })
    .then(author => {
      if(author) {
        const message = `Username already taken`;
        console.error(message);
        return res.status(400).send(message);
      }
      else {
        Author
          .findByIdAndUpdate(req.params.id, { $set: updated }, { new: true })
          .then(updatedAuthor => {
            res.status(200).json({
              id: updatedAuthor.id,
              name: `${updatedAuthor.firstName} ${updatedAuthor.lastName}`,
              userName: updatedAuthor.userName
            });
          })
          .catch(err => res.status(500).json({ message: err }));
      }
    });
});

// GET requests to BlogPosts
app.get("/posts", (req, res) => {
  BlogPosts.find()
    .then(blog => {
      res.json(
        {blog: blog.map(blog => blog.serialize())}
        /*blog.map(blog => {
          return {
            id: blog._id,
            author: blog.authorName,
            content: blog.content,
            title: blog.title
          };
        }
      )*/);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    });
});

// can also request by ID
app.get("/posts/:id", (req, res) => {
  BlogPosts
    .findById(req.params.id)
    .then(blog => res.json(blog.serialize2()))
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    });
});

app.post("/posts", (req, res) => {
  const requiredFields = ["title", "content", "author_id"];
  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  };
  Author.findById(req.body.author_id).then(author => {

    if (author) {
      BlogPosts.create({
        title: req.body.title,
        content: req.body.content,
        author: req.body.author_id,
        created: req.body.created
      })
        .then(blog => res.status(201).json(/*blog.serialize2()*/
        {
          id: blog.id,
          author: `${author.firstName} ${author.lastName}`,
          content: blog.content,
          title: blog.title,
          comments: blog.comments
        }))
        .catch(err => {
          console.error(err);
          res.status(500).json({ message: "Internal server error111" });
          res.status(500).json({ message: "Internal server error" });
        });
      } else {
        const message = "author does not exist, please choose existing author id";
        console.error(message);
        return res.status(400).send(message);
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: "Internal server error222" });
    });
});


app.put("/posts/:id", (req, res) => {
  // ensure that the id in the request path and the one in request body match
  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    const message =
      `Request path id (${req.params.id}) and request body id ` +
      `(${req.body.id}) must match`;
    console.error(message);
    return res.status(400).json({ message: message });
  }

  // we only support a subset of fields being updateable.
  // if the user sent over any of the updatableFields, we udpate those values
  // in document
  const toUpdate = {};
  const updateableFields = ["title", "content"];

  updateableFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });

  BlogPosts
    // all key/value pairs in toUpdate will be updated -- that's what `$set` does
    .findByIdAndUpdate(req.params.id, { $set: toUpdate })
    .then(blog => res.status(200).json({
      id: blog.id,
      title: blog.title,
      content: blog.content,
      author: blog.authorName,
      created: blog.created
    }))
    .catch(err => res.status(500).json({ message: "Internal server error" }));
});

app.delete("/posts/:id", (req, res) => {
  BlogPosts.findByIdAndRemove(req.params.id)
    .then(blog => res.status(204).end())
    .catch(err => res.status(500).json({ message: "Internal server error" }));
});

// catch-all endpoint if client makes request to non-existent endpoint
app.use("*", function(req, res) {
  res.status(404).json({ message: "Not Found" });
});


// closeServer needs access to a server object, but that only
// gets created when `runServer` runs, so we declare `server` here
// and then assign a value to it in run
let server;

// this function connects to our database, then starts the server
function runServer(databaseUrl, port = PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(
      databaseUrl,
      err => {
        if (err) {
          return reject(err);
        }
        server = app
          .listen(port, () => {
            console.log(`Your app is listening on port ${port}`);
            resolve();
          })
          .on("error", err => {
            mongoose.disconnect();
            reject(err);
          });
      }
    );
  });
}

// this function closes the server, and returns a promise. we'll
// use it in our integration tests later.
function closeServer() {
  return mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.log("Closing server");
      server.close(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

// if server.js is called directly (aka, with `node server.js`), this block
// runs. but we also export the runServer command so other code (for instance, test code) can start the server as needed.
if (require.main === module) {
  runServer(DATABASE_URL).catch(err => console.error(err));
}

module.exports = { app, runServer, closeServer };
