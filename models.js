"use strict";

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const authorSchema = mongoose.Schema({
  firstName: 'string',
  lastName: 'string',
  userName: {
    type: 'string',
    unique: true
  }
});

const commentSchema = mongoose.Schema({ content: 'string' });

const blogpostSchema = mongoose.Schema({

  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author' },
  created: {type: Date, default: Date.now},
  comments: [commentSchema]
});/*,
{collection: 'blogs'}*/

// *virtuals* (http://mongoosejs.com/docs/guide.html#virtuals)
// allow us to define properties on our object that manipulate
// properties that are stored in the database. Here we use it
// to generate a human readable string based on the address object
// we're storing in Mongo.
blogpostSchema.virtual("authorName").get(function() {
  return `${this.author.firstName} ${this.author.lastName}`.trim();
});

authorSchema.virtual("authorName2").get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// this is an *instance method* which will be available on all instances
// of the model. This method will be used to return an object that only
// exposes *some* of the fields we want from the underlying data

blogpostSchema.methods.serialize = function() {
  return {
    id: this._id,
    title: this.title,
    content: this.content,
    author: this.authorName,
    created: this.created
    
  };
};

blogpostSchema.methods.serialize2 = function() {
  return {
    id: this._id,
    title: this.title,
    content: this.content,
    author: this.authorName,
    created: this.created,
    comments: this.comments
  };
};

authorSchema.methods.serialize = function() {
  return {
    _id: this._id,
    name: this.authorName2,
    userName: this.userName
  };
};
// middleware function to populate author data before find() call.
blogpostSchema.pre('find', function(next) {
  this.populate('author');
  next();
});

blogpostSchema.pre('findOne', function(next) {
  this.populate('author');
  next();
});

blogpostSchema.pre('findByIdAndUpdate', function(next) {
  this.populate('author');
  next();
});

// note that all instance methods and virtual properties on our
// schema must be defined *before* we make the call to `.model`.
const Author = mongoose.model('Author', authorSchema);
const BlogPosts = mongoose.model('BlogPosts', blogpostSchema);

module.exports = { BlogPosts, Author };
