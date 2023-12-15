"use client";
import { useState, useEffect, useRef } from "react";
import { useFormik } from "formik";
import Loader from "./components/loader";
import {
    IProductList,
    IGroupedProducts,
} from "./interfaces/productListInterface";
import { serviceType } from "./enum/serviceTypeEnum";
import ErrorValidation from "./components/ErrorValidation";
import Modal from "./components/Modal";

const CryptoJS = require("crypto-js");
const xml2js = require("xml2js");

const Home = () => {
    const [loading, setLoading] = useState(true);
    const [groupedProducts, setGroupedProducts] = useState<IGroupedProducts>(
        {}
    );
    const [products, setProducts] = useState<IProductList[]>([]);
    const [productsList, setProductsList] = useState<IProductList[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<IProductList>();
    const [token, setToken] = useState<string>("");
    const [showForm, setShowForm] = useState(false);
    const [showServiceTypeList, setShowServiceTypeList] = useState(false);
    const [showProductList, setShowProductList] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [authorizationNumber, setAuthorizationNumber] = useState<string>("");
    const [pin, setPin] = useState<string>("");
    const [legend, setLegend] = useState<string>("");
    const phoneNumberRef: any = useRef(null);
    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            valueInput: "",
        },
        validate: (values) => {
            const errors: any = {};
            if (
                !values.valueInput &&
                selectedProduct?.typeReference.includes("a")
            ) {
                errors.phoneNumber = "Requerido";
            }
            if (
                !values.valueInput &&
                selectedProduct?.typeReference.includes("b")
            ) {
                errors.referencia = "Requerido";
            }
            return errors;
        },
        onSubmit: (values, { resetForm }) => {
            if (parseInt(selectedProduct?.typeFront) === 4) {
                verifyReference(values.valueInput);
            } else {
                sendTx(values.valueInput);
            }

            resetForm();
        },
    });

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
                setToken(data.token);
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
                setShowServiceTypeList(true);
                setLoading(false);
            });
    }, []);

    const handleShowProducts = (serviceTypeId: string) => {
        setProductsList(groupedProducts[serviceTypeId]);
        setShowProductList(true);
        setShowServiceTypeList(false);
    };

    const handleSelectedProduct = (product: IProductList) => {
        setSelectedProduct(product);
        setShowForm(true);
        setShowProductList(false);
    };

    const verifyReference = (reference: string) => {
        const dataToSend = {
            idProducto: parseInt(selectedProduct?.idProduct),
            idServicio: parseInt(selectedProduct.idService),
            referencia: reference,
        };
        const key = CryptoJS.enc.Base64.parse(process.env.SECRET_KEY);
        const initializationVector = CryptoJS.enc.Base64.parse(process.env.IV);
        const jsonData = JSON.stringify(dataToSend);
        const encryptedData = CryptoJS.AES.encrypt(jsonData, key, {
            iv: initializationVector,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
        });
        const encryptedPayload = encryptedData.toString();
        let urlEncoded = new URLSearchParams();
        urlEncoded.append("random", "random_string");
        urlEncoded.append("signed", encryptedPayload);

        fetch("/api/verifyReference", {
            method: "POST",
            headers: {
                "X-API-Key": `${process.env.X_API_KEY}`,
                Authorization: `Bearer ${token}`,
            },
            body: urlEncoded,
            redirect: "follow",
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        `Error en la solicitud: ${response.status}`
                    );
                }
                return response.text();
            })
            .then((data) => {
                console.log("Respuesta:", data);

                return sendTx(reference);
            })
            .catch((error) => {
                console.error("Error:", error);
            });
    };

    const sendTx = (value: string) => {
        let property =
            selectedProduct?.typeReference === "b" ||
            selectedProduct?.typeReference === "c"
                ? "referencia"
                : "telefono";

        const dataToSend = {
            idProducto: parseInt(selectedProduct.idProduct),
            idServicio: parseInt(selectedProduct.idService),
            [property]: value,
            montoPago: parseFloat(selectedProduct.price),
        };
        const key = CryptoJS.enc.Base64.parse(process.env.SECRET_KEY);
        const initializationVector = CryptoJS.enc.Base64.parse(process.env.IV);
        const jsonData = JSON.stringify(dataToSend);
        const encryptedData = CryptoJS.AES.encrypt(jsonData, key, {
            iv: initializationVector,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
        });
        const encryptedPayload = encryptedData.toString();
        let urlEncoded = new URLSearchParams();
        urlEncoded.append("random", "random_string");
        urlEncoded.append("signed", encryptedPayload);

        fetch("/api/sendTx", {
            method: "POST",
            headers: {
                "X-API-Key": `${process.env.X_API_KEY}`,
                Authorization: `Bearer ${token}`,
            },
            body: urlEncoded,
            redirect: "follow",
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        `Error en la solicitud: ${response.status}`
                    );
                }
                return response.text();
            })
            .then((data) => {
                xml2js.parseString(
                    data,
                    { explicitArray: false },
                    (error: any, result: any) => {
                        if (error) {
                            console.error(
                                "Error al convertir XML a JSON:",
                                error
                            );
                        } else {
                            if (result !== null) {
                                setModalVisible(true);
                                setAuthorizationNumber(
                                    result.RESPONSE.NUM_AUTORIZACION
                                );
                                setLegend(result.RESPONSE.MENSAJE.TEXTO);
                            }
                        }
                    }
                );
                setTimeout(() => {
                    confirmTx(value);
                }, 62000);
            })
            .catch((error) => {
                console.error("Error:", error);

                setTimeout(() => {
                    confirmTx(value);
                }, 2000);
            });
    };

    const confirmTx = (value: string) => {
        const dataToSend = {
            idProducto: parseInt(selectedProduct.idProduct),
            idServicio: parseInt(selectedProduct.idService),
            referencia: "7226306169",
            montoPago: parseFloat(selectedProduct.price),
        };
        const key = CryptoJS.enc.Base64.parse(process.env.SECRET_KEY);
        const initializationVector = CryptoJS.enc.Base64.parse(process.env.IV);
        const jsonData = JSON.stringify(dataToSend);
        const encryptedData = CryptoJS.AES.encrypt(jsonData, key, {
            iv: initializationVector,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
        });
        const encryptedPayload = encryptedData.toString();
        let urlEncoded = new URLSearchParams();
        urlEncoded.append("random", "random_string");
        urlEncoded.append("signed", encryptedPayload);

        fetch("/api/confirmTx", {
            method: "POST",
            headers: {
                "X-API-Key": `${process.env.X_API_KEY}`,
                Authorization: `Bearer ${token}`,
            },
            body: urlEncoded,
            redirect: "follow",
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        `Error en la solicitud: ${response.status}`
                    );
                }
                return response.text();
            })
            .then((data) => {
                xml2js.parseString(
                    data,
                    { explicitArray: false },
                    (error: any, result: any) => {
                        if (error) {
                            console.error(
                                "Error al convertir XML a JSON:",
                                error
                            );
                        } else {
                            if (result !== null) {
                                setModalVisible(true);
                                setAuthorizationNumber(
                                    result.RESPONSE.NUM_AUTORIZACION
                                );
                                setLegend(result.RESPONSE.MENSAJE.TEXTO);
                            }
                        }
                    }
                );
            })
            .catch((error) => {
                console.error("Error:", error);
            });
    };

    const formatNumberToCurrency = (number: number): string => {
        const formattedNumber = new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(number);

        return formattedNumber;
    };

    console.log("selectedProduct ", selectedProduct);

    const handleCloseModal = () => {
        setModalVisible(false);
        setShowForm(false);
        setShowServiceTypeList(true);
    };

    return (
        <section className="flex h-screen container mx-auto p-16 px-44 h-screen justify-center">
            <div className="w-full">
                {loading ? (
                    <Loader />
                ) : (
                    <>
                        {showServiceTypeList && (
                            <>
                                <h1 className="text-xl font-semibold mb-4">
                                    Pago de servicios
                                </h1>
                                <div className="grid grid-cols-3 gap-4">
                                    {Object.keys(groupedProducts).map(
                                        (service) => (
                                            <div
                                                key={service}
                                                className="hover:bg-gray-200 cursor-pointer w-full p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700"
                                                onClick={() =>
                                                    handleShowProducts(service)
                                                }>
                                                <h2 className="text-ellipsis font-medium">
                                                    {serviceType[service]}
                                                </h2>
                                            </div>
                                        )
                                    )}
                                </div>
                            </>
                        )}

                        {showProductList && productsList.length > 0 && (
                            <>
                                <h1 className="text-xl font-semibold mb-4">
                                    Servicios
                                </h1>
                                <div className="grid grid-cols-3 gap-4">
                                    {productsList.map((product) => (
                                        <div
                                            key={product.idProduct}
                                            className="hover:bg-gray-200 cursor-pointer w-full p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700"
                                            onClick={() =>
                                                handleSelectedProduct(product)
                                            }>
                                            <h2 className="text-ellipsis font-medium">
                                                {product.product}
                                            </h2>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {showForm && (
                            <>
                                <h1 className="text-xl font-semibold mb-4">
                                    Detalle de compra
                                </h1>

                                <p className="font-semibold">
                                    {selectedProduct?.product}
                                </p>

                                <p className="text-xs">
                                    {selectedProduct?.service}
                                </p>

                                <form onSubmit={formik.handleSubmit}>
                                    <div
                                        className="relative my-3"
                                        data-te-input-wrapper-init>
                                        <input
                                            ref={phoneNumberRef}
                                            autoComplete="off"
                                            autoFocus={true}
                                            type="text"
                                            onBlur={formik.handleBlur}
                                            onChange={formik.handleChange}
                                            value={formik.values.valueInput}
                                            id="phoneNumber"
                                            name="valueInput"
                                            className="peer w-full h-full bg-transparent text-blue-gray-700 font-sans font-normal outline outline-0 focus:outline-0 disabled:bg-blue-gray-50 disabled:border-0 transition-all placeholder-shown:border placeholder-shown:border-blue-gray-200 placeholder-shown:border-t-blue-gray-200 border focus:border-2 focus:border-t-transparent text-sm px-3 py-2.5 rounded-[7px] border-blue-gray-200 focus:border-gray-900"
                                            placeholder=" "
                                        />
                                        <label
                                            htmlFor="phoneNumber"
                                            className="flex w-full h-full select-none pointer-events-none absolute left-0 font-normal !overflow-visible truncate peer-placeholder-shown:text-blue-gray-500 leading-tight peer-focus:leading-tight peer-disabled:text-transparent peer-disabled:peer-placeholder-shown:text-blue-gray-500 transition-all -top-1.5 peer-placeholder-shown:text-sm text-[11px] peer-focus:text-[11px] before:content[' '] before:block before:flex-shrink-0 before:w-2.5 before:h-1.5 before:mt-[6.5px] before:mr-1 peer-placeholder-shown:before:border-transparent before:rounded-tl-md before:border-t peer-focus:before:border-t-2 before:border-l peer-focus:before:border-l-2 before:pointer-events-none before:transition-all peer-disabled:before:border-transparent after:content[' '] after:block after:flex-grow after:box-border after:w-2.5 after:h-1.5 after:mt-[6.5px] after:ml-1 peer-placeholder-shown:after:border-transparent after:rounded-tr-md after:border-t peer-focus:after:border-t-2 after:border-r peer-focus:after:border-r-2 after:pointer-events-none after:transition-all peer-disabled:after:border-transparent peer-placeholder-shown:leading-[3.75] text-gray-500 peer-focus:text-gray-900 before:border-blue-gray-200 peer-focus:before:!border-gray-900 after:border-blue-gray-200 peer-focus:after:!border-gray-900">
                                            {selectedProduct?.typeReference ===
                                            "a"
                                                ? "Número de teléfono"
                                                : selectedProduct?.typeReference ===
                                                  "b"
                                                ? "Contrato"
                                                : selectedProduct?.typeReference ===
                                                  "c"
                                                ? "Código de barras"
                                                : "Contrato"}
                                        </label>
                                        <ErrorValidation
                                            message={formik.errors.phoneNumber}
                                            touched={formik.touched.phoneNumber}
                                        />
                                    </div>

                                    <div className="border-t border-gray-200 mt-8">
                                        <p className="mt-2 text-end">TOTAL</p>
                                        <p className="text-end">
                                            {formatNumberToCurrency(
                                                selectedProduct?.price
                                            )}
                                        </p>
                                    </div>

                                    <div className="mt-4 flex justify-end">
                                        <button
                                            type="button"
                                            className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700">
                                            Confirmar
                                        </button>
                                    </div>

                                    <p className="text-xs mt-3">
                                        {selectedProduct?.legend}
                                    </p>
                                </form>
                            </>
                        )}
                    </>
                )}
            </div>
            <Modal
                showModal={modalVisible}
                onClose={handleCloseModal}
                title={legend}>
                <div className="p-4 md:p-5 space-y-4">
                    <h1>Número de autorización</h1>
                    <h1 className="mb-4">{authorizationNumber}</h1>

                    <p className="text-xs font-medium m-0">SERVICIO</p>
                    <p className="m-0">{selectedProduct?.service}</p>
                    <p className="text-xs font-medium m-0">PRODUCTO</p>
                    <p className="m-0">{selectedProduct?.product}</p>
                    <p className="text-xs font-medium m-0">PRECIO</p>
                    <p className="m-0">
                        {formatNumberToCurrency(selectedProduct?.price)}
                    </p>
                </div>
            </Modal>
        </section>
    );
};

export default Home;
