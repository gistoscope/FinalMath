module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Require a commit type
    "type-empty": [2, "never"],

    // Require a commit scope
    "scope-empty": [2, "never"],
  },
};
