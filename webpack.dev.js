const path = require("path");
const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");

module.exports = merge(common, {
  mode: "development",
  devtool: "cheap-module-source-map",
  devServer: {
    host: "127.0.0.1",
    port: 3000,
    hot: true,
    allowedHosts: ["localhost", "127.0.0.1"],
    historyApiFallback: true,
    static: {
      directory: path.resolve(__dirname, "dist")
    },
    client: {
      webSocketURL: "ws://localhost:3000/ws"
    }
  }
});
