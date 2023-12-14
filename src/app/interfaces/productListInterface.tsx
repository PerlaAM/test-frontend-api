export interface IProductList {
    idProduct: string;
    service: string;
    product: string;
    idService: string;
    price: string;
    idTypeService: string;
    typeReference: string;
    typeFront: string;
    legend: string;
}

interface IGroupedProducts {
    [key: string]: IProductList[]; // La clave es el valor único del campo "service"
}
