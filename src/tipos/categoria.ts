export type Categoria = {
  id: string;
  nombre: string;
  // Las que vienen con la app (visibles para todos), a diferencia de las que crea cada usuario.
  esPorDefecto: boolean;
};
