const { AuthenticationError } = require('apollo-server-express');
const { User, Book } = require('../models');
const { signToken } = require('../utils/auth');

const resolvers = {
    Query: {
      users: async () => {
        return User.find().populate('savedBooks');
      },
      user: async (parent, { username }) => {
        return User.findOne({ username }).populate('savedBooks');
      },
      books: async (parent, { username }) => {
        const params = username ? { username } : {};
        return Book.find(params).sort({ createdAt: -1 });
      },
      book: async (parent, { _id }) => {
        return Book.findOne({ _id: _id });
      },
      me: async (parent, args, context) => {
        if (context.user) {
          return User.findOne({ _id: context.user._id }).populate('savedBooks');
        }
        throw new AuthenticationError('You need to be logged in!');
      },
    },
    Mutation: {
        addUser: async (parent, { username, email, password }) => {
          const user = await User.create({ username, email, password });
          const token = signToken(user);
          return { token, user };
        },
        login: async (parent, { email, password }) => {
          const user = await User.findOne({ email });
    
          if (!user) {
            throw new AuthenticationError('No user found with this email address');
          }
    
          const correctPw = await user.isCorrectPassword(password);
    
          if (!correctPw) {
            throw new AuthenticationError('Incorrect credentials');
          }
    
          const token = signToken(user);
    
          return { token, user };
        },
        addBook: async (parent, { authors, description, bookId, image, link, title }, context) => {
          if (context.user) {
            const book = await Book.create({
                authors, description, bookId, image, link, title
            });
    
            await User.findOneAndUpdate(
              { _id: context.user._id },
              { $addToSet: { savedBooks: book._id } }
            );
    
            return book;
          }
          throw new AuthenticationError('You need to be logged in!');
        },
        removeBook: async (parent, { _id }, context) => {
          if (context.user) {
            const book = await Book.findOneAndDelete({
              _id: _id,
            });
    
            await User.findOneAndUpdate(
              { _id: context.user._id },
              { $pull: { savedBooks: book._id } }
            );
    
            return book;
          }
          throw new AuthenticationError('You need to be logged in!');
        },
      },
    };
    
    module.exports = resolvers;