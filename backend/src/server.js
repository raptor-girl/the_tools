const app = require("./app");

const port = Number(process.env.PORT || 3001);

app.listen(port, () => {
  console.log(`Moodle Tools API escuchando en http://localhost:${port}`);
});
