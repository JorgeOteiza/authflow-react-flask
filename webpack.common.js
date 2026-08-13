const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const Dotenv = require("dotenv-webpack");

module.exports = {
  entry: ["./src/front/js/index.js"],
  output: {
    filename: "assets/[name].[contenthash].js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ["babel-loader"],
      },
      {
        test: /\.(css|scss)$/,
        use: [
          {
            loader: "style-loader", // creates style nodes from JS strings
          },
          {
            loader: "css-loader", // translates CSS into CommonJS
          },
        ],
      }, //css only files
      { test: /\.(png|svg|jpg|gif|jpeg|webp|woff2?|ttf|eot)$/i, type: "asset/resource" },
    ],
  },
  resolve: {
    extensions: ["*", ".js"],
  },
  plugins: [
    new HtmlWebpackPlugin({
      favicon: "auth-lock.svg",
      template: "template.html",
    }),
    new Dotenv({ systemvars: true }),
  ],
};
