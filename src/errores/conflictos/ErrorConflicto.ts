import { ErrorApp } from "../ErrorApp";

// Clase intermedia: el pedido es válido pero choca con el estado actual. Todos se traducen igual (409).
export abstract class ErrorConflicto extends ErrorApp {}
