/** @type {import('next').NextConfig} */

const path = require("path");

module.exports = {
    async rewrites() {
        return [
            {
                source: "/api/authenticate",
                destination: `${process.env.SERVER}/service/preprod/authenticate?idDistribuidor=83&codigoDispositivo=GPS83-TPV-99&password=V7p6r2v1W1l4`,
            },
            {
                source: "/api/getProductsList",
                destination: `${process.env.SERVER}/service/preprod/getProductList.do`,
            },
        ];
    },
    env: {
        X_API_KEY: process.env.X_API_KEY,
    },
    reactStrictMode: false,
    sassOptions: {
        includePaths: [path.join(__dirname, "styles")],
    },
};
