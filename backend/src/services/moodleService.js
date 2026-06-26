const {
  prepareMoodleRows,
  buildIssueRows
} = require("./moodleTransformService");

function buildErrorRows(errors) {
  return buildIssueRows(errors, "error");
}

module.exports = {
  prepareMoodleRows,
  buildErrorRows
};
