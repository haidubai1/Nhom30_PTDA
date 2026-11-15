const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const model = (name, fields) => sequelize.define(name, fields, { timestamps: false, freezeTableName: true, tableName: name });
const id = { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true };

const User = model('users', {
  id,
  email: { type: DataTypes.STRING(254), allowNull: false },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  display_name: { type: DataTypes.STRING(120), allowNull: false },
  role: { type: DataTypes.ENUM('manager', 'editor'), allowNull: false },
  status: { type: DataTypes.ENUM('active', 'locked'), allowNull: false, defaultValue: 'active' },
  auth_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
  last_login_at: DataTypes.DATE,
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE
});

const RolePermission = model('role_permissions', {
  role: { type: DataTypes.ENUM('manager', 'editor'), primaryKey: true },
  permission: { type: DataTypes.STRING(20), primaryKey: true }
});

const Category = model('categories', {
  id,
  name: { type: DataTypes.STRING(80), allowNull: false },
  slug: { type: DataTypes.STRING(100), allowNull: false },
  created_at: DataTypes.DATE
});

const Article = model('articles', {
  id,
  category_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  author_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  summary: { type: DataTypes.STRING(500), allowNull: false },
  content: { type: DataTypes.TEXT('medium'), allowNull: false },
  status: { type: DataTypes.ENUM('draft', 'pending', 'rejected', 'approved', 'scheduled', 'published'), allowNull: false, defaultValue: 'draft' },
  reject_reason: DataTypes.STRING(500),
  reviewed_by: DataTypes.BIGINT.UNSIGNED,
  reviewed_at: DataTypes.DATE,
  publish_at: DataTypes.DATE,
  published_at: DataTypes.DATE,
  views: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  created_at: DataTypes.DATE,
  updated_at: DataTypes.DATE
});

const Comment = model('comments', {
  id,
  article_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  author_name: { type: DataTypes.STRING(80), allowNull: false },
  content: { type: DataTypes.STRING(1000), allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'approved'), allowNull: false, defaultValue: 'pending' },
  created_at: DataTypes.DATE
});

const ArticleDailyView = model('article_daily_views', {
  article_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true },
  day: { type: DataTypes.DATEONLY, primaryKey: true },
  views: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }
});

Category.hasMany(Article, { foreignKey: 'category_id', as: 'articles' });
Article.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
User.hasMany(Article, { foreignKey: 'author_id', as: 'articles' });
Article.belongsTo(User, { foreignKey: 'author_id', as: 'author' });
Article.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });
Article.hasMany(Comment, { foreignKey: 'article_id', as: 'comments' });
Comment.belongsTo(Article, { foreignKey: 'article_id', as: 'article' });
Article.hasMany(ArticleDailyView, { foreignKey: 'article_id', as: 'dailyViews' });

module.exports = { sequelize, User, RolePermission, Category, Article, Comment, ArticleDailyView };
