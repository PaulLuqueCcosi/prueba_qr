# Preguntas del MVP

Preguntas que hay que responder antes de escribir código. Solo cubren lo esencial para que la solución funcione; lo demás (JWT, frontend, despliegue, rendimiento) queda para después.

Cómo responder: marca una opción o escribe tu propia respuesta en **Respuesta**. Si no tienes preferencia, escribe "propuesta".

---

## Q1 — ¿Rotación o QR?
El enunciado dice en la arquitectura que Go "realizará la **rotación** de la matriz", pero en la funcionalidad pide la **factorización QR**.

- [x] A. Solo QR (propuesta)
- [ ] B. Solo rotación
- [ ] C. QR en el núcleo y rotación como endpoint extra

**Respuesta:**: en la funcionalidad requerida dice "Una API en Go que reciba como entrada un array de arrays de números que represente una matriz rectangular y devuelva la factorización QR de dicha matriz." y en una forma de obterner qr es rotanto, se interpreta que a eso se refiere la rotacion , tambien que en el listado de funcaoines no hay rotaciones.

---

## Q2 — ¿Quién llama a quién?
El enunciado dice que Go envía los datos a Node, pero no dice quién responde al cliente.

- [x] A. El cliente llama a Go; Go llama a Node y devuelve al cliente Q, R y estadísticas juntos (propuesta)
- [ ] B. El cliente llama a Go (recibe Q y R) y luego llama a Node por separado para las estadísticas

**Respuesta:** no es tan relvante para la demo porque ambas mas adelante estaran con seguridad con jwt entonces por ahora solo el cliente llamara a Go y go llmara a node el cliente puede llamra a cada api individualmente, peroahroa haremos que funcione. 

---

## Q3 — ¿Qué recibe Node?
- [ ] A. Solo Q y R (propuesta)
- [x] B. Q, R y la matriz original

**Respuesta:** recibe las 3, q, r, origianl, sobre esas 3 hace la estaditica.

---

## Q4 — ¿Cómo se calculan las estadísticas?
Máximo, mínimo, promedio y suma total.

- [x] A. Sobre todos los valores de Q y R juntos; el diagonal se evalúa por matriz (propuesta)
- [ ] B. Por separado para Q y para R

**Respuesta:** en la propuesta dice "El valor máximo encontrado en las matrices." s deicr entre las matrices, es decir entre las 3.

---

## Q5 — ¿Cuándo una matriz es diagonal?
Los cálculos con decimales casi nunca dan ceros exactos. Y R suele ser rectangular cuando la entrada no es cuadrada.

- [x] A. Diagonal si todo lo que está fuera de la diagonal principal es ≈ 0, con tolerancia 1e-9, también en matrices rectangulares (propuesta)
- [ ] B. Igual, pero solo para matrices cuadradas (las rectangulares nunca son diagonales)
- [ ] C. Comparación exacta con 0

**Respuesta:** es importatne tener una tolerancia clara o poder documentarla

---

## Q6 — ¿Cómo se calcula la QR?
- [x] A. Librería Gonum (propuesta): menos código y probado
- [ ] B. Implementación propia (Householder): más para explicar en la entrevista, más riesgo

Además, si la matriz no es cuadrada:
- [x] Q completa (m×m) y R (m×n)
- [ ] Q reducida (m×n) y R (n×n)

**Respuesta:**

---

## Q7 — Validación mínima de entrada
Casos que se rechazan con `422` y un mensaje claro:
- Matriz vacía
- Filas de distinto largo (no rectangular)
- Valores que no son números
- JSON mal formado (`400`)

¿Falta algún caso o hay alguno que no quieras?

**Respuesta:**: estan bien las validaciones.

---

## Fuera del MVP (para después de la Fase 1)
JWT, frontend, despliegue en la nube, tamaño máximo de matrices, entregables y casos borde de las pruebas.
