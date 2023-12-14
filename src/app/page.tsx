"use client";
import { useState, useEffect } from "react";
import Loader from "./components/loader";

const Home = () => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);

        fetch("/api/authenticate", {
            method: "POST",
            headers: {
                "X-API-Key": `${process.env.X_API_KEY}`,
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        `Error en la solicitud: ${response.status}`
                    );
                }
                return response.json();
            })
            .then((data) => {
                sessionStorage.setItem("authTokenTest", data.token);

                return fetch("/api/getProductsList", {
                    headers: {
                        "X-API-Key": `${process.env.X_API_KEY}`,
                        Authorization: `Bearer ${data.token}`,
                    },
                });
            })
            .then((productsResponse) => {
                if (!productsResponse.ok) {
                    throw new Error(
                        `Error en la solicitud de productos: ${productsResponse.status}`
                    );
                }
                return productsResponse.json();
            })
            .then((productsData) => {
                console.log(productsData);
            })
            .catch((error) => {
                console.error("Error:", error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    return <section className="h-full">{loading ? <Loader /> : null}</section>;
};

export default Home;
