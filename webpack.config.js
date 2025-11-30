const path = require("path")

module.exports = {
    entry: ["./www/src/app.ts", "./www/src/ui-components/react-root.tsx"],
    output: {
        filename: "app.js",
        path: path.resolve(__dirname, "www/dist"),
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
    },
    devtool: "source-map",
    mode: "development", // Override with --mode flag if needed
}
