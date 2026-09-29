/**
 * Reglas contra inyección SQL (OWASP A03). Todo SQL pasa por el query builder
 * de Drizzle o por la etiqueta `sql`, que envía cada `${valor}` como parámetro.
 * Se prohíben las vías que meten texto en el SQL sin parametrizar.
 */
export const sqlInjectionRules = {
  "no-restricted-syntax": [
    "error",
    {
      selector: "CallExpression[callee.object.name='sql'][callee.property.name='raw']",
      message:
        "sql.raw() inserta texto sin parametrizar. Usa la etiqueta sql`...${valor}` o el query builder.",
    },
    {
      selector: "CallExpression[callee.property.name='unsafe']",
      message: "unsafe() ejecuta SQL sin parametrizar. Usa la etiqueta sql`...` de Drizzle.",
    },
    {
      selector:
        "CallExpression[callee.property.name=/^(execute|query)$/] > :matches(Literal, TemplateLiteral, BinaryExpression)",
      message:
        "SQL como string o concatenación. Usa la etiqueta sql`...${valor}` para que los valores viajen como parámetros.",
    },
  ],
};
