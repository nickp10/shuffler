const path = require("path");
const webpack = require("webpack");

module.exports = {
    entry: {
        index: path.resolve(__dirname, "./src/index.ts")
    },
    externals: [
        /^[a-z\-0-9]+$/ // Exclude node_modules
    ],
    node: {
        __dirname: false
    },
    target: "node",
    output: {
        filename: "[name].js",
        libraryTarget: "commonjs"
    },
    module: {
        rules: [
            {
                test: /(\.ts)$/,
                use: [{
                    loader: "ts-loader"
                }]
            },
            {
                test: /\.(js)?$/,
                use: [{
                    loader: "babel-loader",
                    options: {
                        cacheDirectory: true,
                        presets: ["@babel/preset-env"]
                    }
                }]
            }
        ]
    },
    resolve: {
        extensions: [".js", ".ts"]
    },
    plugins: [
        new webpack.BannerPlugin({
            banner: "#! /usr/bin/env node",
            raw: true
        })
    ]
};
