"use client";
import { useState, useEffect } from "react";
import Loader from "./components/loader";
import {
    IProductList,
    IGroupedProducts,
} from "./interfaces/productListInterface";
import { serviceType } from "./enum/serviceTypeEnum";

const Home = () => {
    const [loading, setLoading] = useState(true);
    const [groupedProducts, setGroupedProducts] = useState<IGroupedProducts>(
        {}
    );
    const [products, setProducts] = useState<IProductList[]>([]);
    const [productsList, setProductsList] = useState<IProductList[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<IProductList>();

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
                return productsResponse.text();
            })
            .then((xmlData) => {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlData, "text/xml");
                const productNodes =
                    xmlDoc.getElementsByTagName("PRODUCTOS")[0].children;

                const productsArray = Array.from(productNodes).map(
                    (productNode) => {
                        const idProduct =
                            productNode.getAttribute("idProducto");
                        const service = productNode.getAttribute("servicio");
                        const product = productNode.getAttribute("producto");
                        const idService =
                            productNode.getAttribute("idServicio");
                        const price = productNode.getAttribute("precio");
                        const idTypeService =
                            productNode.getAttribute("idCatTipoServicio");
                        const typeReference =
                            productNode.getAttribute("tipoReferencia");
                        const typeFront = productNode.getAttribute("tipoFront");
                        const legend =
                            productNode.getElementsByTagName("legend")[0]
                                ?.textContent;

                        return {
                            idProduct,
                            service,
                            product,
                            idService,
                            price,
                            idTypeService,
                            typeReference,
                            typeFront,
                            legend,
                        };
                    }
                );

                const groupedProducts = productsArray.reduce((acc, product) => {
                    const { idTypeService } = product;

                    if (!acc[idTypeService]) {
                        acc[idTypeService] = [];
                    }

                    acc[idTypeService].push(product);

                    return acc;
                }, {});

                setGroupedProducts(groupedProducts);
                setProducts(productsArray);
            })
            .catch((error) => {
                console.error("Error:", error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const handleShowProducts = (serviceTypeId: string) => {
        setProductsList(groupedProducts[serviceTypeId]);
    };

    const handleSelectedProduct = (product: IProductList) => {
        setSelectedProduct(product);
    };

    console.log("selectedProduct ", selectedProduct);

    return (
        <section className="flex h-screen container mx-auto p-16 px-44 h-screen justify-center">
            {loading ? (
                <Loader />
            ) : (
                <div className="w-full">
                    {/* {Object.keys(groupedProducts).map((service) => (
                        <div key={service}>
                            <h2>{service}</h2>
                            <ul>
                                {groupedProducts[service].map((product) => (
                                    <li key={product.idProduct}>
                                        {product.product}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))} */}

                    {/* {Object.keys(groupedProducts).map((service) => (
                        <div
                            key={service}
                            className="cursor-pointer mb-4 max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700"
                            onClick={() => handleShowProducts(service)}>
                            <h2 className="text-ellipsis font-medium">
                                {serviceType[service]}
                            </h2>
                        </div>
                    ))} */}

                    {productsList.length > 0 ? (
                        <div className="grid grid-cols-3 gap-4">
                            {productsList.map((product) => (
                                <div
                                    key={product.idProduct}
                                    className="cursor-pointer w-full p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700"
                                    onClick={() =>
                                        handleSelectedProduct(product)
                                    }>
                                    <h2 className="text-ellipsis font-medium">
                                        {product.product}
                                    </h2>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-4">
                            {Object.keys(groupedProducts).map((service) => (
                                <div
                                    key={service}
                                    className="cursor-pointer w-full p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700"
                                    onClick={() => handleShowProducts(service)}>
                                    <h2 className="text-ellipsis font-medium">
                                        {serviceType[service]}
                                    </h2>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export default Home;
