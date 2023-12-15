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
            {
                source: "/api/verifyReference",
                destination: `${process.env.SERVER}/service/preprod/verifyReference.do`,
            },
            {
                source: "/api/sendTx",
                destination: `${process.env.SERVER}/service/preprod/sendTx.do`,
            },
            {
                source: "/api/confirmTx",
                destination: `${process.env.SERVER}/service/preprod/confirmTx.do`,
            },
        ];
    },
    env: {
        X_API_KEY: process.env.X_API_KEY,
        SECRET_KEY: process.env.SECRET_KEY,
        IV: process.env.IV,
    },
    reactStrictMode: false,
    sassOptions: {
        includePaths: [path.join(__dirname, "styles")],
    },
};
