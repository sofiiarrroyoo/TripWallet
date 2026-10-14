export type Moneda = {
  codigo: string;
  nombre: string;
};

export type ListaMonedas = {
  monedas: Moneda[];
  // "respaldo": la API de cotizaciones no respondió y se usó la lista ISO 4217 incluida en el proyecto.
  fuente: "api" | "respaldo";
};
